import { getSessionUserId } from "@/lib/auth/request-user";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { jsonError, jsonOk } from "@/lib/http";
import { ensureActiveEvent, getSongWarInsightsForUser } from "@/lib/songwars/service";

export const runtime = "nodejs";

export async function GET() {
  if (!isSupabaseConfigured()) return jsonError("Server is not configured.", 503);
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized.", 401);

  try {
    const supabase = getSupabaseAdmin();
    const event = await ensureActiveEvent(supabase);
    const insights = await getSongWarInsightsForUser(supabase, userId, event.id as string);
    return jsonOk({ insights });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not load insights.";
    return jsonError(msg, 500);
  }
}
