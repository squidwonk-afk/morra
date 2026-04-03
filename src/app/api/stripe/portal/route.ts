import { getSessionUserId } from "@/lib/auth/request-user";
import { T } from "@/lib/db/morra-prod-tables";
import { jsonError } from "@/lib/http";
import { logMorraError } from "@/lib/logging";
import { STRIPE_PORTAL_RETURN_URL } from "@/lib/stripe/checkout-urls";
import { getStripe, isStripeSecretConfigured } from "@/lib/stripe";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST() {
  if (!isSupabaseConfigured()) {
    return jsonError("Server is not configured.", 503);
  }
  if (!isStripeSecretConfigured()) {
    return jsonError("Stripe is not configured.", 503);
  }

  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("Unauthorized.", 401);
  }

  const supabase = getSupabaseAdmin();
  const { data: row, error } = await supabase
    .from(T.profiles)
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  if (error || !row) {
    return jsonError("User not found.", 404);
  }

  const customerId = (row as { stripe_customer_id?: string | null }).stripe_customer_id?.trim();
  if (!customerId) {
    return jsonError("No Stripe customer on file. Complete a purchase first.", 400);
  }

  const stripe = getStripe();
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: STRIPE_PORTAL_RETURN_URL,
    });
    if (!session.url) {
      return jsonError("Could not create billing portal session.", 500);
    }
    return Response.json({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Billing portal error";
    logMorraError("stripe_checkout", "portal_create_failed", {
      userIdSuffix: userId.slice(-8),
      detail: msg,
    });
    return jsonError(msg, 502);
  }
}
