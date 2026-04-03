import type { SupabaseClient } from "@supabase/supabase-js";
import { logMorraWarn } from "@/lib/logging";

/**
 * Calls DB function `process_referral_earning` if present (parameter names vary by migration).
 * Safe no-op when the RPC is missing or returns an error.
 */
export async function tryProcessReferralEarning(
  supabase: SupabaseClient,
  args: {
    userId: string;
    amountPaidUsd: number;
    kind: "subscription" | "credits";
    planOrPackage: string;
    eventId: string;
  }
): Promise<void> {
  const payloads: Record<string, unknown>[] = [
    {
      user_id: args.userId,
      amount_paid: args.amountPaidUsd,
      payment_kind: args.kind,
      plan: args.planOrPackage,
      event_id: args.eventId,
    },
    {
      p_user_id: args.userId,
      p_amount_paid: args.amountPaidUsd,
      p_payment_kind: args.kind,
      p_plan: args.planOrPackage,
      p_event_id: args.eventId,
    },
    {
      p_user_id: args.userId,
      p_amount_paid: args.amountPaidUsd,
      p_kind: args.kind,
      p_plan: args.planOrPackage,
      p_event_id: args.eventId,
    },
  ];

  for (const p of payloads) {
    const { error } = await supabase.rpc("process_referral_earning", p);
    if (!error) return;
    if (!/function .* does not exist|Could not find the function/i.test(error.message)) {
      logMorraWarn("stripe_webhook", "process_referral_earning_rpc_error", {
        detail: error.message,
      });
      return;
    }
  }
}

/** Calls handle_referral_payment(user_id, amount, kind, credits). */
export async function tryHandleReferralPayment(
  supabase: SupabaseClient,
  args: {
    userId: string;
    amountPaidUsd: number;
    kind: "subscription" | "credits";
    creditsGranted: number;
  }
): Promise<void> {
  const payloads: Record<string, unknown>[] = [
    {
      user_id: args.userId,
      amount: args.amountPaidUsd,
      payment_type: args.kind,
      credits: args.creditsGranted,
    },
    {
      p_user_id: args.userId,
      p_amount: args.amountPaidUsd,
      p_payment_type: args.kind,
      p_credits: args.creditsGranted,
    },
  ];
  for (const p of payloads) {
    const { error } = await supabase.rpc("handle_referral_payment", p);
    if (!error) return;
    if (!/function .* does not exist|Could not find the function/i.test(error.message)) {
      logMorraWarn("stripe_webhook", "handle_referral_payment_rpc_error", {
        detail: error.message,
      });
      return;
    }
  }
}

/** Reward referrer on first paid subscription (DB handles idempotency). */
export async function tryRewardFirstSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  for (const payload of [{ user_id: userId }, { p_user_id: userId }] as const) {
    const { error } = await supabase.rpc("reward_first_subscription", payload);
    if (!error) return;
    if (!/function .* does not exist|Could not find the function/i.test(error.message)) {
      logMorraWarn("stripe_webhook", "reward_first_subscription_rpc_error", {
        detail: error.message,
      });
      return;
    }
  }
}
