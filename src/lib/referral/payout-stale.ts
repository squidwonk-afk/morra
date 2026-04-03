import type { SupabaseClient } from "@supabase/supabase-js";

const PAYOUT_PENDING_STALE_MS = 20 * 60 * 1000;

/** Marks abandoned `pending` payout logs as failed so users are not blocked forever. */
export async function clearStalePendingPayoutLogs(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const staleBefore = new Date(Date.now() - PAYOUT_PENDING_STALE_MS).toISOString();
  await supabase
    .from("payout_logs")
    .update({
      status: "failed",
      error_message: "stale_in_progress_timeout",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("status", "pending")
    .lt("created_at", staleBefore);
}
