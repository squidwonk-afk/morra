import { getSessionUserId } from "@/lib/auth/request-user";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { jsonError, jsonOk } from "@/lib/http";
import { getLeaderboardRows } from "@/lib/songwars/service";

export const runtime = "nodejs";

export async function GET() {
  if (!isSupabaseConfigured()) return jsonError("Server is not configured.", 503);
  const viewerUserId = await getSessionUserId();

  try {
    const rows = await getLeaderboardRows(getSupabaseAdmin(), 100);
    return jsonOk({ leaderboard: rows, viewerUserId: viewerUserId ?? undefined });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not load leaderboard.";
    return jsonError(msg, 500);
  }
}
