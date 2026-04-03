import type { NextRequest } from "next/server";

/**
 * Whether the session cookie should use the Secure flag.
 * - Never Secure on non-production (local http:// dev servers).
 * - In production: follow the incoming request (x-forwarded-proto / URL), or trust Vercel (always HTTPS).
 * Setting Secure=true while the user is on http:// (e.g. `next start` on localhost) causes the browser to
 * reject Set-Cookie, so login appears to succeed but the session never sticks.
 */
export function resolveCookieSecure(req?: NextRequest): boolean {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }
  if (req) {
    const forwarded = req.headers.get("x-forwarded-proto");
    if (forwarded) {
      return forwarded.split(",")[0]?.trim() === "https";
    }
    return req.nextUrl.protocol === "https:";
  }
  if (process.env.VERCEL === "1") {
    return true;
  }
  return false;
}

/**
 * morra_session options: stable path, no domain (works on Vercel apex and preview URLs).
 * `secure` follows the request protocol in production (see resolveCookieSecure).
 */
export function morraSessionCookieBase(req?: NextRequest) {
  const secure = resolveCookieSecure(req);
  return {
    httpOnly: true as const,
    secure,
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
