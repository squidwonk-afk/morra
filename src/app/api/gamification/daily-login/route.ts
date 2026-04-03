import { getSessionUserId } from "@/lib/auth/request-user";
import { T } from "@/lib/db/morra-prod-tables";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { jsonError, jsonOk } from "@/lib/http";
import { XP_REWARDS } from "@/lib/gamification";
import { applyLevelUpRewards } from "@/lib/services/level-up-rewards";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";

function utcDateString(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

type RpcDailyResult = {
  xp?: number;
  level?: number;
  streak?: number;
  new_xp?: number;
  new_level?: number;
  new_streak?: number;
};

function parseRpcPayload(data: unknown): RpcDailyResult | null {
  if (data == null) return null;
  if (Array.isArray(data) && data[0] && typeof data[0] === "object") {
    return data[0] as RpcDailyResult;
  }
  if (typeof data === "object") {
    return data as RpcDailyResult;
  }
  return null;
}

export async function POST() {
  if (!isSupabaseConfigured()) return jsonError("Server is not configured.", 503);
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized.", 401);

  const supabase = getSupabaseAdmin();

  for (const args of [{ user_id: userId }, { p_user_id: userId }] as const) {
    const { data: rpcData, error: rpcErr } = await supabase.rpc("claim_daily_xp", args);
    if (!rpcErr) {
      const parsed = parseRpcPayload(rpcData);
      if (parsed && (parsed.xp != null || parsed.level != null || parsed.streak != null)) {
        const xpv = parsed.new_xp ?? parsed.xp ?? 0;
        const lv = parsed.new_level ?? parsed.level ?? 1;
        const st = parsed.new_streak ?? parsed.streak ?? 0;
        return jsonOk({
          ok: true,
          xp: xpv,
          level: lv,
          streak: st,
          xpGained: XP_REWARDS.DAILY_LOGIN,
          newXP: xpv,
          newLevel: lv,
          newStreak: st,
          leveledUp: false,
          creditsGranted: 0,
          source: "rpc",
        });
      }
    }
  }

  const today = utcDateString();
  const { data: u, error: uErr } = await supabase
    .from(T.userXp)
    .select("xp, level, streak, last_active_date, last_claim_date")
    .eq("user_id", userId)
    .single();
  if (uErr || !u) return jsonError("User not found.", 404);

  const lastClaim = ((u as { last_claim_date?: string | null }).last_claim_date ?? null) as string | null;
  if (lastClaim === today) return jsonError("Already claimed today.", 409);

  const xp = XP_REWARDS.DAILY_LOGIN;
  const oldXp = Number((u as { xp?: number | null }).xp ?? 0);

  const { data: locked } = await supabase
    .from(T.userXp)
    .update({ xp: oldXp + xp, last_claim_date: today })
    .eq("user_id", userId)
    .neq("last_claim_date", today)
    .select("xp, level")
    .maybeSingle();
  if (!locked) return jsonError("Already claimed today.", 409);

  try {
    await supabase.from("reward_events").insert({
      user_id: userId,
      type: "daily_login",
      xp,
      credits: 0,
    });
  } catch {
    /* optional */
  }

  const newXp = Number((locked as { xp?: number | null }).xp ?? oldXp + xp);
  const { creditsGranted, newLevel } = await applyLevelUpRewards(supabase, userId, newXp);

  const last = ((u as { last_active_date?: string | null }).last_active_date ?? null) as string | null;
  const prev = Number((u as { streak?: number | null }).streak ?? 0);
  let streak = prev;
  if (last !== today) {
    const y = new Date();
    y.setUTCDate(y.getUTCDate() - 1);
    const yesterday = y.toISOString().slice(0, 10);
    streak = last === yesterday ? prev + 1 : 1;
    await supabase
      .from(T.userXp)
      .update({ streak, last_active_date: today })
      .eq("user_id", userId);
  }

  await createNotification(
    supabase,
    userId,
    "system",
    "Daily login",
    `Daily login claimed, +${xp} XP.`
  );

  return jsonOk({
    ok: true,
    xp: newXp,
    level: newLevel,
    streak,
    xpGained: xp,
    newXP: newXp,
    newLevel,
    newStreak: streak,
    leveledUp: newLevel > Number((u as { level?: number | null }).level ?? 1),
    creditsGranted,
    source: "fallback",
  });
}
