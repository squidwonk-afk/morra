import type { NextRequest } from "next/server";

type HeadersLike = { get(name: string): string | null };

/**
 * Base URL for Stripe redirects and OAuth return URLs (no trailing slash).
 * Priority: NEXT_PUBLIC_APP_URL → VERCEL_URL → Origin → forwarded Host → localhost (dev only).
 */
export function appBaseUrlFromRequest(request: NextRequest | { headers: HeadersLike }): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}`;
  }

  const origin = request.headers.get("origin");
  if (origin) return origin.replace(/\/$/, "");

  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  if (host) {
    const h = host.split(",")[0]?.trim();
    if (h) return `${proto}://${h}`.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

/** Server-only fallback when no Request is available. */
export function appBaseUrlFromEnv(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}`;
  }

  return "http://localhost:3000";
}
