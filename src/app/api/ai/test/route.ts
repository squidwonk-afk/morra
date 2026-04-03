import type { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth/request-user";
import { MODELS } from "@/lib/ai/config";
import { callAI } from "@/lib/ai/openrouter-client";
import { getAiProvider } from "@/lib/ai/provider";
import { checkAiIpHourLimit } from "@/lib/abuse/ip-limits";
import { ABUSE_MSG_LIMIT, ABUSE_MSG_RATE } from "@/lib/abuse/messages";
import { isUserFlagged } from "@/lib/abuse/user-flag";
import { jsonError, jsonOk } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Smoke-test OpenRouter: simple prompt, server-side key only.
 */
export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("Unauthorized.", 401);
  }

  const supabase = getSupabaseAdmin();
  const flagged = await isUserFlagged(supabase, userId);
  if (flagged) {
    return jsonError(ABUSE_MSG_LIMIT, 403);
  }

  const aiIp = checkAiIpHourLimit(req);
  if (!aiIp.ok) {
    return jsonError(aiIp.message, 429);
  }

  const rl = checkRateLimit(`ai:test:${userId}`, 10, 60_000);
  if (!rl.ok) {
    return jsonError(ABUSE_MSG_RATE, 429);
  }

  const aiSpacing = checkRateLimit(`ai:user:${userId}`, 1, 3_000);
  if (!aiSpacing.ok) {
    return jsonError(ABUSE_MSG_LIMIT, 429);
  }

  if (getAiProvider() !== "openrouter") {
    return jsonError(
      "AI is in mock mode or OPENROUTER_API_KEY is missing.",
      503
    );
  }

  const result = await callAI({
    model: MODELS.cheap,
    messages: [{ role: "user", content: "Say hello from MORRA AI" }],
    max_tokens: 120,
  });

  if (!result.ok) {
    const status = result.error.includes("Missing OPENROUTER_API_KEY") ? 503 : 502;
    return jsonError(result.error, status);
  }

  return jsonOk({ message: result.content });
}
