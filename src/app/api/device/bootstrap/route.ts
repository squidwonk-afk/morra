import type { NextRequest } from "next/server";
import { ensureDeviceId, setDeviceCookieOnResponse } from "@/lib/abuse/device";
import { jsonOk } from "@/lib/http";

export const runtime = "nodejs";

/** Ensures httpOnly device cookie; returns id for mirroring to localStorage (first visit). */
export async function GET(req: NextRequest) {
  const { deviceId, setCookie } = ensureDeviceId(req);
  const res = jsonOk({ deviceId });
  if (setCookie) {
    setDeviceCookieOnResponse(res, deviceId, req);
  }
  return res;
}
