import { getSessionUserId } from "@/lib/auth/request-user";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

type ClaimDailyRow = {
  xp?: number;
  level?: number;
  streak?: number;
  new_xp?: number;
  new_level?: number;
  new_streak?: number;
};

function parseClaim(data: unknown): ClaimDailyRow | null {
  if (!data) return null;
  if (Array.isArray(data)) {
    const first = data[0];
    if (first && typeof first === "object") return first as ClaimDailyRow;
    return null;
  }
  if (typeof data === "object") return data as ClaimDailyRow;
  return null;
}

export async function POST() {
  if (!isSupabaseConfigured()) return jsonError("Server is not configured.", 503);
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized.", 401);

  const supabase = getSupabaseAdmin();
  for (const args of [{ user_id: userId }, { p_user_id: userId }] as const) {
    const { data, error } = await supabase.rpc("claim_daily_xp", args);
    if (error) continue;
    const parsed = parseClaim(data);
    if (!parsed) break;
    const xp = parsed.new_xp ?? parsed.xp ?? 0;
    const level = parsed.new_level ?? parsed.level ?? Math.floor(xp / 100) + 1;
    const streak = parsed.new_streak ?? parsed.streak ?? 0;
    return jsonOk({
      ok: true,
      xp,
      level,
      streak,
      newXP: xp,
      newLevel: level,
      newStreak: streak,
    });
  }

  return jsonError("Could not claim daily XP.", 409);
}
