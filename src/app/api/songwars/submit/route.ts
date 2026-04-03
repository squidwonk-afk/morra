import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth/request-user";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { jsonError, jsonOk } from "@/lib/http";
import { submitSongwarsTrack } from "@/lib/songwars/service";

export const runtime = "nodejs";

const bodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  track_url: z.string().trim().min(1),
  lyrics: z.string().optional(),
  slot_index: z.number().int().min(1).max(3),
});

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) return jsonError("Server is not configured.", 503);
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized.", 401);

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return jsonError("Invalid body.", 400);
  }

  try {
    const out = await submitSongwarsTrack(getSupabaseAdmin(), userId, body);
    return jsonOk(out);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Submit failed.";
    return jsonError(msg, 400);
  }
}
