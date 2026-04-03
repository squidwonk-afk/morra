/**
 * Browser-safe Stripe publishable key.
 * Set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in `.env.local` / hosting env (never the secret key).
 */
export function getStripePublishableKey(): string {
  const k = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  if (!k) {
    throw new Error("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
  }
  return k;
}

/** For optional UI (e.g. future Elements); returns null if unset. */
export function tryGetStripePublishableKey(): string | null {
  const k = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  return k || null;
}
