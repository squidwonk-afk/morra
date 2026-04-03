import type { SupabaseClient } from "@supabase/supabase-js";

export async function countActiveValidatedReferrals(
  supabase: SupabaseClient,
  referrerId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("referrals")
    .select("*", { count: "exact", head: true })
    .eq("referrer_id", referrerId)
    .eq("status", "active")
    .eq("validated", true);
  if (error) return 0;
  return count ?? 0;
}
