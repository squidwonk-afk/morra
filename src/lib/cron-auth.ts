import type { NextRequest } from "next/server";

/**
 * Secures cron routes: set CRON_SECRET in env, send
 * `Authorization: Bearer <CRON_SECRET>` or header `x-cron-secret: <CRON_SECRET>`.
 */
export function verifyCronRequest(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  return req.headers.get("x-cron-secret") === secret;
}
