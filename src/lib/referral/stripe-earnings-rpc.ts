import type { SupabaseClient } from "@supabase/supabase-js";
import { logMorraWarn } from "@/lib/logging";
import {
  resolveValidatedReferrerForPayer,
  syncReferralGrowthAfterEarning,
} from "@/lib/referral/growth-engine";

export type ProcessReferralEarningArgs = {
  referrerId: string;
  referredUserId: string;
  /** Gross payment in USD (commission is derived in DB from tier %). */
  grossAmountUsd: number;
  idempotencyKey: string;
  source: string;
};

/**
 * DB validates profiles.referred_by = referrerId, blocks self-referral, requires active+validated referral.
 * Duplicate idempotency_key is ignored (returns false).
 */
export async function runProcessReferralEarning(
  supabase: SupabaseClient,
  args: ProcessReferralEarningArgs
): Promise<boolean> {
  if (args.grossAmountUsd <= 0 || !args.idempotencyKey.trim()) return false;

  const { data, error } = await supabase.rpc("process_referral_earning", {
    p_referrer_id: args.referrerId,
    p_amount_usd: args.grossAmountUsd,
    p_referred_user_id: args.referredUserId,
    p_idempotency_key: args.idempotencyKey,
    p_source: args.source,
  });

  if (error) {
    logMorraWarn("stripe_webhook", "process_referral_earning_rpc_error", {
      detail: error.message,
    });
    return false;
  }

  return Boolean(data);
}

export async function runProcessReferralEarningWithSync(
  supabase: SupabaseClient,
  args: ProcessReferralEarningArgs
): Promise<boolean> {
  const inserted = await runProcessReferralEarning(supabase, args);
  if (inserted) {
    await syncReferralGrowthAfterEarning(supabase, args.referrerId);
  }
  return inserted;
}

/**
 * Resolves referrer from profiles.referred_by (same rules as revenue share), then records earnings + syncs leaderboard.
 */
export async function runProcessReferralEarningForPayerWithSync(
  supabase: SupabaseClient,
  payerUserId: string,
  grossAmountUsd: number,
  idempotencyKey: string,
  source: string
): Promise<boolean> {
  const resolved = await resolveValidatedReferrerForPayer(supabase, payerUserId);
  if (!resolved) return false;
  return runProcessReferralEarningWithSync(supabase, {
    referrerId: resolved.referrerId,
    referredUserId: payerUserId,
    grossAmountUsd,
    idempotencyKey,
    source,
  });
}

/**
 * First-subscription bonus row (idempotent per referred user). DB validates referred_by and referral row
 * (pending allowed; not invalid / not ip_suspected).
 */
export async function runRewardFirstSubscription(
  supabase: SupabaseClient,
  referredUserId: string
): Promise<boolean> {
  const { data: payer, error: pErr } = await supabase
    .from("profiles")
    .select("referred_by")
    .eq("id", referredUserId)
    .single();
  if (pErr || !payer?.referred_by) return false;

  const referrerId = String(payer.referred_by ?? "").trim();
  if (!referrerId || referrerId === referredUserId) return false;

  const { data, error } = await supabase.rpc("reward_first_subscription", {
    p_referrer_id: referrerId,
    p_referred_user_id: referredUserId,
  });

  if (error) {
    logMorraWarn("stripe_webhook", "reward_first_subscription_rpc_error", {
      detail: error.message,
    });
    return false;
  }

  return Boolean(data);
}
