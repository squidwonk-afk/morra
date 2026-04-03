import type Stripe from "stripe";
import {
  getCreditPackKeyFromStripePriceId,
  getPlanKeyFromStripePriceId,
  isCreditPackKey,
  isPlanKey,
  WEBHOOK_CREDITS_BY_PACK,
} from "@/lib/pricing";
import { T } from "@/lib/db/morra-prod-tables";
import { getStripe } from "@/lib/stripe";
import { grantCreditPackPurchase } from "@/lib/stripe/grant-credit-pack";
import { grantMonthlySubscriptionCredits } from "@/lib/stripe/grant-monthly-credits";
import { tryGrantReferralSubscriptionBonus } from "@/lib/referral/activation";
import {
  tryHandleReferralPayment,
  tryProcessReferralEarning,
  tryRewardFirstSubscription,
} from "@/lib/referral/stripe-earnings-rpc";
import { accrueReferralRevenueFromSubscriptionInvoice } from "@/lib/referral/revenue-share";
import {
  clearSubscriptionAndSetFree,
  findUserIdByStripeCustomerId,
  findUserIdByStripeSubscriptionId,
  syncUserFromStripeSubscription,
} from "@/lib/stripe/subscription-sync";
import { runWebhookOnce } from "@/lib/stripe/webhook-idempotency";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createNotification } from "@/lib/notifications";

function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const parent = invoice.parent;
  if (parent?.type === "subscription_details") {
    const sub = parent.subscription_details?.subscription;
    if (typeof sub === "string") return sub;
    if (sub && typeof sub === "object" && "id" in sub) return sub.id;
  }
  const legacy = (
    invoice as unknown as {
      subscription?: string | Stripe.Subscription | null;
    }
  ).subscription;
  if (typeof legacy === "string") return legacy;
  if (legacy && typeof legacy === "object" && "id" in legacy) return legacy.id;
  return null;
}

function sessionUserId(session: Stripe.Checkout.Session): string | null {
  const m = session.metadata ?? {};
  const uid = m.user_id ?? m.userId;
  return typeof uid === "string" && uid.length > 0 ? uid : null;
}

function creditsPackageFromSession(session: Stripe.Checkout.Session): string | null {
  const m = session.metadata ?? {};
  const raw = m.credits_pack ?? m.credits_package ?? m.pack;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

/**
 * Handles a verified Stripe event (signature already checked). Logs all events.
 */
export async function processStripeWebhookEvent(
  event: Stripe.Event,
  supabase: SupabaseClient
): Promise<void> {
  const stripe = getStripe();
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      stripe_webhook: true,
      type: event.type,
      id: event.id,
    })
  );

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await runWebhookOnce(supabase, event.id, async () => {
        const userId = sessionUserId(session);
        if (!userId) return;

        const metaType = session.metadata?.type;

        if (session.mode === "subscription") {
          if (typeof metaType === "string" && metaType !== "subscription") return;
          const subRef = session.subscription;
          const subscriptionId =
            typeof subRef === "string"
              ? subRef
              : subRef && typeof subRef === "object" && "id" in subRef
                ? subRef.id
                : null;
          if (!subscriptionId) return;
          const planRaw = session.metadata?.plan;
          if (!planRaw || !isPlanKey(planRaw)) return;

          const cust = session.customer;
          const customerId =
            typeof cust === "string"
              ? cust
              : cust && typeof cust === "object" && cust !== null && "id" in cust
                ? (cust as { id: string }).id
                : null;

          const patch: Record<string, string> = {
            subscription_status: "active",
            subscription_plan: planRaw,
            stripe_subscription_id: subscriptionId,
          };
          if (customerId) patch.stripe_customer_id = customerId;

          await supabase.from(T.profiles).update(patch).eq("id", userId);

          const centsTotal = session.amount_total ?? 0;
          const amountPaidUsd = Number(centsTotal) / 100;
          await tryProcessReferralEarning(supabase, {
            userId,
            amountPaidUsd,
            kind: "subscription",
            planOrPackage: planRaw,
            eventId: event.id,
          });
          await tryHandleReferralPayment(supabase, {
            userId,
            amountPaidUsd,
            kind: "subscription",
            creditsGranted: 0,
          });
          await tryRewardFirstSubscription(supabase, userId);

          await tryGrantReferralSubscriptionBonus(supabase, userId);
          await createNotification(
            supabase,
            userId,
            "subscription",
            "Subscription active",
            "Your subscription is active. Monthly credits will refresh automatically."
          );
          return;
        }

        if (session.mode === "payment") {
          if (typeof metaType === "string" && metaType !== "credits") return;
          const packRaw = creditsPackageFromSession(session);
          if (!packRaw || !isCreditPackKey(packRaw)) return;

          const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
            limit: 5,
          });
          const priceId = lineItems.data[0]?.price?.id;
          if (priceId) {
            const verified = getCreditPackKeyFromStripePriceId(priceId);
            if (verified && verified !== packRaw) return;
          }

          const credits = WEBHOOK_CREDITS_BY_PACK[packRaw];
          await grantCreditPackPurchase(supabase, userId, credits, {
            stripe_event_id: event.id,
            session_id: session.id,
            pack: packRaw,
          });

          const centsTotal = session.amount_total ?? 0;
          const amountPaidUsd = Number(centsTotal) / 100;
          await tryProcessReferralEarning(supabase, {
            userId,
            amountPaidUsd,
            kind: "credits",
            planOrPackage: packRaw,
            eventId: event.id,
          });
          await tryHandleReferralPayment(supabase, {
            userId,
            amountPaidUsd,
            kind: "credits",
            creditsGranted: credits,
          });
        }
      });
      break;
    }

    case "invoice.paid":
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      if (!invoice.id) break;

      await runWebhookOnce(supabase, `inv_monthly:${invoice.id}`, async () => {
        const reason = invoice.billing_reason;
        if (reason !== "subscription_create" && reason !== "subscription_cycle") {
          return;
        }
        const subscriptionId = subscriptionIdFromInvoice(invoice);
        if (!subscriptionId) return;

        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = sub.items.data[0]?.price?.id;
        const plan = priceId ? getPlanKeyFromStripePriceId(priceId) : null;
        if (!plan) return;

        if (reason === "subscription_cycle" && (invoice.amount_paid ?? 0) <= 0) {
          return;
        }

        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;
        if (!customerId) return;

        const userId = await findUserIdByStripeCustomerId(supabase, customerId);
        if (!userId) return;

        await grantMonthlySubscriptionCredits(supabase, userId, plan, {
          stripe_event_id: event.id,
          invoice_id: invoice.id,
          billing_reason: reason,
        });

        await accrueReferralRevenueFromSubscriptionInvoice(supabase, invoice, userId);
      });
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await runWebhookOnce(supabase, event.id, async () => {
        let userId = await findUserIdByStripeSubscriptionId(supabase, sub.id);
        if (!userId) {
          const cid =
            typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
          if (cid) {
            userId = await findUserIdByStripeCustomerId(supabase, cid);
          }
        }
        if (!userId) return;
        await syncUserFromStripeSubscription(supabase, userId, sub);
        await tryGrantReferralSubscriptionBonus(supabase, userId);
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await runWebhookOnce(supabase, event.id, async () => {
        let userId = await findUserIdByStripeSubscriptionId(supabase, sub.id);
        if (!userId) {
          const cid =
            typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
          if (cid) {
            userId = await findUserIdByStripeCustomerId(supabase, cid);
          }
        }
        if (!userId) return;
        await clearSubscriptionAndSetFree(supabase, userId);
      });
      break;
    }

    default:
      break;
  }
}
