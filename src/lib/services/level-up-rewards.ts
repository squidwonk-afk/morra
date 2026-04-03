import type { SupabaseClient } from "@supabase/supabase-js";
import { T } from "@/lib/db/morra-prod-tables";
import { addCreditsOptimistic } from "@/lib/credits/optimistic-balance";
import { createNotification } from "@/lib/notifications";

const LEVEL_UP_CREDITS = 150;

async function getLevelForXp(supabase: SupabaseClient, xp: number): Promise<number> {
  const { data: rows, error } = await supabase
    .from("level_thresholds")
    .select("level,xp_required")
    .order("level", { ascending: true });
  if (error || !rows || rows.length === 0) return 1;
  let best = 1;
  for (const r of rows as unknown as { level: number; xp_required: number }[]) {
    if (xp >= Number(r.xp_required)) best = Number(r.level);
  }
  return best;
}

/**
 * Grants +150 credits per newly reached level; updates `user_xp.level`.
 */
export async function applyLevelUpRewards(
  supabase: SupabaseClient,
  userId: string,
  newXp: number
): Promise<{ creditsGranted: number; newLevel: number }> {
  const targetLevel = await getLevelForXp(supabase, newXp);

  for (let attempt = 0; attempt < 10; attempt++) {
    const { data: row, error: rErr } = await supabase
      .from(T.userXp)
      .select("level")
      .eq("user_id", userId)
      .single();
    if (rErr || !row) return { creditsGranted: 0, newLevel: 1 };

    const dbLevel = Number((row as { level?: number | null }).level ?? 1);
    if (targetLevel <= dbLevel) {
      return { creditsGranted: 0, newLevel: dbLevel };
    }

    const { data: won, error: uErr } = await supabase
      .from(T.userXp)
      .update({ level: targetLevel })
      .eq("user_id", userId)
      .eq("level", dbLevel)
      .select("level")
      .maybeSingle();

    if (uErr || !won) continue;

    let creditsGranted = 0;
    for (let lv = dbLevel + 1; lv <= targetLevel; lv++) {
      creditsGranted += LEVEL_UP_CREDITS;
      try {
        await supabase.from("reward_events").insert({
          user_id: userId,
          type: "level_up",
          xp: 0,
          credits: LEVEL_UP_CREDITS,
        });
      } catch {
        /* optional audit table */
      }
    }

    if (creditsGranted > 0) {
      await addCreditsOptimistic(supabase, userId, creditsGranted);
    }

    await createNotification(
      supabase,
      userId,
      "system",
      `Level up to ${targetLevel}`,
      `You earned ${creditsGranted} credits for reaching level ${targetLevel}.`
    );

    return { creditsGranted, newLevel: targetLevel };
  }

  const { data: final } = await supabase
    .from(T.userXp)
    .select("level")
    .eq("user_id", userId)
    .single();
  return {
    creditsGranted: 0,
    newLevel: Number((final as { level?: number | null } | null)?.level ?? targetLevel),
  };
}
