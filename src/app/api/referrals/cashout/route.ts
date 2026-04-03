/**
 * Referral earnings cashout — same behavior as POST /api/stripe/payout (Stripe Connect transfer, $10 min).
 */
export { POST, runtime } from "@/app/api/stripe/payout/route";
