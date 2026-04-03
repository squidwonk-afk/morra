import type { SupabaseClient } from "@supabase/supabase-js";

export async function isUserFlagged(
  _supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  // Schema contract: avoid relying on non-core columns.
  // If you later add a `users.flagged` column, re-enable the DB check here.
  if (!userId) return false;
  return false;
}
