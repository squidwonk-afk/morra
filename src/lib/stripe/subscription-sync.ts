import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { T } from "@/lib/db/morra-prod-tables";
import { getPlanKeyFromStripePriceId, type PlanKey } from "@/lib/pricing";

function firstActivePriceId(subscription: Stripe.Subscription): string | null {
  const item = subscription.items.data[0];
  return item?.price?.id ?? null;
}

const PAID_STATUSES = ["active", "trialing", "past_due"] as const;

export async function syncUserFromStripeSubscription(
  supabase: SupabaseClient,
  userId: string,
  subscription: Stripe.Subscription
): Promise<void> {
  if (
    subscription.status === "incomplete" ||
    subscription.status === "incomplete_expired"
  ) {
    return;
  }

  const priceId = firstActivePriceId(subscription);
  const planFromPrice = priceId ? getPlanKeyFromStripePriceId(priceId) : null;
  const periodEndTs = subscription.items.data[0]?.current_period_end;
  const periodEnd = periodEndTs
    ? new Date(periodEndTs * 1000).toISOString()
    : null;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;

  const isPaid =
    PAID_STATUSES.includes(
      subscription.status as (typeof PAID_STATUSES)[number]
    ) && Boolean(planFromPrice);

  if (!isPaid) {
    await supabase
      .from(T.profiles)
      .update({
        stripe_subscription_id: null,
        stripe_customer_id: customerId,
        subscription_status: subscription.status,
        subscription_plan: null,
        subscription_current_period_end: periodEnd,
      })
      .eq("id", userId);
    return;
  }

  await supabase
    .from(T.profiles)
    .update({
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      subscription_status: "active",
      subscription_plan: planFromPrice,
      subscription_current_period_end: periodEnd,
    })
    .eq("id", userId);
}

export async function clearSubscriptionAndSetFree(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  await supabase
    .from(T.profiles)
    .update({
      stripe_subscription_id: null,
      subscription_status: "inactive",
      subscription_plan: null,
      subscription_current_period_end: null,
    })
    .eq("id", userId);
}

export async function findUserIdByStripeCustomerId(
  supabase: SupabaseClient,
  customerId: string
): Promise<string | null> {
  const { data } = await supabase
    .from(T.profiles)
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export async function findUserIdByStripeSubscriptionId(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<string | null> {
  const { data } = await supabase
    .from(T.profiles)
    .select("id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}
