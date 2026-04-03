import type { SupabaseClient } from "@supabase/supabase-js";
import { T } from "@/lib/db/morra-prod-tables";
import { CREDIT_COSTS, type ToolKey } from "@/lib/constants/credits";
import {
  XP_TOOL_CAP_PER_HOUR,
  countToolXpLastHour,
  hadDuplicateInputRecently,
  inputFingerprint,
} from "@/lib/abuse/generation-guard";
import { collabCacheKey, getDiscoveryCache, setDiscoveryCache } from "@/lib/ai/discovery-cache";
import { runToolAiWithMeta } from "@/lib/ai";
import { buildUserContextPrompt } from "@/lib/ai/user-context";
import { deductCreditsOptimistic } from "@/lib/credits/optimistic-balance";
import { isGodUsername } from "@/lib/god-mode";
import { maybeActivateReferral } from "@/lib/referral/activation";
import { recordPostGenerationConversionSignals } from "@/lib/conversion/track";
import { logMorraError } from "@/lib/logging";
import { applyLevelUpRewards } from "@/lib/services/level-up-rewards";

const GENERATION_PREFIX = "generation_";

function actionTypeForTool(tool: ToolKey): string {
  return `${GENERATION_PREFIX}${tool}`;
}

function utcDateString(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function yesterdayUtcString(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function updateStreak(
  supabase: SupabaseClient,
  userId: string,
  row: { streak: number; last_active_date: string | null }
): Promise<{ streak: number }> {
  const today = utcDateString();
  const last = row.last_active_date;
  let streak = row.streak;
  if (last === today) {
    return { streak };
  }
  if (last === yesterdayUtcString()) {
    streak = streak + 1;
  } else {
    streak = 1;
  }
  await supabase
    .from(T.userXp)
    .update({ last_active_date: today, streak })
    .eq("user_id", userId);
  return { streak };
}

export type GenerationResult = {
  output: Record<string, unknown>;
  creditsUsed: number;
  balanceAfter: number;
  xp: number;
  level: number;
  streak: number;
  leveledUp: boolean;
  levelRewardsCredits: number;
  /** Present when tool_runs row was created */
  toolRunId?: string | null;
  fromCache?: boolean;
  qualityAttempts?: number;
};

export async function runToolGeneration(
  supabase: SupabaseClient,
  userId: string,
  tool: ToolKey,
  inputData: Record<string, unknown>,
  meta?: { ip?: string | null; deviceId?: string | null }
): Promise<GenerationResult> {
  const cost = CREDIT_COSTS[tool];
  const actionType = actionTypeForTool(tool);

  const { data: user, error: userErr } = await supabase
    .from(T.profiles)
    .select("id, username")
    .eq("id", userId)
    .single();
  if (userErr || !user) throw new Error("User not found");

  const { data: xpRowDb, error: xpErr } = await supabase
    .from(T.userXp)
    .select("xp, level, streak, last_active_date")
    .eq("user_id", userId)
    .single();
  if (xpErr || !xpRowDb) throw new Error("user_xp row missing");

  const fp = inputFingerprint(tool, inputData);
  if (await hadDuplicateInputRecently(supabase, userId, tool, fp)) {
    const err = new Error("ACTION_LIMITED");
    (err as Error & { code?: string }).code = "DUPLICATE_GENERATION";
    throw err;
  }

  const { data: cred, error: credErr } = await supabase
    .from(T.userCredits)
    .select("credits")
    .eq("user_id", userId)
    .single();
  if (credErr || !cred) throw new Error("Credits row missing");

  const xpRow = {
    xp: Number((xpRowDb as { xp?: number | null }).xp ?? 0),
    level: Number((xpRowDb as { level?: number | null }).level ?? 1),
    streak: Number((xpRowDb as { streak?: number | null }).streak ?? 0),
    last_active_date: ((xpRowDb as { last_active_date?: string | null }).last_active_date ?? null) as
      | string
      | null,
  };

  const balance = Number((cred as { credits?: number | null }).credits ?? 0);
  const username = (user as { username?: string | null }).username ?? "";
  const isGod = isGodUsername(username);

  let creditsToCharge: number = isGod ? 0 : cost;

  if (creditsToCharge > 0 && balance < creditsToCharge) {
    const err = new Error("INSUFFICIENT_CREDITS");
    (err as Error & { code?: string }).code = "INSUFFICIENT_CREDITS";
    throw err;
  }

  const xpSoFar = await countToolXpLastHour(supabase, userId);
  const perToolXp: Record<ToolKey, number> = {
    identity: 10,
    rollout: 15,
    lyrics: 10,
    cover: 15,
    collab: 5,
  };
  const xpGain = xpSoFar >= XP_TOOL_CAP_PER_HOUR ? 0 : (perToolXp[tool] ?? 10);

  let balanceAfter = balance;
  const userContextBlock = await buildUserContextPrompt(supabase, userId);

  let output: Record<string, unknown> = {};
  let qualityAttempts = 1;
  let fromCache = false;

  if (tool === "collab") {
    const ck = collabCacheKey(userId, inputData, userContextBlock);
    const hit = await getDiscoveryCache(supabase, ck);
    if (hit) {
      output = hit;
      fromCache = true;
    }
  }

  try {
    if (!fromCache) {
      const ai = await runToolAiWithMeta(tool, inputData, {
        userId,
        supabase,
        userContextBlock,
      });
      output = ai.output;
      qualityAttempts = ai.attempts;
      if (tool === "collab") {
        await setDiscoveryCache(
          supabase,
          collabCacheKey(userId, inputData, userContextBlock),
          output
        );
      }
    }
  } catch (e) {
    throw e;
  }

  if (creditsToCharge > 0) {
    balanceAfter = await deductCreditsOptimistic(supabase, userId, creditsToCharge, {
      insufficientCode: "INSUFFICIENT_CREDITS",
    });
  }

  await supabase.from("usage_logs").insert({
    user_id: userId,
    action_type: actionType,
    credits_used: creditsToCharge,
    ip_address: meta?.ip ?? null,
    device_id: meta?.deviceId ?? null,
  });

  const balanceForSignals = isGod ? balance : creditsToCharge > 0 ? balanceAfter : balance;
  await recordPostGenerationConversionSignals(supabase, userId, actionType, creditsToCharge, balanceForSignals, {
    isGod,
  });

  const { data: genRow, error: genInsErr } = await supabase
    .from("generations")
    .insert({
      user_id: userId,
      type: tool,
      input_data: inputData,
      output_data: output,
      input_fingerprint: fp,
    })
    .select("id")
    .single();

  if (genInsErr || !genRow?.id) {
    throw new Error(genInsErr?.message || "Failed to save generation.");
  }

  const { data: toolRunRow, error: toolRunInsErr } = await supabase
    .from("tool_runs")
    .insert({
      user_id: userId,
      tool_type: tool,
      input_json: inputData,
      output_json: output,
      generation_id: genRow.id as string,
      quality_attempts: qualityAttempts,
      from_cache: fromCache,
    })
    .select("id")
    .single();

  const toolRunId =
    !toolRunInsErr && toolRunRow && typeof (toolRunRow as { id?: string }).id === "string"
      ? (toolRunRow as { id: string }).id
      : null;
  if (toolRunInsErr) {
    logMorraError("ai", "tool_runs_insert_failed", {
      detail: toolRunInsErr.message,
      tool,
    });
  }

  await maybeActivateReferral(supabase, userId);

  const streakRes = await updateStreak(supabase, userId, {
    streak: xpRow.streak as number,
    last_active_date: xpRow.last_active_date as string | null,
  });

  const oldXpBlueprint = xpRow.xp as number;

  if (xpGain > 0) {
    try {
      await supabase.from("reward_events").insert({
        user_id: userId,
        type: "usage",
        xp: xpGain,
        credits: 0,
      });
    } catch {
      /* optional */
    }

    let newXp = oldXpBlueprint;
    for (let i = 0; i < 8; i++) {
      const curXp = i === 0 ? oldXpBlueprint : newXp;
      const { data: up } = await supabase
        .from(T.userXp)
        .update({ xp: curXp + xpGain })
        .eq("user_id", userId)
        .eq("xp", curXp)
        .select("xp")
        .maybeSingle();
      if (up) {
        newXp = Number((up as { xp?: number | null }).xp ?? curXp + xpGain);
        break;
      }
      const { data: fresh } = await supabase
        .from(T.userXp)
        .select("xp")
        .eq("user_id", userId)
        .single();
      newXp = Number((fresh as { xp?: number | null } | null)?.xp ?? curXp);
    }

    const { creditsGranted: levelRewardsCredits, newLevel: postRewardLevel } =
      await applyLevelUpRewards(supabase, userId, newXp);
    const leveledUp = postRewardLevel > Number((xpRow as { level: number }).level ?? 1);

    return {
      output,
      creditsUsed: creditsToCharge,
      balanceAfter: isGod ? balance : creditsToCharge > 0 ? balanceAfter : balance,
      xp: newXp,
      level: postRewardLevel,
      streak: streakRes.streak,
      leveledUp,
      levelRewardsCredits,
      toolRunId,
      fromCache,
      qualityAttempts,
    };
  }

  const postRewardLevel = xpRow.level as number;
  return {
    output,
    creditsUsed: creditsToCharge,
    balanceAfter: isGod ? balance : creditsToCharge > 0 ? balanceAfter : balance,
    xp: oldXpBlueprint,
    level: postRewardLevel,
    streak: streakRes.streak,
    leveledUp: false,
    levelRewardsCredits: 0,
    toolRunId,
    fromCache,
    qualityAttempts,
  };
}
