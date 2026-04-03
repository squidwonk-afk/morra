import { getSessionUserId } from "@/lib/auth/request-user";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { jsonError, jsonOk } from "@/lib/http";
import { isSongwarsUnavailableError } from "@/lib/songwars/availability";
import { joinSongwars, SongWarsNoActiveEventError } from "@/lib/songwars/service";

export const runtime = "nodejs";

export async function POST() {
  if (!isSupabaseConfigured()) return jsonError("Server is not configured.", 503);
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized.", 401);

  try {
    const result = await joinSongwars(getSupabaseAdmin(), userId);
    return jsonOk(result);
  } catch (e) {
    if (isSongwarsUnavailableError(e)) {
      return jsonError("Song Wars is not available yet.", 503);
    }
    if (e instanceof SongWarsNoActiveEventError) {
      return jsonError("No active Song Wars event yet.", 409);
    }
    const msg = e instanceof Error ? e.message : "Could not join.";
    return jsonError(msg, 400);
  }
}
