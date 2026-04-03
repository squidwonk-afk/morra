import type { SupabaseClient } from "@supabase/supabase-js";
import { T } from "@/lib/db/morra-prod-tables";

const DEFAULT_RETRIES = 8;

/**
 * Optimistic-lock credit deduction. Use before AI so failures do not consume credits;
 * pair with {@link addCreditsOptimistic} to refund on AI error.
 */
export async function deductCreditsOptimistic(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  opts?: { retries?: number; insufficientCode?: "INSUFFICIENT_CREDITS" | "FREE_TIER_LIMIT" }
): Promise<number> {
  const retries = opts?.retries ?? DEFAULT_RETRIES;
  const insufficientCode = opts?.insufficientCode ?? "INSUFFICIENT_CREDITS";

  if (amount <= 0) {
    const { data } = await supabase
      .from(T.userCredits)
      .select("credits")
      .eq("user_id", userId)
      .single();
    return Number((data as { credits?: number } | null)?.credits ?? 0);
  }

  for (let i = 0; i < retries; i++) {
    const { data: row, error } = await supabase
      .from(T.userCredits)
      .select("credits")
      .eq("user_id", userId)
      .single();
    if (error || !row) throw new Error("Credits row missing");

    const b = Number((row as { credits?: number | null }).credits ?? 0);
    if (b < amount) {
      const err = new Error("INSUFFICIENT_CREDITS");
      (err as Error & { code?: string }).code = insufficientCode;
      throw err;
    }
    const next = b - amount;
    const { data: up } = await supabase
      .from(T.userCredits)
      .update({ credits: next })
      .eq("user_id", userId)
      .eq("credits", b)
      .select("credits")
      .maybeSingle();
    if (up) return next;
  }

  const err = new Error("INSUFFICIENT_CREDITS");
  (err as Error & { code?: string }).code = insufficientCode;
  throw err;
}

/** Add credits with optimistic locking (grants, refunds). */
export async function addCreditsOptimistic(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  retries = DEFAULT_RETRIES
): Promise<void> {
  if (amount <= 0) return;

  for (let i = 0; i < retries; i++) {
    const { data: row } = await supabase
      .from(T.userCredits)
      .select("credits")
      .eq("user_id", userId)
      .single();
    if (!row) throw new Error("Credits row missing");

    const b = Number((row as { credits?: number | null }).credits ?? 0);
    const next = b + amount;
    const { data: up } = await supabase
      .from(T.userCredits)
      .update({ credits: next })
      .eq("user_id", userId)
      .eq("credits", b)
      .select("credits")
      .maybeSingle();
    if (up) return;
  }

  throw new Error("Could not update credits (concurrency).");
}
