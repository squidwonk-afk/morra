/**
 * Safe `profiles` column lists for PostgREST — always include identity fields.
 * Extend only when the column exists in your Supabase `profiles` table.
 */
export const PROFILE_SELECT_IDENTITY = "id, username, display_name" as const;

/** Checkout: identity + Stripe customer + email (optional column — add in Supabase if missing) */
export const PROFILE_SELECT_CHECKOUT =
  "id, username, display_name, stripe_customer_id, email" as const;

/** /api/me and similar: identity + subscription + Connect + referral balances + avatar */
export const PROFILE_SELECT_ME =
  "id, username, display_name, avatar_url, subscription_status, subscription_plan, stripe_connect_account_id, flagged, earnings_balance_cents, pending_balance_cents" as const;
