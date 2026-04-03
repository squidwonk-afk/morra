import type { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth/request-user";
import { ABUSE_MSG_LIMIT, ABUSE_MSG_RATE } from "@/lib/abuse/messages";
import { checkAiIpHourLimit } from "@/lib/abuse/ip-limits";
import { getClientIp } from "@/lib/abuse/request-ip";
import { isUserFlagged } from "@/lib/abuse/user-flag";
import type { ToolKey } from "@/lib/constants/credits";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { runToolGeneration } from "@/lib/services/generation-flow";
import { recordToolHitLimit } from "@/lib/conversion/track";
import { jsonError, jsonOk } from "@/lib/http";

export async function runAuthedTool(req: NextRequest, tool: ToolKey) {
  if (!isSupabaseConfigured()) {
    return jsonError("Server is not configured.", 503);
  }
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

  const rl = checkRateLimit(`tool:${userId}:${tool}`, 40, 60_000);
  if (!rl.ok) {
    return jsonError(ABUSE_MSG_RATE, 429);
  }

  const aiSpacing = checkRateLimit(`ai:user:${userId}`, 1, 3_000);
  if (!aiSpacing.ok) {
    return jsonError(ABUSE_MSG_LIMIT, 429);
  }

  let input: Record<string, unknown> = {};
  try {
    const raw = await req.json();
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      input = raw as Record<string, unknown>;
    }
  } catch {
    input = {};
  }

  const ip = getClientIp(req);

  try {
    const result = await runToolGeneration(getSupabaseAdmin(), userId, tool, input, {
      ip,
      deviceId: null,
    });
    return jsonOk({ result });
  } catch (e) {
    const err = e as Error & { code?: string };
    if (err.code === "FREE_TIER_LIMIT") {
      await recordToolHitLimit(supabase, userId, "free_tier_limit");
      return jsonError(
        "You've used your free generation for this window. Add credits or upgrade to continue.",
        402,
        { reason: "free_tier_limit" }
      );
    }
    if (err.code === "INSUFFICIENT_CREDITS" || err.message === "INSUFFICIENT_CREDITS") {
      await recordToolHitLimit(supabase, userId, "insufficient_credits");
      // Contract: callers expect a stable machine-readable error.
      return jsonError("INSUFFICIENT_CREDITS", 402, { reason: "insufficient_credits" });
    }
    if (
      err.code === "FLAGGED" ||
      err.code === "GENERATION_SPACING" ||
      err.code === "DUPLICATE_GENERATION"
    ) {
      return jsonError(ABUSE_MSG_LIMIT, 429);
    }
    return jsonError(err.message || "Generation failed.", 400);
  }
}
