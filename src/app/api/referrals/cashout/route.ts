/**
 * Referral earnings cashout — same as POST /api/stripe/payout (full available balance, $5 min, hourly cooldown).
 */
import { POST } from "@/app/api/stripe/payout/route";

export const runtime = "nodejs";

export { POST };
