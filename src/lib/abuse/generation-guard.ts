import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToolKey } from "@/lib/constants/credits";

export const GENERATION_MIN_INTERVAL_MS = 2_500;
export const DUPLICATE_INPUT_WINDOW_MS = 120_000;
export const XP_TOOL_CAP_PER_HOUR = 300;

export function inputFingerprint(tool: ToolKey, input: Record<string, unknown>): string {
  return createHash("sha256")
    .update(`${tool}:${JSON.stringify(input)}`)
    .digest("hex");
}

export async function countToolXpLastHour(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("generations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if (error) return 0;
  /** ~15 XP average per tool generation toward hourly cap (see generation-flow perToolXp). */
  return Math.min(XP_TOOL_CAP_PER_HOUR, (count ?? 0) * 15);
}

export async function hadDuplicateInputRecently(
  supabase: SupabaseClient,
  userId: string,
  tool: ToolKey,
  fingerprint: string
): Promise<boolean> {
  const since = new Date(Date.now() - DUPLICATE_INPUT_WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from("generations")
    .select("id")
    .eq("user_id", userId)
    .eq("type", tool)
    .eq("input_fingerprint", fingerprint)
    .gte("created_at", since)
    .limit(1);
  if (error) return false;
  return Boolean(data && data.length > 0);
}
