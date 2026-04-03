import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth/request-user";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

const postSchema = z.object({
  toolRunId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
});

export async function GET() {
  if (!isSupabaseConfigured()) return jsonError("Server is not configured.", 503);
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized.", 401);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("saved_results")
    .select("id, title, created_at, tool_run_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return jsonError(error.message, 500);
  return jsonOk({ saved: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) return jsonError("Server is not configured.", 503);
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized.", 401);

  let body: z.infer<typeof postSchema>;
  try {
    body = postSchema.parse(await req.json());
  } catch {
    return jsonError("Invalid body. Expect { toolRunId, title }.", 400);
  }

  const supabase = getSupabaseAdmin();
  const { data: run } = await supabase
    .from("tool_runs")
    .select("id")
    .eq("id", body.toolRunId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!run?.id) return jsonError("Tool run not found.", 404);

  const { data: saved, error } = await supabase
    .from("saved_results")
    .insert({
      user_id: userId,
      tool_run_id: body.toolRunId,
      title: body.title,
    })
    .select("id, title, created_at")
    .single();
  if (error) return jsonError(error.message, 500);
  return jsonOk({ saved });
}
