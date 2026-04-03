import { getSessionUserId } from "@/lib/auth/request-user";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { jsonError, jsonOk } from "@/lib/http";
import { getReferralEngagementPayload } from "@/lib/referral/growth-engine";

export const runtime = "nodejs";

export async function GET() {
  if (!isSupabaseConfigured()) return jsonError("Server is not configured.", 503);
  const userId = await getSessionUserId();

  try {
    const payload = await getReferralEngagementPayload(getSupabaseAdmin(), userId);
    return jsonOk({ ...payload, viewerUserId: userId ?? undefined });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not load referral engagement.";
    return jsonError(msg, 500);
  }
}
