import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyPin } from "@/lib/auth/pin";
import { logMorraSessionCookieSet, morraSessionCookieBase } from "@/lib/auth/session-cookie";
import { signSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getClientIp } from "@/lib/abuse/request-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { T } from "@/lib/db/morra-prod-tables";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { pinSchema, usernameSchema } from "@/lib/validation";
import { jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

const bodySchema = z.object({
  username: usernameSchema,
  pin: pinSchema,
});

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return jsonError("Server is not configured with Supabase credentials.", 503);
  }

  const ip = getClientIp(req);
  const rl = checkRateLimit(`login:${ip}`, 30, 60_000);
  if (!rl.ok) {
    return jsonError("Too many requests. Try again shortly.", 429, { retryAfterMs: rl.retryAfterMs });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const supabase = getSupabaseAdmin();
  const username = body.username.toLowerCase();

  const { data: user, error } = await supabase
    .from(T.profiles)
    .select("id, username, display_name, pin_hash")
    .eq("username", username)
    .maybeSingle();

  if (error || !user) {
    await new Promise((r) => setTimeout(r, 400));
    return jsonError("Invalid username or PIN.", 401);
  }

  const ok = await verifyPin(body.pin, user.pin_hash as string);
  if (!ok) {
    await new Promise((r) => setTimeout(r, 400));
    return jsonError("Invalid username or PIN.", 401);
  }

  let token: string;
  try {
    token = await signSession(user.id as string);
  } catch {
    return jsonError("Server session secret is not configured.", 500);
  }

  const maxAge = 60 * 60 * 24 * 7;
  const res = jsonOk({ userId: user.id });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    ...morraSessionCookieBase(req),
    maxAge,
  });
  // eslint-disable-next-line no-console
  console.log("SESSION SET");
  logMorraSessionCookieSet("login", req, { maxAgeSec: maxAge });
  return res;
}
