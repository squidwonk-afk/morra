import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth/request-user";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

const putSchema = z.object({
  artist_name: z.string().trim().max(120).optional().nullable(),
  genres: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  inspirations: z.string().trim().max(2000).optional().nullable(),
  goals: z.string().trim().max(2000).optional().nullable(),
});

export async function GET() {
  if (!isSupabaseConfigured()) return jsonError("Server is not configured.", 503);
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized.", 401);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_profiles_extended")
    .select("artist_name, genres, inspirations, goals, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error && !/relation|does not exist/i.test(error.message)) {
    return jsonError(error.message, 500);
  }
  return jsonOk({ extended: data ?? null });
}

export async function PUT(req: NextRequest) {
  if (!isSupabaseConfigured()) return jsonError("Server is not configured.", 503);
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized.", 401);

  let body: z.infer<typeof putSchema>;
  try {
    body = putSchema.parse(await req.json());
  } catch {
    return jsonError("Invalid body.", 400);
  }

  const supabase = getSupabaseAdmin();
  const row = {
    user_id: userId,
    artist_name: body.artist_name ?? null,
    genres: body.genres ?? [],
    inspirations: body.inspirations ?? null,
    goals: body.goals ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("user_profiles_extended")
    .upsert(row, { onConflict: "user_id" })
    .select("artist_name, genres, inspirations, goals, updated_at")
    .single();
  if (error) return jsonError(error.message, 500);
  return jsonOk({ extended: data });
}
