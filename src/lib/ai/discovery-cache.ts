import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const COLLAB_TTL_MS = 24 * 60 * 60 * 1000;

function stableStringify(obj: unknown): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(",")}]`;
  const keys = Object.keys(obj as object).sort();
  return `{${keys.map((k) => JSON.stringify(k) + ":" + stableStringify((obj as Record<string, unknown>)[k])).join(",")}}`;
}

export function collabCacheKey(userId: string, input: Record<string, unknown>, contextBlock: string): string {
  const h = createHash("sha256")
    .update(`${userId}|${stableStringify(input)}|${contextBlock}`)
    .digest("hex");
  return `collab:${h}`;
}

export async function getDiscoveryCache(
  supabase: SupabaseClient,
  cacheKey: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from("artist_discovery_cache")
    .select("output_json, expires_at")
    .eq("cache_key", cacheKey)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { output_json?: unknown; expires_at?: string | null };
  const exp = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  if (!exp || Date.now() > exp) {
    await supabase.from("artist_discovery_cache").delete().eq("cache_key", cacheKey);
    return null;
  }
  if (!row.output_json || typeof row.output_json !== "object" || Array.isArray(row.output_json)) return null;
  return row.output_json as Record<string, unknown>;
}

export async function setDiscoveryCache(
  supabase: SupabaseClient,
  cacheKey: string,
  output: Record<string, unknown>
): Promise<void> {
  const expires_at = new Date(Date.now() + COLLAB_TTL_MS).toISOString();
  await supabase.from("artist_discovery_cache").upsert(
    {
      cache_key: cacheKey,
      output_json: output,
      expires_at,
    },
    { onConflict: "cache_key" }
  );
}
