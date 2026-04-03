import type { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth/request-user";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { jsonError, jsonOk } from "@/lib/http";

function normalizeTokenArray(tokens: string[] | undefined): string[] {
  if (!tokens) return [];
  return tokens
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0)
    .slice(0, 50);
}

function optionalNull(v: string | undefined | null): string | null | undefined {
  if (v === undefined) return undefined;
  const t = String(v).trim();
  return t.length === 0 ? null : t;
}

const putBodySchema = z.object({
  role: z.string().trim().min(1).max(40).optional(),
  styles: z.array(z.string().trim().min(1).max(40)).optional(),
  lookingFor: z.array(z.string().trim().min(1).max(40)).optional(),
  bio: z.string().trim().max(1000).optional(),
  instagram: z.string().trim().max(200).optional(),
  tiktok: z.string().trim().max(200).optional(),
  soundcloud: z.string().trim().max(200).optional(),
  spotify: z.string().trim().max(200).optional(),
});

export async function GET() {
  if (!isSupabaseConfigured()) {
    return jsonError("Server is not configured.", 503);
  }

  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized.", 401);

  const supabase = getSupabaseAdmin();

  const { data: userRow } = await supabase
    .from("profiles")
    .select("username,display_name,avatar_url")
    .eq("id", userId)
    .single();

  const { data: profileRow } = await supabase
    .from("artist_profiles")
    .select("id,user_id,username,bio,role,styles,looking_for,created_at")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: socialsRow } = await supabase
    .from("artist_socials")
    .select("id,user_id,instagram,tiktok,soundcloud,spotify")
    .eq("user_id", userId)
    .maybeSingle();

  return jsonOk({
    profile: profileRow
      ? {
          id: profileRow.id as string,
          username: (userRow?.username as string | null) ?? (profileRow.username as string | null),
          display_name: (userRow?.display_name as string | null) ?? null,
          avatar_url: (userRow?.avatar_url as string | null) ?? null,
          bio: (profileRow.bio as string | null) ?? "",
          role: (profileRow.role as string | null) ?? "",
          styles: (profileRow.styles as string[] | null) ?? [],
          lookingFor: (profileRow.looking_for as string[] | null) ?? [],
          createdAt: profileRow.created_at as string,
        }
      : null,
    socials: socialsRow
      ? {
          id: socialsRow.id as string,
          instagram: (socialsRow.instagram as string | null) ?? "",
          tiktok: (socialsRow.tiktok as string | null) ?? "",
          soundcloud: (socialsRow.soundcloud as string | null) ?? "",
          spotify: (socialsRow.spotify as string | null) ?? "",
        }
      : null,
  });
}

export async function PUT(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return jsonError("Server is not configured.", 503);
  }

  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized.", 401);

  let body: z.infer<typeof putBodySchema>;
  try {
    const raw = await req.json();
    body = putBodySchema.parse(raw);
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const supabase = getSupabaseAdmin();

  const { data: userRow } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .single();

  if (!userRow) return jsonError("User not found.", 404);

  const role = body.role ? body.role.trim().toLowerCase() : null;
  const styles = normalizeTokenArray(body.styles);
  const lookingFor = normalizeTokenArray(body.lookingFor);
  const bio = body.bio?.trim() ?? null;

  // Upsert artist profile (one per user).
  await supabase.from("artist_profiles").upsert(
    {
      user_id: userId,
      username: userRow.username as string,
      role,
      styles,
      looking_for: lookingFor,
      bio,
    },
    { onConflict: "user_id" }
  );

  // Upsert socials (one per user).
  await supabase.from("artist_socials").upsert(
    {
      user_id: userId,
      instagram: optionalNull(body.instagram),
      tiktok: optionalNull(body.tiktok),
      soundcloud: optionalNull(body.soundcloud),
      spotify: optionalNull(body.spotify),
    },
    { onConflict: "user_id" }
  );

  return jsonOk({ ok: true });
}

export async function DELETE() {
  if (!isSupabaseConfigured()) {
    return jsonError("Server is not configured.", 503);
  }

  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized.", 401);

  const supabase = getSupabaseAdmin();

  // Privacy-first: removing profile removes discoverability; socials removed too.
  await supabase.from("artist_socials").delete().eq("user_id", userId);
  await supabase.from("artist_profiles").delete().eq("user_id", userId);

  return jsonOk({ ok: true });
}

