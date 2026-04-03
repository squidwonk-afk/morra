"use client";

import { useEffect } from "react";
import { DEVICE_LOCALSTORAGE_KEY } from "@/lib/abuse/device-constants";

/**
 * Syncs server device cookie with localStorage so signup can send a matching hint
 * (server still trusts the httpOnly cookie).
 */
export function DeviceBootstrap() {
  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/device/bootstrap", { credentials: "include" });
        if (!r.ok) return;
        const j = (await r.json()) as { deviceId?: string };
        if (j.deviceId && typeof window !== "undefined") {
          try {
            localStorage.setItem(DEVICE_LOCALSTORAGE_KEY, j.deviceId);
          } catch {
            /* storage blocked */
          }
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);
  return null;
}
