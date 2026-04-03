import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { logMorraSessionCookieCleared, morraSessionCookieBase } from "@/lib/auth/session-cookie";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    ...morraSessionCookieBase(req),
    maxAge: 0,
  });
  logMorraSessionCookieCleared("logout", req);
  return res;
}
