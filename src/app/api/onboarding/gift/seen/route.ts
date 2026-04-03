import { getSessionUserId } from "@/lib/auth/request-user";
import { WELCOME_GIFT_XP_MARKER } from "@/lib/constants/credits";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { addCreditsOptimistic } from "@/lib/credits/optimistic-balance";
import { isGodUsername } from "@/lib/god-mode";
import { jsonError, jsonOk } from "@/lib/http";
import { createNotification } from "@/lib/notifications";

export async function POST() {
  if (!isSupabaseConfigured()) {
    return jsonError("Server is not configured.", 503);
  }
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized.", 401);

  const supabase = getSupabaseAdmin();

  const { data: u, error: uErr } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .single();
  if (uErr || !u) return jsonError("User not found.", 404);

  const { data: existing } = await supabase
    .from("reward_events")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "usage")
    .eq("xp", WELCOME_GIFT_XP_MARKER)
    .eq("credits", 50)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return jsonOk({ ok: true, alreadyClaimed: true });
  }

  const { error: insErr } = await supabase.from("reward_events").insert({
    user_id: userId,
    type: "usage",
    xp: WELCOME_GIFT_XP_MARKER,
    credits: 50,
  });

  if (insErr) {
    if (insErr.code === "23505" || /duplicate/i.test(insErr.message ?? "")) {
      return jsonOk({ ok: true, alreadyClaimed: true });
    }
    return jsonError(insErr.message, 400);
  }

  if (!isGodUsername((u as { username?: string }).username)) {
    await addCreditsOptimistic(supabase, userId, 50);
  }

  await createNotification(
    supabase,
    userId,
    "system",
    "Gift claimed",
    "You claimed your welcome gift and received 50 credits."
  );

  return jsonOk({ ok: true });
}
