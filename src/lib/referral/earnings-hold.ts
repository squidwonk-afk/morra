/** Referral commission hold before earnings become withdrawable (disputes / safety). */
export const REFERRAL_EARNINGS_HOLD_MS = 10 * 24 * 60 * 60 * 1000;

export function cutoffIsoForMaturedAccruals(nowMs = Date.now()): string {
  return new Date(nowMs - REFERRAL_EARNINGS_HOLD_MS).toISOString();
}

/** Eligible release time for an accrual row (created_at + hold). */
export function eligibleReleaseIsoFromCreatedAt(createdAtIso: string): string {
  const t = new Date(createdAtIso).getTime();
  if (!Number.isFinite(t)) return new Date().toISOString();
  return new Date(t + REFERRAL_EARNINGS_HOLD_MS).toISOString();
}
