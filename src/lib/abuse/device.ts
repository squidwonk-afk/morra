import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { DEVICE_COOKIE_NAME } from "@/lib/abuse/device-constants";
import { resolveCookieSecure } from "@/lib/auth/session-cookie";

export { DEVICE_COOKIE_NAME, DEVICE_LOCALSTORAGE_KEY } from "@/lib/abuse/device-constants";

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 400; // ~13 months

export function getDeviceIdFromRequest(req: NextRequest): string | null {
  const v = req.cookies.get(DEVICE_COOKIE_NAME)?.value?.trim();
  return v && v.length > 0 ? v : null;
}

export function setDeviceCookieOnResponse(
  res: NextResponse,
  deviceId: string,
  req?: NextRequest
): void {
  res.cookies.set(DEVICE_COOKIE_NAME, deviceId, {
    httpOnly: true,
    secure: resolveCookieSecure(req),
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SEC,
  });
}

export function ensureDeviceId(req: NextRequest): { deviceId: string; setCookie: boolean } {
  const existing = getDeviceIdFromRequest(req);
  if (existing) return { deviceId: existing, setCookie: false };
  return { deviceId: randomUUID(), setCookie: true };
}
