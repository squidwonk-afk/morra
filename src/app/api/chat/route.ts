import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth/request-user";
import { runAssistantChat } from "@/lib/ai";
import { ABUSE_MSG_LIMIT, ABUSE_MSG_RATE } from "@/lib/abuse/messages";
import { checkAiIpHourLimit } from "@/lib/abuse/ip-limits";
import { isUserFlagged } from "@/lib/abuse/user-flag";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { logMorraError } from "@/lib/logging";
import { jsonError, jsonOk } from "@/lib/http";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(4000),
});

export async function POST(req: NextRequest) {
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

  const rl = checkRateLimit(`chat:${userId}`, 60, 60_000);
  if (!rl.ok) {
    return jsonError(ABUSE_MSG_RATE, 429);
  }

  const aiSpacing = checkRateLimit(`ai:user:${userId}`, 1, 3_000);
  if (!aiSpacing.ok) {
    return jsonError(ABUSE_MSG_LIMIT, 429);
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return jsonError("Invalid message.", 400);
  }

  try {
    const reply = await runAssistantChat(body.message);
    const usesMock =
      process.env.AI_PROVIDER === "mock" || !process.env.OPENROUTER_API_KEY?.trim();
    return jsonOk({ reply, mock: usesMock });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Assistant unavailable";
    logMorraError("ai", "chat_route_failed", {
      userIdSuffix: userId.slice(-8),
      detail: msg,
    });
    return jsonError(msg, 502);
  }
}
