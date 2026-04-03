import { getSessionUserId } from "@/lib/auth/request-user";
import { claimDailyReward } from "@/lib/gamification/daily-reward-claim";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

export async function POST() {
  if (!isSupabaseConfigured()) return jsonError("Server is not configured.", 503);
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized.", 401);

  const result = await claimDailyReward(getSupabaseAdmin(), userId);
  if ("error" in result) {
    return jsonError(
      result.error,
      result.status,
      result.nextClaimAt ? { nextClaimAt: result.nextClaimAt } : undefined
    );
  }

  return jsonOk({ ...result });
}
