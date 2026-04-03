import Stripe from "stripe";

/**
 * Single server-side Stripe client for the whole app.
 * Initialized only through {@link getStripe} using `process.env.STRIPE_SECRET_KEY`.
 * Do not call `new Stripe(...)` elsewhere.
 */
let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeSingleton) return stripeSingleton;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  stripeSingleton = new Stripe(key, { typescript: true });
  return stripeSingleton;
}

export function isStripeSecretConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function requireWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET");
  }
  return secret;
}

/** Stripe Connect OAuth client id (Dashboard → Connect). Optional for Express API-only onboarding. */
export function getStripeConnectClientId(): string | undefined {
  return process.env.STRIPE_CONNECT_CLIENT_ID?.trim() || undefined;
}
