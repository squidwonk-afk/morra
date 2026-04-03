/** Stripe Checkout return URLs (production defaults; override via env if needed). */
export const STRIPE_CHECKOUT_SUCCESS_URL =
  process.env.STRIPE_CHECKOUT_SUCCESS_URL?.trim() ??
  "https://morra.store/success?session_id={CHECKOUT_SESSION_ID}";

export const STRIPE_CHECKOUT_CANCEL_URL =
  process.env.STRIPE_CHECKOUT_CANCEL_URL?.trim() ?? "https://morra.store/pricing";

/** Stripe Customer Portal return (adjust if your app lives under `/app`). */
export const STRIPE_PORTAL_RETURN_URL =
  process.env.STRIPE_PORTAL_RETURN_URL?.trim() ?? "https://morra.store/settings";
