import { NextResponse } from "next/server";
import { morraSessionCookieBase } from "@/lib/auth/session-cookie";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    ...morraSessionCookieBase(),
    maxAge: 0,
  });
  return res;
}
