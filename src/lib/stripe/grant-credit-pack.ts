import type { SupabaseClient } from "@supabase/supabase-js";
import { T } from "@/lib/db/morra-prod-tables";
import { tryInsertTransactionLedger } from "@/lib/db/transactions";
import { logMorraError } from "@/lib/logging";
import { createNotification } from "@/lib/notifications";

const GRANT_RETRIES = 5;

export async function grantCreditPackPurchase(
  supabase: SupabaseClient,
  userId: string,
  credits: number,
  payload: Record<string, unknown>
): Promise<void> {
  if (credits <= 0) return;

  for (let i = 0; i < GRANT_RETRIES; i++) {
    const { data: row } = await supabase
      .from(T.userCredits)
      .select("credits")
      .eq("user_id", userId)
      .single();
    if (!row) throw new Error("user_credits row missing");

    const balance = Number((row as { credits?: number | null }).credits ?? 0);
    const { data: updated, error } = await supabase
      .from(T.userCredits)
      .update({ credits: balance + credits })
      .eq("user_id", userId)
      .eq("credits", balance)
      .select("credits")
      .maybeSingle();

    if (!error && updated) {
      await createNotification(
        supabase,
        userId,
        "system",
        "Credits added",
        `You received ${credits} credits.`
      );

      await tryInsertTransactionLedger(supabase, {
        userId,
        type: "credit_pack",
        amount: credits,
        metadata: { unit: "credits", ...payload },
      });
      return;
    }
  }

  logMorraError("payment", "grantCreditPackPurchase_failed", {
    userIdSuffix: userId.slice(-8),
    credits,
  });
  throw new Error("Could not apply credit pack (concurrency).");
}
