import { z } from "zod";
import { getSessionUserId } from "@/lib/auth/request-user";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { jsonError, jsonOk } from "@/lib/http";
import { insertUpgradeTrigger, insertUserFunnelEvent } from "@/lib/conversion/track";

export const runtime = "nodejs";

const entrySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("funnel"),
    event_type: z.string().min(1).max(120),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    type: z.literal("upgrade_trigger"),
    trigger_type: z.string().min(1).max(120),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
]);

const bodySchema = z.object({
  entries: z.array(entrySchema).min(1).max(20),
});

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return jsonError("Server is not configured.", 503);
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized.", 401);

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return jsonError("Invalid body. Expected { entries: [...] }.", 400);
  }

  const supabase = getSupabaseAdmin();
  for (const e of body.entries) {
    if (e.type === "funnel") {
      await insertUserFunnelEvent(supabase, userId, e.event_type, e.metadata ?? {});
    } else {
      await insertUpgradeTrigger(supabase, userId, e.trigger_type, e.metadata ?? {});
    }
  }

  return jsonOk({ logged: body.entries.length });
}
