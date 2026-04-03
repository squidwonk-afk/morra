import { cookies } from "next/headers";
import { logMorraSessionCookieRead } from "@/lib/auth/session-cookie";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  const v = await verifySessionToken(token);
  const outcome: "ok" | "missing" | "invalid" = v?.userId
    ? "ok"
    : !token || !token.trim()
      ? "missing"
      : "invalid";
  logMorraSessionCookieRead("getSessionUserId", outcome);
  return v?.userId ?? null;
}
