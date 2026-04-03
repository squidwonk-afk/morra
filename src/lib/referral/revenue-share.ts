import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { cutoffIsoForMaturedAccruals, REFERRAL_EARNINGS_HOLD_MS } from "@/lib/referral/earnings-hold";
import { logMorraError } from "@/lib/logging";
import {
  referralTierFromCount,
  TIER_PERCENT_BPS,
} from "@/lib/referral/tiers";
import { runProcessReferralEarningWithSync } from "@/lib/referral/stripe-earnings-rpc";
import { countActiveValidatedReferrals } from "@/lib/referral/referral-counts";

export { referralTierFromCount, TIER_PERCENT_BPS } from "@/lib/referral/tiers";
export { REFERRAL_EARNINGS_HOLD_MS, eligibleReleaseIsoFromCreatedAt, cutoffIsoForMaturedAccruals } from "@/lib/referral/earnings-hold";
export { countActiveValidatedReferrals } from "@/lib/referral/referral-counts";

type DueAccrual = { id: string; referrer_id: string; amount_cents: number };

/**
 * When a referred user pays a subscription invoice, accrue revenue share to referrer’s pending balance.
 * Commission stays pending until {@link REFERRAL_EARNINGS_HOLD_MS} after row `created_at`.
 */
export async function accrueReferralRevenueFromSubscriptionInvoice(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice,
  payerUserId: string
): Promise<void> {
  const invoiceId = invoice.id;
  if (!invoiceId) return;

  const amountPaid = invoice.amount_paid;
  if (amountPaid == null || amountPaid <= 0) return;

  const { data: payer, error: pErr } = await supabase
    .from("profiles")
    .select("referred_by")
    .eq("id", payerUserId)
    .single();
  if (pErr || !payer?.referred_by) return;

  const referrerId = String(payer.referred_by ?? "").trim();
  if (!referrerId || referrerId === payerUserId) return;

  const { data: refProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", referrerId)
    .maybeSingle();
  if (!refProfile?.id) return;

  const { data: ref, error: rErr } = await supabase
    .from("referrals")
    .select("id, validated, ip_suspected, status")
    .eq("referrer_id", referrerId)
    .eq("referred_user_id", payerUserId)
    .maybeSingle();
  if (rErr || !ref || ref.status !== "active" || !ref.validated || ref.ip_suspected) return;

  const { data: referrer, error: uErr } = await supabase
    .from("profiles")
    .select("flagged")
    .eq("id", referrerId)
    .single();
  if (uErr || !referrer || referrer.flagged) return;

  const activeCount = await countActiveValidatedReferrals(supabase, referrerId);
  const tier = referralTierFromCount(activeCount);
  const bps = TIER_PERCENT_BPS[tier];
  const commissionCents = Math.floor((amountPaid * bps) / 10_000);
  if (commissionCents <= 0) return;

  const availableAtMirror = new Date(Date.now() + REFERRAL_EARNINGS_HOLD_MS).toISOString();
  const { data: inserted, error: insErr } = await supabase
    .from("referral_revenue_accruals")
    .insert({
      referrer_id: referrerId,
      referred_user_id: payerUserId,
      stripe_invoice_id: invoiceId,
      amount_cents: commissionCents,
      tier,
      percent_bps: bps,
      available_at: availableAtMirror,
    })
    .select("id")
    .maybeSingle();

  if (insErr) {
    if (insErr.code === "23505" || insErr.message?.includes("duplicate")) {
      return;
    }
    throw new Error(insErr.message);
  }
  const accrualId = inserted?.id as string | undefined;
  if (!accrualId) return;

  const { data: u2 } = await supabase
    .from("profiles")
    .select("earnings_pending_cents")
    .eq("id", referrerId)
    .single();
  if (!u2) {
    await supabase.from("referral_revenue_accruals").delete().eq("id", accrualId);
    return;
  }

  let pendingPrev = u2.earnings_pending_cents as number;
  let pendingUpdated = false;
  for (let i = 0; i < 5; i++) {
    const nextPend = pendingPrev + commissionCents;
    const { data: up } = await supabase
      .from("profiles")
      .update({
        earnings_pending_cents: nextPend,
      })
      .eq("id", referrerId)
      .eq("earnings_pending_cents", pendingPrev)
      .select("earnings_pending_cents")
      .maybeSingle();
    if (up) {
      pendingUpdated = true;
      break;
    }
    const { data: u3 } = await supabase
      .from("profiles")
      .select("earnings_pending_cents")
      .eq("id", referrerId)
      .single();
    if (!u3) break;
    pendingPrev = u3.earnings_pending_cents as number;
  }
  if (!pendingUpdated) {
    await supabase.from("referral_revenue_accruals").delete().eq("id", accrualId);
    logMorraError("stripe_webhook", "referral_pending_balance_update_failed", {
      referrerIdSuffix: referrerId.slice(-8),
      commissionCents,
    });
  } else {
    const grossUsd = amountPaid / 100;
    await runProcessReferralEarningWithSync(supabase, {
      referrerId,
      referredUserId: payerUserId,
      grossAmountUsd: grossUsd,
      idempotencyKey: `stripe_invoice:${invoiceId}`,
      source: "subscription_invoice",
    });
  }
}

const RELEASE_BALANCE_RETRIES = 8;

async function fetchDueAccruals(
  supabase: SupabaseClient,
  referrerIdFilter?: string
): Promise<DueAccrual[]> {
  const cutoffIso = cutoffIsoForMaturedAccruals();
  let q = supabase
    .from("referral_revenue_accruals")
    .select("id, referrer_id, amount_cents")
    .is("released_at", null)
    .lte("created_at", cutoffIso);
  if (referrerIdFilter) {
    q = q.eq("referrer_id", referrerIdFilter);
  }
  const { data: due, error } = await q;
  if (error || !due?.length) return [];
  return due as DueAccrual[];
}

async function releaseDueAccruals(supabase: SupabaseClient, due: DueAccrual[]): Promise<number> {
  const now = new Date().toISOString();
  let released = 0;

  for (const row of due) {
    const id = row.id as string;
    const referrerId = row.referrer_id as string;
    const amt = row.amount_cents as number;

    const { data: claimed, error: claimErr } = await supabase
      .from("referral_revenue_accruals")
      .update({ released_at: now })
      .eq("id", id)
      .is("released_at", null)
      .select("id")
      .maybeSingle();

    if (claimErr || !claimed) {
      continue;
    }

    let moved = false;
    for (let attempt = 0; attempt < RELEASE_BALANCE_RETRIES; attempt++) {
      const { data: u } = await supabase
        .from("profiles")
        .select("earnings_pending_cents, earnings_available_cents")
        .eq("id", referrerId)
        .single();
      if (!u) {
        await supabase
          .from("referral_revenue_accruals")
          .update({ released_at: null })
          .eq("id", id);
        logMorraError("cron", "referral_release_user_missing", {
          referrerIdSuffix: referrerId.slice(-8),
          accrualIdSuffix: id.slice(-8),
        });
        break;
      }

      const pending = u.earnings_pending_cents as number;
      const avail = u.earnings_available_cents as number;
      if (pending < amt) {
        logMorraError("cron", "referral_release_pending_mismatch", {
          referrerIdSuffix: referrerId.slice(-8),
          pending,
          amountCents: amt,
        });
        await supabase
          .from("referral_revenue_accruals")
          .update({ released_at: null })
          .eq("id", id);
        break;
      }

      const nextPending = pending - amt;
      const nextAvail = avail + amt;

      const { data: locked } = await supabase
        .from("profiles")
        .update({
          earnings_pending_cents: nextPending,
          earnings_available_cents: nextAvail,
        })
        .eq("id", referrerId)
        .eq("earnings_pending_cents", pending)
        .eq("earnings_available_cents", avail)
        .select("id")
        .maybeSingle();

      if (locked) {
        moved = true;
        released += 1;
        break;
      }
    }

    if (!moved) {
      const { data: still } = await supabase
        .from("referral_revenue_accruals")
        .select("released_at")
        .eq("id", id)
        .maybeSingle();
      if (still?.released_at) {
        await supabase
          .from("referral_revenue_accruals")
          .update({ released_at: null })
          .eq("id", id);
        logMorraError("cron", "referral_release_balance_lock_failed", {
          referrerIdSuffix: referrerId.slice(-8),
          accrualIdSuffix: id.slice(-8),
        });
      }
    }
  }

  return released;
}

/** @returns Number of accrual rows released (global cron). */
export async function releaseMaturedReferralAccruals(supabase: SupabaseClient): Promise<number> {
  const due = await fetchDueAccruals(supabase);
  return releaseDueAccruals(supabase, due);
}

/**
 * Release matured accruals for one referrer (dashboard / me / payout).
 * Idempotent per accrual row via released_at claim. Maturity = created_at + hold.
 */
export async function releaseMaturedReferralAccrualsForReferrer(
  supabase: SupabaseClient,
  referrerId: string
): Promise<number> {
  const due = await fetchDueAccruals(supabase, referrerId);
  return releaseDueAccruals(supabase, due);
}
