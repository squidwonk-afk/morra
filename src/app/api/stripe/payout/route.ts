import { getSessionUserId } from "@/lib/auth/request-user";
import { tryInsertTransactionLedger } from "@/lib/db/transactions";
import { logMorraError, logMorraInfo, logMorraWarn } from "@/lib/logging";
import { readAvailableCents } from "@/lib/referral/profile-earnings";
import { clearStalePendingPayoutLogs } from "@/lib/referral/payout-stale";
import { releaseMaturedReferralAccrualsForReferrer } from "@/lib/referral/revenue-share";
import { MIN_PAYOUT_CENTS } from "@/lib/referrals/payout-min";
import { jsonError, jsonOk } from "@/lib/http";
import { getStripe } from "@/lib/stripe";
import { getStripeUsdAvailableCents } from "@/lib/stripe/platform-usd-balance";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const PAYOUT_COOLDOWN_MS = 60 * 60 * 1000;

const PROFILE_PAYOUT_SELECT =
  "stripe_account_id, stripe_connect_account_id, earnings_available_cents, earnings_balance_cents, flagged" as const;

/**
 * User-initiated withdrawal: full earnings_available_cents → Connect Express (USD only).
 * Reserves balance before transfer; on any transfer/platform failure, restores reserved amount (never steals funds).
 */
export async function POST() {
  if (!isSupabaseConfigured()) {
    return jsonError("Server is not configured.", 503);
  }
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("Unauthorized.", 401);
  }

  const supabase = getSupabaseAdmin();
  await releaseMaturedReferralAccrualsForReferrer(supabase, userId);
  await clearStalePendingPayoutLogs(supabase, userId);

  const { data: user, error: uErr } = await supabase
    .from("profiles")
    .select(PROFILE_PAYOUT_SELECT)
    .eq("id", userId)
    .single();

  if (uErr || !user) {
    return jsonError("User not found.", 404);
  }
  if ((user as { flagged?: boolean | null }).flagged) {
    return jsonError("Withdrawals are temporarily unavailable for your account.", 403);
  }

  const connectId =
    (user.stripe_account_id as string | null | undefined)?.trim() ||
    (user.stripe_connect_account_id as string | null | undefined)?.trim() ||
    null;
  if (!connectId) {
    return jsonError("Connect your Stripe account before withdrawing.", 400);
  }

  const available = readAvailableCents(user as Record<string, unknown>);
  if (!Number.isFinite(available) || available < 0) {
    logMorraWarn("payout", "invalid_earnings_balance", { userIdSuffix: userId.slice(-8) });
    return jsonError("Invalid earnings balance.", 400);
  }
  if (available === 0) {
    return jsonError("No balance to withdraw.", 400);
  }
  if (available < MIN_PAYOUT_CENTS) {
    return jsonError("Minimum payout is $5", 400);
  }

  const { data: lastOut } = await supabase
    .from("connect_payouts")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastOut?.created_at) {
    const createdMs = new Date(lastOut.created_at as string).getTime();
    const elapsed = Number.isFinite(createdMs) ? Date.now() - createdMs : Number.POSITIVE_INFINITY;
    if (elapsed >= 0 && elapsed < PAYOUT_COOLDOWN_MS) {
      return jsonError("You can withdraw at most once per hour. Try again soon.", 429);
    }
  }

  const requested = available;
  const stripe = getStripe();

  let acct: Awaited<ReturnType<typeof stripe.accounts.retrieve>>;
  try {
    acct = await stripe.accounts.retrieve(connectId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not verify Connect account";
    logMorraError("payout", "connect_account_retrieve_failed", {
      userIdSuffix: userId.slice(-8),
      detail: msg,
    });
    return jsonError(msg, 502);
  }

  if (!acct.details_submitted) {
    return jsonError("Finish Stripe onboarding before withdrawing.", 400);
  }

  const { data: logInsert, error: logInsErr } = await supabase
    .from("payout_logs")
    .insert({
      user_id: userId,
      amount_cents: requested,
      status: "pending",
      error_message: null,
      stripe_transfer_id: null,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (logInsErr) {
    if (logInsErr.code === "23505" || /duplicate|unique/i.test(logInsErr.message ?? "")) {
      logMorraWarn("payout", "payout_in_progress_conflict", { userIdSuffix: userId.slice(-8) });
      return jsonError("A payout is already in progress. Please wait a moment.", 409);
    }
    logMorraWarn("payout", "payout_log_insert_failed", { detail: logInsErr.message });
  }

  const logId = logInsert?.id as string | undefined;
  if (!logId) {
    return jsonError("Could not start payout. Try again.", 500);
  }

  const newBalance = 0;
  const { data: locked, error: lockErr } = await supabase
    .from("profiles")
    .update({
      earnings_available_cents: newBalance,
    })
    .eq("id", userId)
    .eq("earnings_available_cents", available)
    .select("earnings_available_cents")
    .maybeSingle();

  if (lockErr || !locked) {
    await supabase
      .from("payout_logs")
      .update({
        status: "failed",
        error_message: "balance_lock_conflict",
        updated_at: new Date().toISOString(),
      })
      .eq("id", logId);
    logMorraWarn("payout", "balance_lock_conflict", { userIdSuffix: userId.slice(-8) });
    return jsonError("Could not reserve balance. Try again.", 409);
  }

  const releaseReserved = async (reason: string) => {
    await supabase.from("profiles").update({ earnings_available_cents: available }).eq("id", userId);
    await supabase
      .from("payout_logs")
      .update({
        status: "failed",
        error_message: reason.slice(0, 2000),
        updated_at: new Date().toISOString(),
      })
      .eq("id", logId);
  };

  let platformUsd = 0;
  try {
    platformUsd = await getStripeUsdAvailableCents(stripe);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "balance_retrieve_failed";
    logMorraError("payout", "platform_balance_failed", { userIdSuffix: userId.slice(-8), detail: msg });
    await releaseReserved("platform_balance_check_failed");
    return jsonError("Funds not yet available from Stripe", 503);
  }

  if (platformUsd < requested) {
    logMorraWarn("payout", "platform_insufficient_usd", {
      userIdSuffix: userId.slice(-8),
      requested,
      platformUsd,
    });
    await releaseReserved("platform_insufficient_balance");
    return jsonError("Funds not yet available from Stripe", 503);
  }

  logMorraInfo("payout", "transfer_attempt", {
    userIdSuffix: userId.slice(-8),
    amountCents: requested,
    logId: logId,
    platformUsdAvailable: platformUsd,
  });

  try {
    const transfer = await stripe.transfers.create(
      {
        amount: requested,
        currency: "usd",
        destination: connectId,
        metadata: { morra_user_id: userId, morra_payout_log_id: logId },
      },
      { idempotencyKey: logId }
    );

    await supabase
      .from("payout_logs")
      .update({
        status: "succeeded",
        stripe_transfer_id: transfer.id,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", logId);

    const { error: cpErr } = await supabase.from("connect_payouts").insert({
      user_id: userId,
      amount_cents: requested,
      stripe_transfer_id: transfer.id,
    });
    if (cpErr) {
      logMorraError("payout", "connect_payouts_insert_failed", {
        userIdSuffix: userId.slice(-8),
        detail: cpErr.message,
        transferId: transfer.id,
      });
    }

    const { error: pErr } = await supabase.from("payouts").insert({
      user_id: userId,
      amount_cents: requested,
    });
    if (pErr) {
      logMorraError("payout", "payouts_insert_failed", {
        userIdSuffix: userId.slice(-8),
        detail: pErr.message,
        transferId: transfer.id,
      });
    }

    await tryInsertTransactionLedger(supabase, {
      userId,
      type: "connect_payout",
      amount: requested,
      metadata: {
        unit: "cents",
        stripe_transfer_id: transfer.id,
        destination: connectId,
        currency: "usd",
      },
    });

    logMorraInfo("payout", "transfer_succeeded", {
      userIdSuffix: userId.slice(-8),
      amountCents: requested,
      transferId: transfer.id,
    });

    return jsonOk({
      transferId: transfer.id,
      amountCents: requested,
      balanceAfter: 0,
      minPayoutCents: MIN_PAYOUT_CENTS,
      currency: "usd",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Transfer failed";
    await releaseReserved(msg);
    logMorraError("payout", "transfer_failed", {
      userIdSuffix: userId.slice(-8),
      amountCents: requested,
      detail: msg,
    });
    return jsonError(msg, 502);
  }
}
