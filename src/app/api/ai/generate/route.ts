import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth/request-user";
import { isDuplicateAiRequest } from "@/lib/ai/dedupe";
import { generateAI } from "@/lib/ai/generate-ai";
import type { AIJobType } from "@/lib/ai/config";
import { getAiProvider } from "@/lib/ai/provider";
import { ABUSE_MSG_LIMIT, ABUSE_MSG_RATE } from "@/lib/abuse/messages";
import { checkAiIpHourLimit } from "@/lib/abuse/ip-limits";
import { isUserFlagged } from "@/lib/abuse/user-flag";
import { jsonError, jsonOk } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { logMorraError } from "@/lib/logging";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const jobTypes = [
  "bio",
  "captions",
  "rollout",
  "lyrics_basic",
  "lyrics_advanced",
  "cover",
  "collab",
  "assistant",
] as const satisfies readonly AIJobType[];

const bodySchema = z.object({
  type: z.enum(jobTypes),
  data: z.record(z.string(), z.unknown()),
});

function dedupeKey(userId: string, type: string, data: Record<string, unknown>): string {
  const h = createHash("sha256")
    .update(`${userId}|${type}|${JSON.stringify(data)}`)
    .digest("hex")
    .slice(0, 48);
  return `${userId}:${h}`;
}

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

  const rl = checkRateLimit(`ai:generate:${userId}`, 30, 60_000);
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
    return jsonError("Invalid body. Expected { type, data }.", 400);
  }

  if (getAiProvider() !== "openrouter") {
    return jsonError(
      "AI is in mock mode. Set OPENROUTER_API_KEY (and optionally unset AI_PROVIDER=mock).",
      503
    );
  }

  const key = dedupeKey(userId, body.type, body.data);
  if (isDuplicateAiRequest(key)) {
    return jsonError("Duplicate request. Wait a moment before retrying.", 429);
  }

  try {
    const output = await generateAI({ type: body.type, input: body.data });
    return jsonOk({ output });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI request failed";
    logMorraError("ai", "generate_route_failed", {
      userIdSuffix: userId.slice(-8),
      detail: msg,
    });
    return jsonError(msg, 502);
  }
}
