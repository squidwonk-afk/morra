import type { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth/request-user";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { jsonError, jsonOk } from "@/lib/http";

const bodySchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(3000).optional().nullable(),
  price: z.union([z.number().nonnegative(), z.string().trim().min(1).max(80)]),
  contactInfo: z.string().trim().max(500).optional().nullable(),
});

function priceToText(price: z.infer<typeof bodySchema>["price"]): string {
  if (typeof price === "number") return String(price);
  return price.trim();
}

export async function GET(_req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return jsonError("Server is not configured.", 503);
  }

  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized.", 401);

  const supabase = getSupabaseAdmin();

  const { data: services, error: sErr } = await supabase
    .from("artist_services")
    .select("id,user_id,title,description,price,contact_info")
    .order("id", { ascending: false })
    .limit(50);

  if (sErr) return jsonError("Could not load services.", 500);

  const userIds = [...new Set((services ?? []).map((s) => s.user_id as string))];

  type UserMini = { id: string; username: string | null };
  let usersById: Record<string, UserMini> = {};
  if (userIds.length) {
    const { data: usersRows } = await supabase.from("profiles").select("id,username").in("id", userIds);
    usersById = (usersRows ?? []).reduce((acc, row) => {
      const r = row as unknown as UserMini;
      acc[r.id] = r;
      return acc;
    }, {} as Record<string, UserMini>);
  }

  return jsonOk({
    services: (services ?? []).map((s) => {
      const u = usersById[s.user_id as string] ?? null;
      return {
        id: s.id as string,
        userId: s.user_id as string,
        title: s.title as string,
        description: (s.description as string | null) ?? "",
        price: (s.price as string | number | null) ?? "",
        contactInfo: (s.contact_info as string | null) ?? "",
        artistUsername: (u?.username as string | null) ?? "",
      };
    }),
  });
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
    body = bodySchema.parse(raw);
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const supabase = getSupabaseAdmin();

  const priceText = priceToText(body.price);
  const description = body.description ? String(body.description).trim() : null;
  const contact_info = body.contactInfo?.trim() || null;

  const { data: inserted, error: insErr } = await supabase
    .from("artist_services")
    .insert({
      user_id: userId,
      title: body.title.trim(),
      description,
      price: priceText,
      contact_info,
    })
    .select("id,user_id,title,description,price,contact_info")
    .single();

  if (insErr || !inserted) {
    return jsonError(insErr?.message ?? "Could not create service.", 400);
  }

  return jsonOk({
    service: {
      id: inserted.id as string,
      userId: inserted.user_id as string,
      title: inserted.title as string,
      description: (inserted.description as string | null) ?? "",
      price: (inserted.price as string | number | null) ?? "",
      contactInfo: (inserted.contact_info as string | null) ?? "",
      artistUsername: "",
    },
  });
}
