import type { SupabaseClient } from "@supabase/supabase-js";
import { logMorraError } from "@/lib/logging";

/**
 * Best-effort insert into `public.transactions` for auditing.
 * Does not throw, failures are logged (e.g. table missing in old DBs).
 */
export async function tryInsertTransactionLedger(
  supabase: SupabaseClient,
  row: {
    userId: string;
    type: string;
    amount: number;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    const { error } = await supabase.from("transactions").insert({
      user_id: row.userId,
      type: row.type,
      amount: row.amount,
      metadata: row.metadata ?? {},
    });
    if (error) {
      logMorraError("payment", "transactions_ledger_insert_failed", {
        userIdSuffix: row.userId.slice(-8),
        txnType: row.type,
        detail: error.message,
      });
    }
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    logMorraError("payment", "transactions_ledger_insert_failed", {
      userIdSuffix: row.userId.slice(-8),
      txnType: row.type,
      detail,
    });
  }
}
