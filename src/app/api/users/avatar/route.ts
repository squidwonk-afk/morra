import type { NextRequest } from "next/server";
import sharp from "sharp";
import { getSessionUserId } from "@/lib/auth/request-user";
import { T } from "@/lib/db/morra-prod-tables";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) return jsonError("Server is not configured.", 503);
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized.", 401);

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Missing file.", 400);

  if (!ALLOWED.has(file.type)) {
    return jsonError("Invalid file type. Use JPG, PNG, or WEBP.", 400);
  }
  if (file.size > MAX_BYTES) {
    return jsonError("File too large. Max 2MB.", 400);
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  let webp: Buffer;
  try {
    webp = await sharp(bytes)
      .rotate()
      .resize(512, 512, { fit: "cover" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return jsonError("Could not process image.", 400);
  }

  const supabase = getSupabaseAdmin();
  const filename = `${userId}_${Date.now()}.webp`;

  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(filename, webp, {
      contentType: "image/webp",
      upsert: true,
      cacheControl: "3600",
    });
  if (upErr) return jsonError(upErr.message, 400);

  const pub = supabase.storage.from("avatars").getPublicUrl(filename);
  const avatarUrl = pub.data.publicUrl;

  const { error: dbErr } = await supabase.from("artist_profiles").upsert(
    { user_id: userId, avatar_url: avatarUrl },
    { onConflict: "user_id" }
  );
  if (dbErr) return jsonError(dbErr.message, 400);

  const profUp = await supabase
    .from(T.profiles)
    .update({ avatar_url: avatarUrl })
    .eq("id", userId);
  if (profUp.error && !/column .* does not exist|schema cache/i.test(profUp.error.message ?? "")) {
    return jsonError(profUp.error.message, 400);
  }

  return jsonOk({ success: true, avatarUrl });
}

export async function DELETE() {
  if (!isSupabaseConfigured()) return jsonError("Server is not configured.", 503);
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized.", 401);

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("artist_profiles")
    .upsert({ user_id: userId, avatar_url: null }, { onConflict: "user_id" });
  if (error) return jsonError(error.message, 400);

  await supabase.from(T.profiles).update({ avatar_url: null }).eq("id", userId);

  return jsonOk({ success: true, avatarUrl: null });
}
