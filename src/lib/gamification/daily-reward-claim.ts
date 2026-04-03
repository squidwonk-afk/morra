import type { SupabaseClient } from "@supabase/supabase-js";
import { T } from "@/lib/db/morra-prod-tables";
import { XP_REWARDS } from "@/lib/gamification";
import { createNotification } from "@/lib/notifications";
import { applyLevelUpRewards } from "@/lib/services/level-up-rewards";

const TWENTY_FOUR_H_MS = 24 * 60 * 60 * 1000;

function utcDateString(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

type ReserveOk = { success: true; previous_last: string | null };
type ReserveCooldown = { success: false; reason: "cooldown"; next_claim_at: string };
type ReserveNoRow = { success: false; reason: "no_row" };

function parseReserve(data: unknown): ReserveOk | ReserveCooldown | ReserveNoRow | null {
  if (data == null || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (o.success === true) {
    const pl = o.previous_last;
    return { success: true, previous_last: pl == null || pl === undefined ? null : String(pl) };
  }
  if (o.success === false && o.reason === "cooldown") {
    const n = o.next_claim_at;
    if (typeof n === "string") return { success: false, reason: "cooldown", next_claim_at: n };
  }
  if (o.success === false && o.reason === "no_row") {
    return { success: false, reason: "no_row" };
  }
  return null;
}

function nextClaimFromIso(claimedAtIso: string): string {
  const t = new Date(claimedAtIso).getTime();
  return new Date(t + TWENTY_FOUR_H_MS).toISOString();
}

async function revertReserve(supabase: SupabaseClient, userId: string, previousLast: string | null) {
  await supabase
    .from("user_dashboard_state")
    .update({ last_claimed_at: previousLast, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}

export type DailyRewardClaimSuccess = {
  xp: number;
  level: number;
  streak: number;
  xpGained: number;
  newXP: number;
  newLevel: number;
  newStreak: number;
  leveledUp: boolean;
  creditsGranted: number;
  nextClaimAt: string;
};

export type DailyRewardClaimFailure = {
  status: number;
  error: string;
  nextClaimAt?: string;
};

export async function claimDailyReward(
  supabase: SupabaseClient,
  userId: string
): Promise<DailyRewardClaimSuccess | DailyRewardClaimFailure> {
  const { data: raw, error: rpcErr } = await supabase.rpc("morra_try_daily_claim_reserve", {
    p_user_id: userId,
  });

  if (rpcErr) {
    return { status: 503, error: rpcErr.message || "Could not reserve daily claim." };
  }

  const reserved = parseReserve(raw);
  if (!reserved) {
    return { status: 500, error: "Invalid reserve response." };
  }

  if (!reserved.success) {
    if (reserved.reason === "no_row") {
      return { status: 404, error: "Dashboard state not found." };
    }
    const unlock = new Date(reserved.next_claim_at).toISOString();
    return {
      status: 409,
      error: "Daily reward is on cooldown.",
      nextClaimAt: unlock,
    };
  }

  const previousLast = reserved.previous_last;

  const { data: u, error: uErr } = await supabase
    .from(T.userXp)
    .select("xp, level, streak, last_active_date, last_claim_date")
    .eq("user_id", userId)
    .maybeSingle();

  if (uErr || !u) {
    await revertReserve(supabase, userId, previousLast);
    return { status: 404, error: "User XP not found." };
  }

  const xpGain = XP_REWARDS.DAILY_LOGIN;
  const oldXp = Number((u as { xp?: number }).xp ?? 0);
  const oldLevel = Number((u as { level?: number }).level ?? 1);
  const today = utcDateString();

  const { data: locked, error: upErr } = await supabase
    .from(T.userXp)
    .update({ xp: oldXp + xpGain, last_claim_date: today })
    .eq("user_id", userId)
    .select("xp, level")
    .maybeSingle();

  if (upErr || !locked) {
    await revertReserve(supabase, userId, previousLast);
    return { status: 500, error: "Could not apply XP." };
  }

  try {
    await supabase.from("reward_events").insert({
      user_id: userId,
      type: "daily_login",
      xp: xpGain,
      credits: 0,
    });
  } catch {
    /* optional audit */
  }

  const newXp = Number((locked as { xp?: number }).xp ?? oldXp + xpGain);
  const { creditsGranted, newLevel } = await applyLevelUpRewards(supabase, userId, newXp);

  const last = ((u as { last_active_date?: string | null }).last_active_date ?? null) as string | null;
  const prev = Number((u as { streak?: number }).streak ?? 0);
  let streak = prev;
  if (last !== today) {
    const y = new Date();
    y.setUTCDate(y.getUTCDate() - 1);
    const yesterday = y.toISOString().slice(0, 10);
    streak = last === yesterday ? prev + 1 : 1;
    await supabase.from(T.userXp).update({ streak, last_active_date: today }).eq("user_id", userId);
  }

  await createNotification(
    supabase,
    userId,
    "system",
    "Daily login",
    `Daily login claimed, +${xpGain} XP.`
  );

  const { data: snap } = await supabase
    .from("user_dashboard_state")
    .select("last_claimed_at")
    .eq("user_id", userId)
    .maybeSingle();
  const lastClaimedStr = (snap as { last_claimed_at?: string | null } | null)?.last_claimed_at;
  const nextClaimAt =
    typeof lastClaimedStr === "string" && lastClaimedStr
      ? nextClaimFromIso(lastClaimedStr)
      : new Date(Date.now() + TWENTY_FOUR_H_MS).toISOString();

  return {
    xp: newXp,
    level: newLevel,
    streak,
    xpGained: xpGain,
    newXP: newXp,
    newLevel,
    newStreak: streak,
    leveledUp: newLevel > oldLevel,
    creditsGranted,
    nextClaimAt,
  };
}
