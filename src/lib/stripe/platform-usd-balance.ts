import type Stripe from "stripe";

/**
 * Sum of Stripe platform balance available for payouts in USD (cents).
 */
export async function getStripeUsdAvailableCents(stripe: Stripe): Promise<number> {
  const bal = await stripe.balance.retrieve();
  let sum = 0;
  for (const entry of bal.available) {
    if (String(entry.currency).toLowerCase() === "usd") {
      sum += entry.amount;
    }
  }
  return sum;
}
