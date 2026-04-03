import type { SupabaseClient } from "@supabase/supabase-js";
import { T } from "@/lib/db/morra-prod-tables";
import { displayUsername } from "@/lib/profile/username";

export type UserAiContext = {
  promptBlock: string;
};

function esc(s: string): string {
  return s.replace(/\r\n/g, "\n").trim();
}

/**
 * Loads profile, optional extended fields, collab artist_profiles, and recent tool outputs
 * for personalization. Safe if tables/columns are missing (falls back gracefully).
 */
export async function buildUserContextPrompt(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const lines: string[] = [];

  const profileSel = "id, username, display_name";
  const { data: profile } = await supabase
    .from(T.profiles)
    .select(profileSel)
    .eq("id", userId)
    .maybeSingle();

  if (profile) {
    const p = profile as { username?: unknown; display_name?: unknown };
    const dn = typeof p.display_name === "string" ? esc(p.display_name) : "";
    const un = displayUsername(p.username);
    lines.push(`Artist / account name: ${dn || un || "(not set)"}`);
    lines.push(`Handle / referral code: ${typeof p.username === "string" ? p.username.trim() : un}`);
  }

  type ExtendedRow = {
    artist_name?: string | null;
    genres?: string[] | null;
    inspirations?: string | null;
    goals?: string | null;
  };
  let extended: ExtendedRow | null = null;
  {
    const { data, error } = await supabase
      .from("user_profiles_extended")
      .select("artist_name, genres, inspirations, goals")
      .eq("user_id", userId)
      .maybeSingle();
    if (!error && data) extended = data as ExtendedRow;
  }

  if (extended) {
    if (extended.artist_name?.trim()) lines.push(`Preferred artist name: ${esc(extended.artist_name)}`);
    const g = (extended.genres ?? []).filter((x) => typeof x === "string" && x.trim());
    if (g.length) lines.push(`Genres: ${g.join(", ")}`);
    if (extended.inspirations?.trim()) lines.push(`Inspirations: ${esc(extended.inspirations)}`);
    if (extended.goals?.trim()) lines.push(`Goals: ${esc(extended.goals)}`);
  }

  {
    const { data: ap, error } = await supabase
      .from("artist_profiles")
      .select("bio, role, styles, looking_for")
      .eq("user_id", userId)
      .maybeSingle();
    if (!error && ap) {
      const row = ap as {
        bio?: string | null;
        role?: string | null;
        styles?: string[];
        looking_for?: string[];
      };
      if (row.role?.trim()) lines.push(`Collab marketplace role: ${esc(row.role)}`);
      const st = (row.styles ?? []).filter(Boolean);
      if (st.length) lines.push(`Styles (marketplace): ${st.join(", ")}`);
      const lf = (row.looking_for ?? []).filter(Boolean);
      if (lf.length) lines.push(`Looking for: ${lf.join(", ")}`);
      if (row.bio?.trim()) lines.push(`Bio (marketplace): ${esc(row.bio).slice(0, 600)}`);
    }
  }

  {
    const { data: recent, error } = await supabase
      .from("generations")
      .select("type, created_at, output_data")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3);
    if (!error && recent?.length) {
      lines.push("\nRecent tool outputs (summarize themes; do not repeat verbatim):");
      for (const r of recent) {
        const row = r as { type?: string; output_data?: unknown };
        const keys =
          row.output_data && typeof row.output_data === "object" && !Array.isArray(row.output_data)
            ? Object.keys(row.output_data as object).slice(0, 12).join(", ")
            : "";
        lines.push(`- ${row.type ?? "tool"}: fields ${keys || "(none)"}`);
      }
    }
  }

  if (lines.length === 0) return "";

  return (
    `### USER CONTEXT (personalize every answer; reference specifics, not generic advice)\n` +
    lines.join("\n") +
    `\n### END USER CONTEXT\n`
  );
}

export async function loadUserAiContext(
  supabase: SupabaseClient,
  userId: string
): Promise<UserAiContext> {
  const promptBlock = await buildUserContextPrompt(supabase, userId);
  return { promptBlock };
}
