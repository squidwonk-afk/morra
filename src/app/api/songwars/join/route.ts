import { getSessionUserId } from "@/lib/auth/request-user";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { jsonError, jsonOk } from "@/lib/http";
import { joinSongwars } from "@/lib/songwars/service";

export const runtime = "nodejs";

export async function POST() {
  if (!isSupabaseConfigured()) return jsonError("Server is not configured.", 503);
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized.", 401);

  try {
    const result = await joinSongwars(getSupabaseAdmin(), userId);
    return jsonOk(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not join.";
    return jsonError(msg, 400);
  }
}
