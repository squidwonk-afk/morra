import type { NextRequest } from "next/server";

/**
 * Session cookie `Secure` flag: `true` when NODE_ENV is production.
 * Set `MORRA_SESSION_INSECURE_COOKIES=1` if you run `next start` on http:// (browser rejects Secure cookies on plain HTTP).
 * Never set `domain` on morra_session (host-only cookie; works on Vercel apex and previews).
 */
export function morraSessionSecureFlag(): boolean {
  if (process.env.MORRA_SESSION_INSECURE_COOKIES === "1") return false;
  return process.env.NODE_ENV === "production";
}

/**
 * morra_session options: stable path, no domain.
 */
export function morraSessionCookieBase(_req?: NextRequest) {
  return {
    httpOnly: true as const,
    secure: morraSessionSecureFlag(),
    sameSite: "lax" as const,
    path: "/",
  };
}

const SESSION_DEBUG =
  process.env.NODE_ENV === "development" || process.env.MORRA_SESSION_DEBUG === "1";

/** Dev / explicit debug: log when Set-Cookie is applied for morra_session. */
export function logMorraSessionCookieSet(
  context: string,
  req: NextRequest,
  opts: { maxAgeSec: number }
): void {
  if (!SESSION_DEBUG) return;
  const base = morraSessionCookieBase(req);
  // eslint-disable-next-line no-console
  console.info(
    `[morra_session] set (${context}) path=${base.path} sameSite=${base.sameSite} secure=${base.secure} httpOnly=${base.httpOnly} maxAge=${opts.maxAgeSec}s proto=${req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol}`
  );
}

/** Dev / explicit debug: log cookie read outcome (avoid logging token contents). */
export function logMorraSessionCookieRead(
  source: string,
  outcome: "ok" | "missing" | "invalid"
): void {
  if (!SESSION_DEBUG) return;
  // eslint-disable-next-line no-console
  console.info(`[morra_session] read (${source}): ${outcome}`);
}

/** Dev / explicit debug: log when the session cookie is cleared (logout). */
export function logMorraSessionCookieCleared(context: string, req: NextRequest): void {
  if (!SESSION_DEBUG) return;
  const base = morraSessionCookieBase(req);
  // eslint-disable-next-line no-console
  console.info(
    `[morra_session] cleared (${context}) path=${base.path} secure=${base.secure} proto=${req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol}`
  );
}
