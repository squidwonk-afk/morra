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

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) {
    return jsonError("Server is not configured.", 503);
  }

  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized.", 401);

  const { id } = await ctx.params;
  let body: z.infer<typeof bodySchema>;
  try {
    const raw = await req.json();
    body = bodySchema.parse(raw);
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const supabase = getSupabaseAdmin();

  const { data: existing, error: exErr } = await supabase
    .from("artist_services")
    .select("id,user_id")
    .eq("id", id)
    .single();

  if (exErr || !existing) return jsonError("Service not found.", 404);
  if ((existing.user_id as string) !== userId) return jsonError("Forbidden.", 403);

  const description = body.description ? String(body.description).trim() : null;
  const contact_info = body.contactInfo?.trim() || null;
  const priceText = priceToText(body.price);

  const { data: updated, error: upErr } = await supabase
    .from("artist_services")
    .update({
      title: body.title.trim(),
      description,
      price: priceText,
      contact_info,
    })
    .eq("id", id)
    .select("id,user_id,title,description,price,contact_info")
    .single();

  if (upErr || !updated) return jsonError("Could not update service.", 400);

  return jsonOk({
    service: {
      id: updated.id as string,
      userId: updated.user_id as string,
      title: updated.title as string,
      description: (updated.description as string | null) ?? "",
      price: (updated.price as string | number | null) ?? "",
      contactInfo: (updated.contact_info as string | null) ?? "",
      artistUsername: "",
    },
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) {
    return jsonError("Server is not configured.", 503);
  }

  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized.", 401);

  const { id } = await ctx.params;

  const supabase = getSupabaseAdmin();
  const { data: existing, error: exErr } = await supabase
    .from("artist_services")
    .select("id,user_id")
    .eq("id", id)
    .single();

  if (exErr || !existing) return jsonError("Service not found.", 404);
  if ((existing.user_id as string) !== userId) return jsonError("Forbidden.", 403);

  const { error: delErr } = await supabase.from("artist_services").delete().eq("id", id);
  if (delErr) return jsonError("Could not delete service.", 400);

  return jsonOk({ ok: true });
}
