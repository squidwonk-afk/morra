import { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth/request-user";
import { jsonError, jsonOk } from "@/lib/http";
import { logMorraError } from "@/lib/logging";
import { getStripe, isStripeSecretConfigured } from "@/lib/stripe";
import { isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function sessionResponse(session: import("stripe").Stripe.Checkout.Session) {
  const sub = session.subscription;
  const subscriptionId =
    typeof sub === "string" ? sub : sub && typeof sub === "object" && "id" in sub ? sub.id : null;

  const cust = session.customer;
  const customerId =
    typeof cust === "string" ? cust : cust && typeof cust === "object" && "id" in cust ? cust.id : null;

  return {
    id: session.id,
    object: session.object,
    mode: session.mode,
    status: session.status,
    payment_status: session.payment_status,
    customer: customerId,
    subscription: subscriptionId,
    metadata: session.metadata ?? {},
    amount_subtotal: session.amount_subtotal,
    amount_total: session.amount_total,
    currency: session.currency,
    customer_details: session.customer_details
      ? {
          email: session.customer_details.email ?? null,
          name: session.customer_details.name ?? null,
        }
      : null,
    customer_email: session.customer_email ?? session.customer_details?.email ?? null,
    payment_intent:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent && typeof session.payment_intent === "object" && "id" in session.payment_intent
          ? session.payment_intent.id
          : null,
    setup_intent:
      typeof session.setup_intent === "string"
        ? session.setup_intent
        : session.setup_intent && typeof session.setup_intent === "object" && "id" in session.setup_intent
          ? session.setup_intent.id
          : null,
    url: session.url,
    success_url: session.success_url,
    cancel_url: session.cancel_url,
    created: session.created,
    expires_at: session.expires_at,
  };
}

/**
 * GET /api/stripe/session?session_id=cs_...
 * Loads the Checkout Session from Stripe and returns structured session data.
 * Requires login; session.metadata.user_id must match the current user.
 */
export async function GET(req: NextRequest) {
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

  const sessionId = req.nextUrl.searchParams.get("session_id")?.trim();
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return jsonError("Invalid or missing session_id.", 400);
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });

    const metaUid = session.metadata?.user_id;
    if (!metaUid || metaUid !== userId) {
      return jsonError("This checkout session does not belong to your account.", 403);
    }

    const base = sessionResponse(session);

    const lineItems =
      session.line_items?.data?.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        amount_subtotal: item.amount_subtotal,
        amount_total: item.amount_total,
        currency: item.currency,
        price: item.price
          ? {
              id: typeof item.price === "string" ? item.price : item.price.id,
              unit_amount: typeof item.price === "object" ? item.price.unit_amount : null,
              currency: typeof item.price === "object" ? item.price.currency : null,
            }
          : null,
      })) ?? [];

    return jsonOk({
      session: {
        ...base,
        line_items: lineItems,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not load session";
    logMorraError("stripe_checkout", "session_retrieve_failed", { detail: msg });
    return jsonError(msg, 502);
  }
}
