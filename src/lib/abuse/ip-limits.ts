import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/abuse/request-ip";
import { ABUSE_MSG_RATE } from "@/lib/abuse/messages";

/** Max 10 HTTP requests per minute per IP (global API traffic). */
export function checkGlobalIpLimit(req: NextRequest): { ok: true } | { ok: false; message: string } {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`ip:global:${ip}`, 10, 60_000);
  if (!rl.ok) return { ok: false, message: ABUSE_MSG_RATE };
  return { ok: true };
}

/** Max 50 AI-class requests per hour per IP (tools, /api/ai/*, chat). */
export function checkAiIpHourLimit(req: NextRequest): { ok: true } | { ok: false; message: string } {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`ip:ai:${ip}`, 50, 3_600_000);
  if (!rl.ok) return { ok: false, message: ABUSE_MSG_RATE };
  return { ok: true };
}
