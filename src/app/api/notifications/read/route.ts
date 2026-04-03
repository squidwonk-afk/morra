import type { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth/request-user";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

const bodySchema = z.object({
  ids: z.array(z.string().min(1)).optional(),
  all: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return jsonError("Server is not configured.", 503);
  }
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized.", 401);

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const supabase = getSupabaseAdmin();

  if (body.all) {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
    return jsonOk({ ok: true });
  }

  const ids = (body.ids ?? []).slice(0, 100);
  if (ids.length === 0) return jsonOk({ ok: true });

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .in("id", ids);

  return jsonOk({ ok: true });
}

