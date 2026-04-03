import type { SupabaseClient } from "@supabase/supabase-js";
import { logMorraWarn } from "@/lib/logging";
import { addCreditsOptimistic } from "@/lib/credits/optimistic-balance";
import { referralTierFromCount } from "@/lib/referral/tiers";
import { countActiveValidatedReferrals } from "@/lib/referral/referral-counts";

const MILESTONES = [
  { key: "conv_3", threshold: 3, credits: 50 },
  { key: "conv_10", threshold: 10, credits: 150 },
  { key: "conv_25", threshold: 25, credits: 500 },
] as const;

function utcWeekStartIso(): string {
  const x = new Date();
  const day = x.getUTCDay();
  const diff = (day + 6) % 7;
  x.setUTCDate(x.getUTCDate() - diff);
  x.setUTCHours(0, 0, 0, 0);
  return x.toISOString();
}

function referralsToNextTier(active: number): number | null {
  if (active >= 50) return null;
  if (active >= 15) return 50 - active;
  if (active >= 5) return 15 - active;
  return 5 - active;
}

/**
 * Same eligibility as subscription invoice accrual (does not change payout math).
 */
export async function resolveValidatedReferrerForPayer(
  supabase: SupabaseClient,
  payerUserId: string
): Promise<{ referrerId: string } | null> {
  const { data: payer, error: pErr } = await supabase
    .from("profiles")
    .select("referred_by")
    .eq("id", payerUserId)
    .single();
  if (pErr || !payer?.referred_by) return null;

  const referrerId = String(payer.referred_by ?? "").trim();
  if (!referrerId || referrerId === payerUserId) return null;

  const { data: refProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", referrerId)
    .maybeSingle();
  if (!refProfile?.id) return null;

  const { data: ref, error: rErr } = await supabase
    .from("referrals")
    .select("id, validated, ip_suspected, status")
    .eq("referrer_id", referrerId)
    .eq("referred_user_id", payerUserId)
    .maybeSingle();
  if (rErr || !ref || ref.status !== "active" || !ref.validated || ref.ip_suspected) return null;

  const { data: referrer, error: uErr } = await supabase
    .from("profiles")
    .select("flagged")
    .eq("id", referrerId)
    .single();
  if (uErr || !referrer || referrer.flagged) return null;

  return { referrerId };
}

async function syncReferralStatsForReferrer(supabase: SupabaseClient, referrerId: string): Promise<void> {
  const { data: rows } = await supabase
    .from("referral_earnings")
    .select("amount_cents, referred_user_id")
    .eq("referrer_id", referrerId);

  let total = 0;
  const distinct = new Set<string>();
  for (const r of rows ?? []) {
    total += Number((r as { amount_cents: number }).amount_cents);
    distinct.add(String((r as { referred_user_id: string }).referred_user_id));
  }

  const active = await countActiveValidatedReferrals(supabase, referrerId);
  const tier = referralTierFromCount(active);

  await supabase.from("referral_stats").upsert(
    {
      referrer_id: referrerId,
      total_earned_cents: total,
      total_conversions: distinct.size,
      active_referrals: active,
      tier,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "referrer_id" }
  );
}

async function refreshReferralLeaderboard(supabase: SupabaseClient): Promise<void> {
  const { data: stats } = await supabase
    .from("referral_stats")
    .select("referrer_id, total_earned_cents, total_conversions");

  const list = (
    [...(stats ?? [])] as {
      referrer_id: string;
      total_earned_cents: number;
      total_conversions: number;
    }[]
  ).sort((a, b) => {
    const d = Number(b.total_earned_cents) - Number(a.total_earned_cents);
    if (d !== 0) return d;
    return a.referrer_id.localeCompare(b.referrer_id);
  });

  let rank = 1;
  const now = new Date().toISOString();
  for (const s of list) {
    await supabase.from("referral_leaderboard").upsert(
      {
        referrer_id: s.referrer_id,
        rank,
        total_earned_cents: s.total_earned_cents,
        referral_count: s.total_conversions,
        updated_at: now,
      },
      { onConflict: "referrer_id" }
    );
    rank += 1;
  }
}

async function tryGrantReferralMilestones(supabase: SupabaseClient, referrerId: string): Promise<void> {
  const { data: stat } = await supabase
    .from("referral_stats")
    .select("total_conversions")
    .eq("referrer_id", referrerId)
    .maybeSingle();
  const n = Number((stat as { total_conversions?: number } | null)?.total_conversions ?? 0);

  for (const m of MILESTONES) {
    if (n < m.threshold) continue;

    const { data: existing } = await supabase
      .from("referral_milestone_claims")
      .select("id")
      .eq("referrer_id", referrerId)
      .eq("milestone_key", m.key)
      .maybeSingle();
    if (existing) continue;

    const { error: claimErr } = await supabase.from("referral_milestone_claims").insert({
      referrer_id: referrerId,
      milestone_key: m.key,
      credits_awarded: m.credits,
    });
    if (claimErr) {
      if (claimErr.code === "23505") continue;
      logMorraWarn("stripe_webhook", "referral_milestone_claim_insert_failed", { detail: claimErr.message });
      continue;
    }

    try {
      await addCreditsOptimistic(supabase, referrerId, m.credits);
      await supabase.from("reward_events").insert({
        user_id: referrerId,
        type: "referral",
        xp: 0,
        credits: m.credits,
      });
    } catch (e) {
      logMorraWarn("stripe_webhook", "referral_milestone_credits_failed", {
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  }
}

async function afterNewGrowthEarning(supabase: SupabaseClient, referrerId: string): Promise<void> {
  await syncReferralStatsForReferrer(supabase, referrerId);
  await refreshReferralLeaderboard(supabase);
  await tryGrantReferralMilestones(supabase, referrerId);
}

/** After a new row in referral_earnings (via process_referral_earning RPC). */
export async function syncReferralGrowthAfterEarning(
  supabase: SupabaseClient,
  referrerId: string
): Promise<void> {
  await afterNewGrowthEarning(supabase, referrerId);
}

export type ReferralEngagementApi = {
  leaderboard: {
    rank: number;
    userId: string;
    displayName: string | null;
    username: string | null;
    totalEarnedCents: number;
    referralCount: number;
  }[];
  myRank: number | null;
  stats: {
    totalEarnedCents: number;
    totalConversions: number;
    activeReferrals: number;
    tier: number;
    weeklyEarnedCents: number;
  } | null;
  milestones: {
    key: string;
    threshold: number;
    credits: number;
    complete: boolean;
    claimed: boolean;
  }[];
  messages: {
    nextTierReferrals: number | null;
    weeklyUsd: string;
  };
};

export async function getReferralEngagementPayload(
  supabase: SupabaseClient,
  viewerUserId: string | null
): Promise<ReferralEngagementApi> {
  const weekStart = utcWeekStartIso();

  const { data: lbRows, error: lbErr } = await supabase
    .from("referral_leaderboard")
    .select("referrer_id, rank, total_earned_cents, referral_count")
    .order("rank", { ascending: true })
    .limit(50);

  const leaderboardRows = lbErr ? [] : lbRows;

  const ids = (leaderboardRows ?? []).map((r) => (r as { referrer_id: string }).referrer_id);
  let profileMap = new Map<string, { display_name: string | null; username: string | null }>();
  if (ids.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name, username")
      .in("id", ids);
    profileMap = new Map(
      (profs ?? []).map((p) => [
        (p as { id: string }).id,
        {
          display_name: (p as { display_name?: string | null }).display_name ?? null,
          username: (p as { username?: string | null }).username ?? null,
        },
      ])
    );
  }

  const leaderboard = (leaderboardRows ?? []).map((r) => {
    const row = r as {
      referrer_id: string;
      rank: number;
      total_earned_cents: number;
      referral_count: number;
    };
    const p = profileMap.get(row.referrer_id);
    return {
      rank: row.rank,
      userId: row.referrer_id,
      displayName: p?.display_name ?? null,
      username: p?.username ?? null,
      totalEarnedCents: Number(row.total_earned_cents),
      referralCount: row.referral_count,
    };
  });

  let myRank: number | null = null;
  let stats: ReferralEngagementApi["stats"] = null;
  let weeklyEarned = 0;

  if (viewerUserId) {
    const { data: myLb } = await supabase
      .from("referral_leaderboard")
      .select("rank")
      .eq("referrer_id", viewerUserId)
      .maybeSingle();
    myRank = myLb ? Number((myLb as { rank: number }).rank) : null;

    const { data: st, error: stErr } = await supabase
      .from("referral_stats")
      .select("total_earned_cents, total_conversions, active_referrals, tier")
      .eq("referrer_id", viewerUserId)
      .maybeSingle();

    if (!stErr && st) {
      const s = st as {
        total_earned_cents: number;
        total_conversions: number;
        active_referrals: number;
        tier: number;
      };
      stats = {
        totalEarnedCents: Number(s.total_earned_cents),
        totalConversions: s.total_conversions,
        activeReferrals: s.active_referrals,
        tier: s.tier,
        weeklyEarnedCents: 0,
      };
    }

    const { data: weekRows } = await supabase
      .from("referral_earnings")
      .select("amount_cents")
      .eq("referrer_id", viewerUserId)
      .gte("created_at", weekStart);
    weeklyEarned = (weekRows ?? []).reduce(
      (sum, r) => sum + Number((r as { amount_cents: number }).amount_cents),
      0
    );
    if (stats) stats.weeklyEarnedCents = weeklyEarned;
  }

  const activeForMessage = stats?.activeReferrals ?? 0;
  const nextTierReferrals = referralsToNextTier(activeForMessage);

  const claimedKeys = new Set<string>();
  if (viewerUserId) {
    const { data: claims } = await supabase
      .from("referral_milestone_claims")
      .select("milestone_key")
      .eq("referrer_id", viewerUserId);
    for (const c of claims ?? []) {
      claimedKeys.add(String((c as { milestone_key: string }).milestone_key));
    }
  }

  const conv = stats?.totalConversions ?? 0;
  const milestones = MILESTONES.map((m) => ({
    key: m.key,
    threshold: m.threshold,
    credits: m.credits,
    complete: conv >= m.threshold,
    claimed: claimedKeys.has(m.key),
  }));

  const weeklyUsd = (weeklyEarned / 100).toFixed(2);

  return {
    leaderboard,
    myRank,
    stats,
    milestones,
    messages: {
      nextTierReferrals,
      weeklyUsd,
    },
  };
}
