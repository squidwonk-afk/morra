import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { checkGlobalIpLimit } from "@/lib/abuse/ip-limits";
import { logMorraSessionCookieRead } from "@/lib/auth/session-cookie";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

/** Set on `/api/*` after JWT verify (incoming value is stripped first). */
export const MORRA_USER_ID_HEADER = "x-morra-user-id";

/**
 * - `/app`, `/app/*`: require valid `morra_session` → otherwise redirect to `/login?next=…` (no dashboard flash).
 * - `/api/*`: rate limits + optional x-morra-user-id from verified session.
 * Does not touch auth cookies (avoids logout/checkout loops).
 */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const isPublicSongWarsView =
    path === "/app/songwars" ||
    path === "/app/songwars/leaderboard" ||
    path.startsWith("/app/songwars/");

  if ((path === "/app" || path.startsWith("/app/")) && !isPublicSongWarsView) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await verifySessionToken(token);
    const readOutcome: "ok" | "missing" | "invalid" = session?.userId
      ? "ok"
      : !token?.trim()
        ? "missing"
        : "invalid";
    logMorraSessionCookieRead("middleware:/app", readOutcome);
    if (!session?.userId) {
      const login = new URL("/login", request.url);
      const dest = `${path}${request.nextUrl.search || ""}`;
      login.searchParams.set("next", dest);
      return NextResponse.redirect(login);
    }
    return NextResponse.next();
  }

  if (!path.startsWith("/api")) {
    return NextResponse.next();
  }
  if (path.startsWith("/api/stripe/webhook")) {
    return NextResponse.next();
  }
  if (path.startsWith("/api/webhooks/stripe")) {
    return NextResponse.next();
  }
  if (path.startsWith("/api/cron/")) {
    return NextResponse.next();
  }

  const g = checkGlobalIpLimit(request);
  if (!g.ok) {
    return NextResponse.json({ ok: false, error: g.message }, { status: 429 });
  }

  const headers = new Headers(request.headers);
  headers.delete(MORRA_USER_ID_HEADER);
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (session?.userId) {
    headers.set(MORRA_USER_ID_HEADER, session.userId);
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/app", "/app/:path*", "/api/:path*"],
};
