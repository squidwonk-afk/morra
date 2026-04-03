import { getSessionUserId } from "@/lib/auth/request-user";
import { jsonError, jsonOk } from "@/lib/http";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return jsonError("Server is not configured.", 503);
  }
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("Unauthorized.", 401);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("connect_payouts")
    .select("id, amount_cents, stripe_transfer_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return jsonError("Could not load payout history.", 500);
  }

  return jsonOk({
    payouts:
      data?.map((row) => ({
        id: row.id,
        amountCents: row.amount_cents,
        stripeTransferId: row.stripe_transfer_id,
        createdAt: row.created_at,
      })) ?? [],
  });
}
