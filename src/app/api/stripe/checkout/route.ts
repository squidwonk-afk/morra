import { getSessionUserId } from "@/lib/auth/request-user";
import { PROFILE_SELECT_CHECKOUT } from "@/lib/db/profile-fields";
import { T } from "@/lib/db/morra-prod-tables";
import { jsonError } from "@/lib/http";
import { logMorraError } from "@/lib/logging";
import {
  getCreditPackStripePriceId,
  getPlanStripePriceId,
  isCreditPackKey,
  isPlanKey,
  type CreditPackKey,
  type PlanKey,
} from "@/lib/pricing";
import {
  STRIPE_CHECKOUT_CANCEL_URL,
  STRIPE_CHECKOUT_SUCCESS_URL,
} from "@/lib/stripe/checkout-urls";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type CheckoutBody = {
  type?: unknown;
  plan?: unknown;
  credits_pack?: unknown;
  credits_package?: unknown;
  /** @deprecated use credits_package */
  pack?: unknown;
};

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return jsonError("Server is not configured.", 503);
  }
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("Unauthorized.", 401);
  }

  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const inferredType: "subscription" | "credits" | null = isPlanKey(body.plan)
    ? "subscription"
    : isCreditPackKey(body.credits_pack ?? body.credits_package ?? body.pack)
      ? "credits"
      : null;
  const checkoutType =
    body.type === "subscription" || body.type === "credits"
      ? body.type
      : inferredType;
  if (checkoutType !== "subscription" && checkoutType !== "credits") {
    return jsonError('Invalid type. Use "subscription" or "credits".', 400);
  }

  let priceId: string;
  const mode: "subscription" | "payment" =
    checkoutType === "subscription" ? "subscription" : "payment";
  let planStr = "";
  let creditsPackageStr = "";

  if (checkoutType === "subscription") {
    if (!isPlanKey(body.plan)) {
      return jsonError("Invalid plan. Use starter, pro, or elite.", 400);
    }
    const plan = body.plan as PlanKey;
    planStr = plan;
    try {
      priceId = getPlanStripePriceId(plan);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Stripe price configuration error";
      logMorraError("stripe_checkout", "price_config", { detail: msg });
      return jsonError(msg, 500);
    }
  } else {
    const rawPack = body.credits_pack ?? body.credits_package ?? body.pack;
    if (!isCreditPackKey(rawPack)) {
      return jsonError(
        "Invalid credits package. Use small, medium, large, or power.",
        400
      );
    }
    const pack = rawPack as CreditPackKey;
    creditsPackageStr = pack;
    try {
      priceId = getCreditPackStripePriceId(pack);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Stripe price configuration error";
      logMorraError("stripe_checkout", "price_config", { detail: msg });
      return jsonError(msg, 500);
    }
  }

  const supabase = getSupabaseAdmin();
  let q = await supabase
    .from(T.profiles)
    .select(PROFILE_SELECT_CHECKOUT)
    .eq("id", userId)
    .single();

  if (q.error && /column .* does not exist|schema cache/i.test(q.error.message ?? "")) {
    q = await supabase
      .from(T.profiles)
      .select("id, username, display_name, stripe_customer_id")
      .eq("id", userId)
      .single();
  }

  if (q.error || !q.data) {
    return jsonError("User not found.", 404);
  }

  const profile = q.data as {
    id: string;
    stripe_customer_id?: string | null;
    email?: string | null;
  };

  let customerId = profile.stripe_customer_id as string | null;
  const email =
    typeof profile.email === "string" && profile.email.trim()
      ? profile.email.trim()
      : undefined;
  const stripe = getStripe();

  if (!customerId) {
    try {
      const customer = await stripe.customers.create({
        email: email ?? undefined,
        metadata: { user_id: userId },
      });
      customerId = customer.id;
      const { error: upErr } = await supabase
        .from(T.profiles)
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
      if (upErr) {
        logMorraError("stripe_checkout", "save_customer", { detail: upErr.message });
        return jsonError("Could not save Stripe customer.", 500);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Stripe customer error";
      logMorraError("stripe_checkout", "customer_create", { detail: msg });
      return jsonError(msg, 502);
    }
  } else if (email) {
    try {
      await stripe.customers.update(customerId, { email });
    } catch (e) {
      logMorraError("stripe_checkout", "customer_email_update", {
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const metadata: Record<string, string> =
    checkoutType === "subscription"
      ? { user_id: userId, type: "subscription", plan: planStr }
      : {
          user_id: userId,
          type: "credits",
          credits_pack: creditsPackageStr,
          credits_package: creditsPackageStr,
        };

  try {
    const session = await stripe.checkout.sessions.create({
      mode,
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: STRIPE_CHECKOUT_SUCCESS_URL,
      cancel_url: STRIPE_CHECKOUT_CANCEL_URL,
      metadata,
      ...(mode === "subscription"
        ? {
            subscription_data: { metadata },
          }
        : {}),
    });

    if (!session.url) {
      return jsonError("Could not create checkout session.", 500);
    }

    return Response.json({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe checkout failed";
    logMorraError("stripe_checkout", "session_create_failed", {
      userIdSuffix: userId.slice(-8),
      detail: msg,
    });
    return jsonError(msg, 502);
  }
}
