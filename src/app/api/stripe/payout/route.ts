import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth/request-user";
import { releaseMaturedReferralAccruals } from "@/lib/referral/revenue-share";
import { tryInsertTransactionLedger } from "@/lib/db/transactions";
import { logMorraError, logMorraInfo, logMorraWarn } from "@/lib/logging";
import { jsonError, jsonOk } from "@/lib/http";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MIN_PAYOUT_CENTS = 1000; // $10

const bodySchema = z.object({
  /** Omit or null to withdraw full available balance. */
  amountCents: z.number().int().positive().optional(),
});

/**
 * Transfers available earnings to the user’s connected Express account (Stripe Connect).
 */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return jsonError("Server is not configured.", 503);
  }
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("Unauthorized.", 401);
  }

  let body: z.infer<typeof bodySchema>;
  try {
    const raw = await req.json().catch(() => ({}));
    body = bodySchema.parse(raw);
  } catch {
    return jsonError("Invalid body.", 400);
  }

  const supabase = getSupabaseAdmin();
  await releaseMaturedReferralAccruals(supabase);

  const { data: user, error: uErr } = await supabase
    .from("profiles")
    .select(
      "stripe_connect_account_id, earnings_balance_cents, pending_balance_cents, flagged"
    )
    .eq("id", userId)
    .single();
  if (uErr || !user) {
    return jsonError("User not found.", 404);
  }
  if (user.flagged) {
    return jsonError("Withdrawals are temporarily unavailable for your account.", 403);
  }

  const connectId = user.stripe_connect_account_id as string | null;
  if (!connectId?.trim()) {
    return jsonError("Connect your Stripe account in Settings first.", 400);
  }

  const available = user.earnings_balance_cents as number;
  const requested =
    body.amountCents != null ? body.amountCents : available;

  if (requested < MIN_PAYOUT_CENTS) {
    return jsonError("Minimum withdrawal is $10.00.", 400);
  }
  if (requested > available) {
    return jsonError("Insufficient available balance.", 400);
  }

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

  const { data: locked, error: lockErr } = await supabase
    .from("profiles")
    .update({
      earnings_balance_cents: available - requested,
    })
    .eq("id", userId)
    .eq("earnings_balance_cents", available)
    .select("earnings_balance_cents")
    .maybeSingle();

  if (lockErr || !locked) {
    logMorraWarn("payout", "balance_lock_conflict", { userIdSuffix: userId.slice(-8) });
    return jsonError("Could not reserve balance. Try again.", 409);
  }

  logMorraInfo("payout", "transfer_attempt", {
    userIdSuffix: userId.slice(-8),
    amountCents: requested,
  });

  try {
    const transfer = await stripe.transfers.create({
      amount: requested,
      currency: "usd",
      destination: connectId,
      metadata: { morra_user_id: userId },
    });

    await supabase.from("connect_payouts").insert({
      user_id: userId,
      amount_cents: requested,
      stripe_transfer_id: transfer.id,
    });

    await tryInsertTransactionLedger(supabase, {
      userId,
      type: "connect_payout",
      amount: requested,
      metadata: {
        unit: "cents",
        stripe_transfer_id: transfer.id,
        destination: connectId,
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
      balanceAfter: (locked.earnings_balance_cents as number) ?? available - requested,
    });
  } catch (e) {
    await supabase
      .from("profiles")
      .update({ earnings_balance_cents: available })
      .eq("id", userId);
    const msg = e instanceof Error ? e.message : "Transfer failed";
    logMorraError("payout", "transfer_failed", {
      userIdSuffix: userId.slice(-8),
      amountCents: requested,
      detail: msg,
    });
    return jsonError(msg, 502);
  }
}
