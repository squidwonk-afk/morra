import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { logMorraError } from "@/lib/logging";
import {
  referralTierFromCount,
  TIER_PERCENT_BPS,
} from "@/lib/referral/tiers";

export { referralTierFromCount, TIER_PERCENT_BPS } from "@/lib/referral/tiers";

const RELEASE_DELAY_MS = 7 * 24 * 60 * 60 * 1000;

export async function countActiveValidatedReferrals(
  supabase: SupabaseClient,
  referrerId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("referrals")
    .select("*", { count: "exact", head: true })
    .eq("referrer_id", referrerId)
    .eq("status", "active")
    .eq("validated", true);
  if (error) return 0;
  return count ?? 0;
}

/**
 * When a referred user pays a subscription invoice, accrue revenue share to referrer’s pending balance.
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

  const referrerId = payer.referred_by as string;

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

  const availableAt = new Date(Date.now() + RELEASE_DELAY_MS).toISOString();

  const { data: inserted, error: insErr } = await supabase
    .from("referral_revenue_accruals")
    .insert({
      referrer_id: referrerId,
      referred_user_id: payerUserId,
      stripe_invoice_id: invoiceId,
      amount_cents: commissionCents,
      tier,
      percent_bps: bps,
      available_at: availableAt,
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
    .select("pending_balance_cents")
    .eq("id", referrerId)
    .single();
  if (!u2) {
    await supabase.from("referral_revenue_accruals").delete().eq("id", accrualId);
    return;
  }

  let pendingPrev = u2.pending_balance_cents as number;
  let pendingUpdated = false;
  for (let i = 0; i < 5; i++) {
    const { data: up } = await supabase
      .from("profiles")
      .update({
        pending_balance_cents: pendingPrev + commissionCents,
      })
      .eq("id", referrerId)
      .eq("pending_balance_cents", pendingPrev)
      .select("pending_balance_cents")
      .maybeSingle();
    if (up) {
      pendingUpdated = true;
      break;
    }
    const { data: u3 } = await supabase
      .from("profiles")
      .select("pending_balance_cents")
      .eq("id", referrerId)
      .single();
    if (!u3) break;
    pendingPrev = u3.pending_balance_cents as number;
  }
  if (!pendingUpdated) {
    await supabase.from("referral_revenue_accruals").delete().eq("id", accrualId);
    logMorraError("stripe_webhook", "referral_pending_balance_update_failed", {
      referrerIdSuffix: referrerId.slice(-8),
      commissionCents,
    });
    return;
  }

}

const RELEASE_BALANCE_RETRIES = 8;

/**
 * Move matured accruals from pending → earnings (call before balance reads / payout).
 * Claims each accrual row atomically so concurrent cron runs cannot double-release.
 */
/** @returns Number of accrual rows released (moved pending → earnings). */
export async function releaseMaturedReferralAccruals(supabase: SupabaseClient): Promise<number> {
  const now = new Date().toISOString();

  const { data: due, error } = await supabase
    .from("referral_revenue_accruals")
    .select("id, referrer_id, amount_cents")
    .is("released_at", null)
    .lte("available_at", now);

  if (error || !due?.length) return 0;

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
        .select("pending_balance_cents, earnings_balance_cents")
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

      const pending = u.pending_balance_cents as number;
      const earn = u.earnings_balance_cents as number;
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
      const nextEarn = earn + amt;

      const { data: locked } = await supabase
        .from("profiles")
        .update({
          pending_balance_cents: nextPending,
          earnings_balance_cents: nextEarn,
        })
        .eq("id", referrerId)
        .eq("pending_balance_cents", pending)
        .eq("earnings_balance_cents", earn)
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
