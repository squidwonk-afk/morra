import { NextRequest } from "next/server";
import { z } from "zod";
import { hashPin, verifyPin } from "@/lib/auth/pin";
import { getSessionUserId } from "@/lib/auth/request-user";
import { checkRateLimit } from "@/lib/rate-limit";
import { T } from "@/lib/db/morra-prod-tables";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { displayNameSchema, pinSchema, usernameSchema } from "@/lib/validation";
import { jsonError, jsonOk } from "@/lib/http";

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("username"),
    username: usernameSchema,
  }),
  z.object({
    action: z.literal("display_name"),
    displayName: displayNameSchema,
  }),
  z.object({
    action: z.literal("pin"),
    currentPin: pinSchema,
    newPin: pinSchema,
  }),
  z.object({
    action: z.literal("avatar_url"),
    avatarUrl: z.union([z.string().url().max(2048), z.literal("")]),
  }),
]);

export async function PATCH(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return jsonError("Server is not configured.", 503);
  }
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("Unauthorized.", 401);
  }

  const rl = checkRateLimit(`settings:${userId}`, 40, 60_000);
  if (!rl.ok) {
    return jsonError("Too many requests.", 429);
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return jsonError("Invalid body.", 400);
  }

  const supabase = getSupabaseAdmin();

  switch (body.action) {
    case "username": {
      const username = body.username.toLowerCase();
      const { data: clash } = await supabase
        .from(T.profiles)
        .select("id")
        .eq("username", username)
        .neq("id", userId)
        .maybeSingle();
      if (clash) {
        return jsonError("Username already taken.", 409);
      }
      const { error } = await supabase.from(T.profiles).update({ username }).eq("id", userId);
      if (error) return jsonError(error.message, 400);
      return jsonOk({ updated: "username" });
    }
    case "display_name": {
      const { error } = await supabase
        .from(T.profiles)
        .update({ display_name: body.displayName.trim() })
        .eq("id", userId);
      if (error) return jsonError(error.message, 400);
      return jsonOk({ updated: "display_name" });
    }
    case "avatar_url": {
      const url = body.avatarUrl.trim();
      if (!url) {
        await supabase
          .from("artist_profiles")
          .upsert({ user_id: userId, avatar_url: null }, { onConflict: "user_id" });
        const p0 = await supabase.from(T.profiles).update({ avatar_url: null }).eq("id", userId);
        if (p0.error && !/column .* does not exist|schema cache/i.test(p0.error.message ?? "")) {
          return jsonError(p0.error.message, 400);
        }
        return jsonOk({ updated: "avatar_url" });
      }
      await supabase
        .from("artist_profiles")
        .upsert({ user_id: userId, avatar_url: url }, { onConflict: "user_id" });
      const p1 = await supabase.from(T.profiles).update({ avatar_url: url }).eq("id", userId);
      if (p1.error && !/column .* does not exist|schema cache/i.test(p1.error.message ?? "")) {
        return jsonError(p1.error.message, 400);
      }
      return jsonOk({ updated: "avatar_url" });
    }
    case "pin": {
      const { data: user, error: uerr } = await supabase
        .from(T.profiles)
        .select("pin_hash")
        .eq("id", userId)
        .single();
      if (uerr || !user) {
        return jsonError("User not found.", 404);
      }
      const pinOk = await verifyPin(body.currentPin, user.pin_hash as string);
      if (!pinOk) {
        return jsonError("Current PIN is incorrect.", 403);
      }
      const pin_hash = await hashPin(body.newPin);
      const { error } = await supabase.from(T.profiles).update({ pin_hash }).eq("id", userId);
      if (error) return jsonError(error.message, 400);
      return jsonOk({ updated: "pin" });
    }
    default:
      return jsonError("Unsupported action.", 400);
  }
}
