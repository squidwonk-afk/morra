import { getSessionUserId } from "@/lib/auth/request-user";
import { jsonError, jsonOk } from "@/lib/http";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Creates a Stripe Connect Express account and stores the id on the user.
 */
export async function POST() {
  if (!isSupabaseConfigured()) {
    return jsonError("Server is not configured.", 503);
  }
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("Unauthorized.", 401);
  }

  const supabase = getSupabaseAdmin();
  const { data: user, error: uErr } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id, flagged")
    .eq("id", userId)
    .single();
  if (uErr || !user) {
    return jsonError("User not found.", 404);
  }
  if (user.flagged) {
    return jsonError("Action temporarily limited. Please try again later.", 403);
  }

  const existing = user.stripe_connect_account_id as string | null;
  if (existing?.trim()) {
    return jsonOk({ accountId: existing, created: false });
  }

  const stripe = getStripe();
  try {
    const account = await stripe.accounts.create({
      type: "express",
      metadata: { morra_user_id: userId },
      capabilities: {
        transfers: { requested: true },
      },
    });

    const { error: upErr } = await supabase
      .from("profiles")
      .update({ stripe_connect_account_id: account.id })
      .eq("id", userId)
      .is("stripe_connect_account_id", null);

    if (upErr) {
      return jsonError("Could not save Connect account.", 500);
    }

    return jsonOk({ accountId: account.id, created: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe Connect error";
    return jsonError(msg, 502);
  }
}
