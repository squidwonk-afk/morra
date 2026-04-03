import type { SupabaseClient } from "@supabase/supabase-js";
import { T } from "@/lib/db/morra-prod-tables";
import {
  REFERRAL_ACTIVE_REFERRER_CREDITS,
  REFERRAL_ACTIVE_REFERRER_XP,
  REFERRAL_SUBSCRIPTION_REFERRER_CREDITS,
} from "@/lib/constants/credits";
import { addCreditsOptimistic } from "@/lib/credits/optimistic-balance";
import { applyLevelUpRewards } from "@/lib/services/level-up-rewards";
import { createNotification } from "@/lib/notifications";

const MIN_ACCOUNT_AGE_MS = 24 * 60 * 60 * 1000;
const MIN_GENERATIONS_FOR_REFERRAL = 3;

async function grantReferrerActivationRewards(
  supabase: SupabaseClient,
  referrerId: string,
  _referredUserId: string
): Promise<void> {
  const credits = REFERRAL_ACTIVE_REFERRER_CREDITS;
  const xpDelta = REFERRAL_ACTIVE_REFERRER_XP;

  await addCreditsOptimistic(supabase, referrerId, credits);
  await supabase.from("reward_events").insert({
    user_id: referrerId,
    type: "referral",
    xp: xpDelta,
    credits,
  });

  for (let i = 0; i < 8; i++) {
    const { data: u } = await supabase
      .from(T.userXp)
      .select("xp")
      .eq("user_id", referrerId)
      .single();
    const oldXp = Number((u as { xp?: number | null } | null)?.xp ?? 0);
    const { data: up } = await supabase
      .from(T.userXp)
      .update({ xp: oldXp + xpDelta })
      .eq("user_id", referrerId)
      .eq("xp", oldXp)
      .select("xp")
      .maybeSingle();
    if (up) break;
  }

  const { data: u2 } = await supabase
    .from(T.userXp)
    .select("xp")
    .eq("user_id", referrerId)
    .single();
  const newXp = Number((u2 as { xp?: number | null } | null)?.xp ?? 0);
  await applyLevelUpRewards(supabase, referrerId, newXp);
}

/**
 * Validates referral after referred user has enough generations and the account is mature enough.
 */
export async function maybeActivateReferral(
  supabase: SupabaseClient,
  referredUserId: string
): Promise<void> {
  const { data: refRow, error: refErr } = await supabase
    .from("referrals")
    .select("id, referrer_id, status, validated, ip_suspected")
    .eq("referred_user_id", referredUserId)
    .maybeSingle();
  if (refErr || !refRow || refRow.status !== "pending") return;
  if (refRow.validated) return;
  if (refRow.ip_suspected) return;

  const { count, error: cErr } = await supabase
    .from("generations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", referredUserId);
  if (cErr || (count ?? 0) < MIN_GENERATIONS_FOR_REFERRAL) return;

  const { data: firstGen } = await supabase
    .from("generations")
    .select("created_at")
    .eq("user_id", referredUserId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const firstAt = firstGen?.created_at
    ? new Date(firstGen.created_at as string).getTime()
    : 0;
  if (!firstAt || Date.now() - firstAt < MIN_ACCOUNT_AGE_MS) return;

  const now = new Date().toISOString();
  await supabase
    .from("referrals")
    .update({
      status: "active",
      validated: true,
      first_action_at: now,
    })
    .eq("id", refRow.id);

  await grantReferrerActivationRewards(
    supabase,
    refRow.referrer_id as string,
    referredUserId
  );

  await createNotification(
    supabase,
    refRow.referrer_id as string,
    "referral",
    "Referral validated",
    "Your referral completed activation. You earned referral credits and XP."
  );

  await tryGrantReferralSubscriptionBonus(supabase, referredUserId);
}

/** Reserved for future subscription bonuses; schema uses `reward_events` with fixed types only. */
export async function tryGrantReferralSubscriptionBonus(
  _supabase: SupabaseClient,
  _referredUserId: string
): Promise<void> {
  if (REFERRAL_SUBSCRIPTION_REFERRER_CREDITS <= 0) return;
}
