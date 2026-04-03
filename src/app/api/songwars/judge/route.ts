import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth/request-user";
import { verifyCronRequest } from "@/lib/cron-auth";
import { isGodUsername } from "@/lib/god-mode";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { jsonError, jsonOk } from "@/lib/http";
import { runJudgingRound } from "@/lib/songwars/service";

export const runtime = "nodejs";

const bodySchema = z.object({
  eventId: z.string().uuid().optional(),
  round: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

async function authorizedToJudge(req: NextRequest, userId: string | null): Promise<boolean> {
  if (verifyCronRequest(req)) return true;
  if (!userId) return false;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("profiles").select("username").eq("id", userId).maybeSingle();
  return isGodUsername((data as { username?: string } | null)?.username);
}

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) return jsonError("Server is not configured.", 503);
  const userId = await getSessionUserId();
  if (!(await authorizedToJudge(req, userId))) {
    return jsonError("Forbidden.", 403);
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return jsonError("Invalid body. Expected { round: 1|2|3, eventId? }.", 400);
  }

  const supabase = getSupabaseAdmin();
  let eventId = body.eventId ?? null;
  if (!eventId) {
    const { data } = await supabase
      .from("songwars_events")
      .select("id")
      .in("status", ["submissions_open", "judging"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    eventId = (data as { id: string } | null)?.id ?? null;
  }
  if (!eventId) return jsonError("No active Song Wars event to judge.", 404);

  try {
    const out = await runJudgingRound(supabase, eventId, body.round);
    return jsonOk(out);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Judging failed.";
    return jsonError(msg, 400);
  }
}
