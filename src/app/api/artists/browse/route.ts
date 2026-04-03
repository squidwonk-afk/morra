import type { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth/request-user";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { jsonError, jsonOk } from "@/lib/http";

const bodySchema = z.object({
  role: z.string().trim().min(1).max(40).optional().nullable(),
  style: z.string().trim().min(1).max(40).optional().nullable(),
  lookingFor: z.string().trim().min(1).max(40).optional().nullable(),
  limit: z.number().int().min(1).max(50).optional(),
});

function normalize(v: string | null | undefined): string | undefined {
  if (!v) return undefined;
  const t = v.trim().toLowerCase();
  return t.length > 0 ? t : undefined;
}

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return jsonError("Server is not configured.", 503);
  }

  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized.", 401);

  let body: z.infer<typeof bodySchema>;
  try {
    const raw = await req.json();
    body = bodySchema.parse(raw ?? {});
  } catch {
    body = bodySchema.parse({});
  }

  const role = normalize(body.role ?? undefined);
  const style = normalize(body.style ?? undefined);
  const lookingFor = normalize(body.lookingFor ?? undefined);
  const limit = body.limit ?? 24;

  const supabase = getSupabaseAdmin();

  let q = supabase
    .from("artist_profiles")
    .select("id,user_id,username,bio,role,styles,looking_for,created_at")
    .neq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (role) q = q.eq("role", role);
  if (style) q = q.contains("styles", [style]);
  if (lookingFor) q = q.contains("looking_for", [lookingFor]);

  const { data: profiles, error: pErr } = await q;
  if (pErr) {
    return jsonError("Could not load artists.", 500);
  }

  const userIds = (profiles ?? []).map((p) => p.user_id as string);

  type UserMini = {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };

  let usersById: Record<string, UserMini> = {};
  if (userIds.length) {
    const { data: urows } = await supabase
      .from("profiles")
      .select("id,username,display_name,avatar_url")
      .in("id", userIds);
    usersById = (urows ?? []).reduce((acc, row) => {
      const r = row as unknown as UserMini;
      acc[r.id] = r;
      return acc;
    }, {} as Record<string, UserMini>);
  }

  type SocialRow = {
    user_id: string;
    instagram: string | null;
    tiktok: string | null;
    soundcloud: string | null;
    spotify: string | null;
  };

  let socialsByUserId: Record<string, SocialRow> = {};
  if (userIds.length) {
    const { data: socialsRows } = await supabase
      .from("artist_socials")
      .select("user_id,instagram,tiktok,soundcloud,spotify")
      .in("user_id", userIds);

    socialsByUserId = (socialsRows ?? []).reduce(
      (acc, row) => {
        const r = row as unknown as SocialRow;
        acc[r.user_id] = r;
        return acc;
      },
      {} as Record<string, SocialRow>
    );
  }

  return jsonOk({
    artists: (profiles ?? []).map((p) => {
      const socials = socialsByUserId[p.user_id as string] ?? null;
      const u = usersById[p.user_id as string] ?? null;
      return {
        id: p.id as string,
        userId: p.user_id as string,
        username: (u?.username as string | null) ?? (p.username as string | null),
        display_name: (u?.display_name as string | null) ?? null,
        avatar_url: (u?.avatar_url as string | null) ?? null,
        bio: (p.bio as string | null) ?? "",
        role: (p.role as string | null) ?? "",
        styles: (p.styles as string[] | null) ?? [],
        lookingFor: (p.looking_for as string[] | null) ?? [],
        socials: socials
          ? {
              instagram: (socials.instagram as string | null) ?? "",
              tiktok: (socials.tiktok as string | null) ?? "",
              soundcloud: (socials.soundcloud as string | null) ?? "",
              spotify: (socials.spotify as string | null) ?? "",
            }
          : { instagram: "", tiktok: "", soundcloud: "", spotify: "" },
      };
    }),
  });
}

