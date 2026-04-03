import type { SupabaseClient } from "@supabase/supabase-js";
import { LOW_CREDIT_THRESHOLD } from "@/lib/conversion/constants";
import { logMorraWarn } from "@/lib/logging";

export { LOW_CREDIT_THRESHOLD } from "@/lib/conversion/constants";

export async function insertUserFunnelEvent(
  supabase: SupabaseClient,
  userId: string,
  eventType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await supabase.from("user_funnel_events").insert({
      user_id: userId,
      event_type: eventType,
      metadata: metadata ?? {},
    });
    if (error) {
      logMorraWarn("payment", "user_funnel_event_insert_failed", { detail: error.message });
    }
  } catch (e) {
    logMorraWarn("payment", "user_funnel_event_insert_failed", {
      detail: e instanceof Error ? e.message : String(e),
    });
  }
}

export async function insertCreditUsageLog(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  creditsUsed: number
): Promise<void> {
  try {
    const { error } = await supabase.from("credit_usage_logs").insert({
      user_id: userId,
      action,
      credits_used: Math.max(0, Math.floor(creditsUsed)),
    });
    if (error) {
      logMorraWarn("payment", "credit_usage_log_insert_failed", { detail: error.message });
    }
  } catch (e) {
    logMorraWarn("payment", "credit_usage_log_insert_failed", {
      detail: e instanceof Error ? e.message : String(e),
    });
  }
}

export async function insertUpgradeTrigger(
  supabase: SupabaseClient,
  userId: string,
  triggerType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await supabase.from("upgrade_triggers").insert({
      user_id: userId,
      trigger_type: triggerType,
      metadata: metadata ?? {},
    });
    if (error) {
      logMorraWarn("payment", "upgrade_trigger_insert_failed", { detail: error.message });
    }
  } catch (e) {
    logMorraWarn("payment", "upgrade_trigger_insert_failed", {
      detail: e instanceof Error ? e.message : String(e),
    });
  }
}

/** After a successful tool run: mirror credit usage and optionally record low-balance trigger. */
export async function recordPostGenerationConversionSignals(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  creditsUsed: number,
  balanceAfter: number,
  opts?: { isGod?: boolean }
): Promise<void> {
  await insertCreditUsageLog(supabase, userId, action, creditsUsed);
  if (opts?.isGod) return;
  if (balanceAfter >= LOW_CREDIT_THRESHOLD) return;
  await insertUpgradeTrigger(supabase, userId, "credits_below_threshold", {
    threshold: LOW_CREDIT_THRESHOLD,
    balance_after: balanceAfter,
    action,
  });
}

/** When API returns 402 for tool runs — no payment logic change. */
export async function recordToolHitLimit(
  supabase: SupabaseClient,
  userId: string,
  reason: "insufficient_credits" | "free_tier_limit"
): Promise<void> {
  await insertUserFunnelEvent(supabase, userId, "hit_limit", { reason });
  await insertUpgradeTrigger(supabase, userId, "hit_limit", { reason });
}
