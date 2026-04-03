import { NextRequest } from "next/server";
import { z } from "zod";
import { hashPin } from "@/lib/auth/pin";
import { morraSessionCookieBase } from "@/lib/auth/session-cookie";
import { signSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { ABUSE_MSG_RATE } from "@/lib/abuse/messages";
import { ensureDeviceId, getDeviceIdFromRequest, setDeviceCookieOnResponse } from "@/lib/abuse/device";
import { getClientIp } from "@/lib/abuse/request-ip";
import { SIGNUP_BONUS_CREDITS } from "@/lib/constants/credits";
import { T } from "@/lib/db/morra-prod-tables";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { displayNameSchema, pinSchema, referralCodeSchema, usernameSchema } from "@/lib/validation";
import { jsonError, jsonOk } from "@/lib/http";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";

const bodySchema = z.object({
  username: usernameSchema,
  displayName: displayNameSchema,
  pin: pinSchema,
  referralCode: referralCodeSchema,
  deviceId: z.string().max(128).optional(),
});

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return jsonError("Server is not configured with Supabase credentials.", 503);
  }

  const ip = getClientIp(req);
  const signupRl = checkRateLimit(`signup:hour:${ip}`, 5, 3_600_000);
  if (!signupRl.ok) {
    return jsonError(ABUSE_MSG_RATE, 429, { retryAfterMs: signupRl.retryAfterMs });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    const raw = await req.json();
    body = bodySchema.parse(raw);
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const { deviceId: generatedId, setCookie: needNewDeviceCookie } = ensureDeviceId(req);
  const cookieDevice = getDeviceIdFromRequest(req) ?? generatedId;
  const hinted = body.deviceId?.trim();
  if (hinted && hinted !== cookieDevice) {
    return jsonError(ABUSE_MSG_RATE, 400);
  }

  const supabase = getSupabaseAdmin();
  const username = body.username.toLowerCase();

  const { data: existing } = await supabase
    .from(T.profiles)
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (existing) {
    return jsonError("Username already taken.", 409);
  }

  let referredBy: string | null = null;

  if (body.referralCode) {
    const code = body.referralCode.toLowerCase();
    const { data: refUser } = await supabase
      .from(T.profiles)
      .select("id")
      .eq("username", code)
      .maybeSingle();
    if (refUser?.id) {
      referredBy = refUser.id as string;
    }
  }

  const pin_hash = await hashPin(body.pin);

  const ipSuspected = false;

  const displayName = body.displayName.trim();
  const referralCode = username;

  const insertPayload: Record<string, unknown> = {
    username,
    display_name: displayName,
    pin_hash,
    referral_code: referralCode,
  };
  if (referredBy) insertPayload.referred_by = referredBy;

  const ins = await supabase.from(T.profiles).insert(insertPayload).select("id").single();

  if (ins.error || !ins.data) {
    return jsonError(ins.error?.message ?? "Could not create user.", 400);
  }

  const userId = (ins.data as { id: string }).id;

  const syncPayload: Record<string, unknown> = {
    username,
    display_name: displayName,
    referral_code: referralCode,
  };
  if (referredBy) syncPayload.referred_by = referredBy;

  const { error: profileSyncErr } = await supabase.from(T.profiles).update(syncPayload).eq("id", userId);

  if (profileSyncErr) {
    await supabase.from(T.profiles).delete().eq("id", userId);
    return jsonError(profileSyncErr.message ?? "Could not finalize profile.", 400);
  }

  await supabase.from("user_xp").insert({
    user_id: userId,
    xp: 0,
    level: 1,
    streak: 0,
    last_active_date: null,
    last_claim_date: null,
  });

  await supabase.from("user_credits").insert({
    user_id: userId,
    credits: SIGNUP_BONUS_CREDITS,
  });

  if (referredBy && referredBy !== userId) {
    const { data: dupPair } = await supabase
      .from("referrals")
      .select("id")
      .eq("referrer_id", referredBy)
      .eq("referred_user_id", userId)
      .maybeSingle();

    if (!dupPair) {
      const { error: refInsErr } = await supabase.from("referrals").insert({
        referrer_id: referredBy,
        referred_user_id: userId,
        status: "pending",
        ip_suspected: ipSuspected,
      });
      if (!refInsErr) {
        await createNotification(
          supabase,
          referredBy,
          "referral",
          "New referral joined",
          `@${username} signed up using your referral link.`
        );
      }
    }
  }

  let token: string;
  try {
    token = await signSession(userId);
  } catch {
    return jsonError("Server session secret is not configured.", 500);
  }

  const res = jsonOk({ userId, username, referralCode: username });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    ...morraSessionCookieBase(),
    maxAge: 60 * 60 * 24 * 7,
  });
  if (needNewDeviceCookie) {
    setDeviceCookieOnResponse(res, cookieDevice);
  }
  return res;
}
