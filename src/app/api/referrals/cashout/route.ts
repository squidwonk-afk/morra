/**
 * Referral earnings cashout — same as POST /api/stripe/payout (full available balance, $5 min, hourly cooldown).
 */
export { POST, runtime } from "@/app/api/stripe/payout/route";
