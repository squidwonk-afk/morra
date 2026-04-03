import type { SupabaseClient } from "@supabase/supabase-js";
import { T } from "@/lib/db/morra-prod-tables";
import { tryInsertTransactionLedger } from "@/lib/db/transactions";
import { logMorraError } from "@/lib/logging";
import { monthlyCreditsForPlan, type PlanKey } from "@/lib/pricing";
import { createNotification } from "@/lib/notifications";

const GRANT_RETRIES = 5;

export async function grantMonthlySubscriptionCredits(
  supabase: SupabaseClient,
  userId: string,
  plan: PlanKey,
  payload: Record<string, unknown>
): Promise<void> {
  const credits = monthlyCreditsForPlan(plan);
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
        "subscription",
        "Subscription credits added",
        `You received ${credits} monthly credits for your ${plan} plan.`
      );

      await tryInsertTransactionLedger(supabase, {
        userId,
        type: "subscription_credits",
        amount: credits,
        metadata: { unit: "credits", plan, ...payload },
      });
      return;
    }
  }

  logMorraError("payment", "grantMonthlySubscriptionCredits_failed", {
    userIdSuffix: userId.slice(-8),
    plan,
    credits,
  });
  throw new Error("Could not apply subscription credits (concurrency).");
}
