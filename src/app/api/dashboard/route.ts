import { getSessionUserId } from "@/lib/auth/request-user";
import { displayUsername } from "@/lib/profile/username";
import { PROFILE_SELECT_IDENTITY } from "@/lib/db/profile-fields";
import { T } from "@/lib/db/morra-prod-tables";
import { eligibleReleaseIsoFromCreatedAt } from "@/lib/referral/earnings-hold";
import { clearStalePendingPayoutLogs } from "@/lib/referral/payout-stale";
import { readAvailableCents, readPendingCents } from "@/lib/referral/profile-earnings";
import { releaseMaturedReferralAccrualsForReferrer } from "@/lib/referral/revenue-share";
import {
  referralTierFromCount,
  tierRevenuePercentLabel,
} from "@/lib/referral/tiers";
import { isPlanKey } from "@/lib/pricing";
import { isGodUsername } from "@/lib/god-mode";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

function utcDateString(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return jsonError("Server is not configured.", 503);
  }
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("Unauthorized.", 401);
  }

  const supabase = getSupabaseAdmin();
  await releaseMaturedReferralAccrualsForReferrer(supabase, userId);

  let profile: Record<string, unknown> | null = null;
  {
    const sel = `${PROFILE_SELECT_IDENTITY}, subscription_status, subscription_plan, earnings_available_cents, earnings_pending_cents, earnings_balance_cents, pending_balance_cents`;
    const a = await supabase.from(T.profiles).select(sel).eq("id", userId).single();
    if (a.data && !a.error) {
      profile = a.data as unknown as Record<string, unknown>;
    } else if (a.error && /column .* does not exist|schema cache/i.test(a.error.message ?? "")) {
      const b = await supabase
        .from(T.profiles)
        .select(`${PROFILE_SELECT_IDENTITY}, subscription_status, subscription_plan, earnings_balance_cents, pending_balance_cents`)
        .eq("id", userId)
        .single();
      profile = (b.data as Record<string, unknown>) ?? null;
    } else {
      return jsonError("User not found.", 404);
    }
  }
  if (!profile) return jsonError("User not found.", 404);

  const { data: xpUser } = await supabase
    .from(T.userXp)
    .select("xp, level, streak, last_active_date, last_claim_date")
    .eq("user_id", userId)
    .single();

  const { data: cred } = await supabase
    .from(T.userCredits)
    .select("credits")
    .eq("user_id", userId)
    .single();

  const usernameRaw = typeof profile.username === "string" ? profile.username.trim() : "";
  const username = displayUsername(profile.username);
  const isGod = isGodUsername(usernameRaw);

  const xp = Number((xpUser as { xp?: number | null } | null)?.xp ?? 0);
  const level = Number((xpUser as { level?: number | null } | null)?.level ?? 1);
  const streak = Number((xpUser as { streak?: number | null } | null)?.streak ?? 0);
  const lastActiveDate = ((xpUser as { last_active_date?: string | null } | null)?.last_active_date ??
    null) as string | null;

  const { data: recentGens } = await supabase
    .from("generations")
    .select("id, type, created_at, output_data")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(12);

  const activity =
    recentGens?.map((g) => {
      const out = g.output_data as Record<string, unknown> | null;
      let title = `${g.type} output`;
      if (g.type === "identity" && out?.bio && typeof out.bio === "string") {
        title = out.bio.slice(0, 64) + (out.bio.length > 64 ? "…" : "");
      } else if (g.type === "rollout" && out?.summary && typeof out.summary === "string") {
        title = String(out.summary).slice(0, 80);
      }
      return { id: g.id as string, type: g.type as string, title, createdAt: g.created_at as string };
    }) ?? [];

  const { count: refPending } = await supabase
    .from("referrals")
    .select("*", { count: "exact", head: true })
    .eq("referrer_id", userId)
    .eq("status", "pending");

  const { count: refActive } = await supabase
    .from("referrals")
    .select("*", { count: "exact", head: true })
    .eq("referrer_id", userId)
    .eq("status", "active");

  const activeReferralCount = refActive ?? 0;

  let totalPaidOutCents = 0;
  const payoutQ = await supabase
    .from("connect_payouts")
    .select("amount_cents")
    .eq("user_id", userId);
  if (!payoutQ.error && payoutQ.data) {
    totalPaidOutCents = payoutQ.data.reduce(
      (s, r) => s + Number((r as { amount_cents?: number | null }).amount_cents ?? 0),
      0
    );
  }
  const availableReferralCents = readAvailableCents(profile);
  const pendingReferralCents = readPendingCents(profile);

  const { data: nextDashAccrual } = await supabase
    .from("referral_revenue_accruals")
    .select("created_at")
    .eq("referrer_id", userId)
    .is("released_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const earliestDashCreated = (nextDashAccrual as { created_at?: string | null } | null)?.created_at;
  const nextPendingReleaseAt =
    typeof earliestDashCreated === "string" && earliestDashCreated
      ? eligibleReleaseIsoFromCreatedAt(earliestDashCreated)
      : null;

  const referralLifetimeEarnedCents = totalPaidOutCents + availableReferralCents;
  const referralTier = referralTierFromCount(activeReferralCount);

  const { data: referralRewardRows } = await supabase
    .from("reward_events")
    .select("credits")
    .eq("user_id", userId)
    .eq("type", "referral");
  const referralCreditsEarned =
    referralRewardRows?.reduce((sum, r) => sum + (Number((r as { credits?: number | null }).credits) || 0), 0) ??
    0;

  const today = utcDateString();
  const dailyBonusClaimed =
    ((xpUser as { last_claim_date?: string | null } | null)?.last_claim_date ?? null) === today;

  const bestLevel = Math.floor(xp / 100) + 1;
  const currentLevelXP = Math.floor(xp / 100) * 100;
  const nextLevelXP = currentLevelXP + 100;
  const progressPercent = Math.min(100, Math.max(0, ((xp - currentLevelXP) / 100) * 100));
  const xpToNextLevel = Math.max(0, nextLevelXP - xp);
  const maxLadder = Math.max(bestLevel + 2, 12);
  const xpLadder = Array.from({ length: maxLadder }, (_, i) => {
    const lvl = i + 1;
    const req = (lvl - 1) * 100;
    return {
      level: lvl,
      xpRequired: req,
      unlocked: xp >= req,
      current: bestLevel === lvl,
    };
  });

  const subPlan = (profile as { subscription_plan?: string | null }).subscription_plan;
  const subStatus = (profile as { subscription_status?: string | null }).subscription_status;
  const plan =
    subStatus === "active" && subPlan && isPlanKey(subPlan) ? subPlan : "free";

  return jsonOk({
    profile: {
      display_name: profile.display_name,
      username,
      plan,
    },
    credits: {
      balance: isGod ? 1_000_000_000 : Number((cred as { credits?: number | null } | null)?.credits ?? 0),
    },
    xp: {
      xp,
      level: bestLevel || level,
      streak,
      lastActiveDate,
    },
    xpProgress: {
      currentLevel: bestLevel || level,
      currentLevelXP,
      nextLevelXP,
      progressPercent,
      xpToNextLevel,
    },
    xpLadder,
    recentActivity: activity,
    referrals: {
      pending: refPending ?? 0,
      active: activeReferralCount,
      code: usernameRaw || username,
      tier: referralTier,
      tierPercentLabel: tierRevenuePercentLabel(referralTier),
      creditsEarned: referralCreditsEarned,
      lifetimeEarnedCents: referralLifetimeEarnedCents,
      availableBalanceCents: availableReferralCents,
      pendingEarningsCents: pendingReferralCents,
      nextPendingReleaseAt,
    },
    dailyBonus: { claimedToday: dailyBonusClaimed },
  });
}
