import { getSessionUserId } from "@/lib/auth/request-user";
import { WELCOME_GIFT_XP_MARKER } from "@/lib/constants/credits";
import { PROFILE_SELECT_ME } from "@/lib/db/profile-fields";
import { T } from "@/lib/db/morra-prod-tables";
import { isGodUsername } from "@/lib/god-mode";
import { displayUsername } from "@/lib/profile/username";
import { eligibleReleaseIsoFromCreatedAt } from "@/lib/referral/earnings-hold";
import { readAvailableCents, readPendingCents } from "@/lib/referral/profile-earnings";
import { clearStalePendingPayoutLogs } from "@/lib/referral/payout-stale";
import { releaseMaturedReferralAccrualsForReferrer } from "@/lib/referral/revenue-share";
import { MIN_PAYOUT_CENTS } from "@/lib/referrals/payout-min";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

const PROFILE_SELECT_FALLBACK =
  "id, username, display_name, subscription_status, subscription_plan, stripe_connect_account_id, flagged, earnings_balance_cents, pending_balance_cents" as const;

const PROFILE_SELECT_MINIMAL =
  "id, username, display_name, subscription_status, subscription_plan, stripe_connect_account_id, flagged" as const;

function planFromProfile(row: {
  subscription_status?: string | null;
  subscription_plan?: string | null;
}): string {
  if (row.subscription_status === "active" && row.subscription_plan) {
    return row.subscription_plan;
  }
  return "free";
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
  await clearStalePendingPayoutLogs(supabase, userId);

  let profileRow: Record<string, unknown> | null = null;

  {
    const a = await supabase.from(T.profiles).select(PROFILE_SELECT_ME).eq("id", userId).single();
    if (a.data && !a.error) {
      profileRow = a.data as Record<string, unknown>;
    } else if (a.error && /column .* does not exist|schema cache/i.test(a.error.message ?? "")) {
      const b = await supabase
        .from(T.profiles)
        .select(PROFILE_SELECT_FALLBACK)
        .eq("id", userId)
        .single();
      if (b.data && !b.error) {
        profileRow = b.data as Record<string, unknown>;
      } else if (b.error && /column .* does not exist|schema cache/i.test(b.error.message ?? "")) {
        const c = await supabase
          .from(T.profiles)
          .select(PROFILE_SELECT_MINIMAL)
          .eq("id", userId)
          .single();
        if (c.data && !c.error) profileRow = c.data as Record<string, unknown>;
      }
    }
  }

  if (!profileRow) {
    return jsonError("User not found.", 404);
  }

  const profile = profileRow;

  const { data: ap } = await supabase
    .from("artist_profiles")
    .select("avatar_url")
    .eq("user_id", userId)
    .maybeSingle();

  const avatarFromProfile = (profile as { avatar_url?: string | null }).avatar_url;
  const avatarFromArtist = (ap as { avatar_url?: string | null } | null)?.avatar_url ?? null;
  const avatarUrl =
    (typeof avatarFromProfile === "string" && avatarFromProfile.trim()) || avatarFromArtist || null;

  const { data: cred } = await supabase
    .from(T.userCredits)
    .select("credits")
    .eq("user_id", userId)
    .single();

  const { data: xpRow } = await supabase
    .from(T.userXp)
    .select("xp, level, streak, last_active_date, last_claim_date")
    .eq("user_id", userId)
    .single();

  const { data: nextAccrual } = await supabase
    .from("referral_revenue_accruals")
    .select("created_at")
    .eq("referrer_id", userId)
    .is("released_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const earliestCreated = (nextAccrual as { created_at?: string | null } | null)?.created_at;
  const nextPendingReleaseAt =
    typeof earliestCreated === "string" && earliestCreated
      ? eligibleReleaseIsoFromCreatedAt(earliestCreated)
      : null;

  const { data: inflightPayout } = await supabase
    .from("payout_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();
  const payoutInProgress = Boolean(inflightPayout?.id);

  const rawUsername =
    typeof profile.username === "string" ? profile.username.trim() : "";
  const usernameForDisplay = displayUsername(profile.username);
  const isGod = isGodUsername(rawUsername);

  const availableCents = readAvailableCents(profile);
  const pendingCents = readPendingCents(profile);

  const { data: giftRow } = await supabase
    .from("reward_events")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "usage")
    .eq("xp", WELCOME_GIFT_XP_MARKER)
    .eq("credits", 50)
    .limit(1)
    .maybeSingle();
  const giftClaimed = Boolean(giftRow?.id);

  const balance = Number((cred as { credits?: number | null } | null)?.credits ?? 0);
  const xp = Number((xpRow as { xp?: number | null } | null)?.xp ?? 0);
  const level = Math.floor(xp / 100) + 1;

  const plan = planFromProfile(profile as { subscription_status?: string | null; subscription_plan?: string | null });

  return jsonOk({
    id: profile.id,
    minPayoutCents: MIN_PAYOUT_CENTS,
    nextPendingReleaseAt,
    payoutInProgress,
    currency: "usd",
    username: usernameForDisplay,
    display_name: profile.display_name,
    avatar_url: avatarUrl,
    xp_value: xp,
    level,
    credits_balance: isGod ? 1_000_000_000 : balance,
    user_credits: isGod ? 1_000_000_000 : balance,
    referral_balance: availableCents,
    subscription_plan:
      (profile as { subscription_plan?: string | null }).subscription_plan ?? "free",
    user: {
      id: profile.id,
      username: usernameForDisplay,
      displayName: profile.display_name,
      display_name: profile.display_name,
      avatarUrl,
      avatar_url: avatarUrl,
      referralCode: rawUsername || usernameForDisplay,
      plan,
      giftClaimed,
      isGod,
      subscriptionStatus: (profile as { subscription_status?: string | null }).subscription_status ?? null,
      subscriptionPlan: (profile as { subscription_plan?: string | null }).subscription_plan ?? null,
      subscriptionCurrentPeriodEnd: null,
      lastCreditRefresh: null,
      stripeConnectAccountId: (() => {
        const a = (profile as { stripe_account_id?: string | null }).stripe_account_id?.trim();
        if (a) return a;
        const b = (profile as { stripe_connect_account_id?: string | null }).stripe_connect_account_id?.trim();
        return b || null;
      })(),
      flagged: Boolean((profile as { flagged?: boolean | null }).flagged),
    },
    credits: { balance: isGod ? 1_000_000_000 : balance },
    xp: {
      xp,
      level,
      streak: Number((xpRow as { streak?: number | null } | null)?.streak ?? 0),
    },
    earnings: {
      availableCents,
      pendingCents,
    },
  });
}
