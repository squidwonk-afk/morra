/** Active validated referral counts → tier (matches Referrals / revenue UI). */
export function referralTierFromCount(activeValidatedCount: number): 1 | 2 | 3 | 4 {
  if (activeValidatedCount >= 50) return 4;
  if (activeValidatedCount >= 15) return 3;
  if (activeValidatedCount >= 5) return 2;
  return 1;
}

/** Basis points: 1.2%, 2%, 3.5%, 5% */
export const TIER_PERCENT_BPS: Record<1 | 2 | 3 | 4, number> = {
  1: 120,
  2: 200,
  3: 350,
  4: 500,
};

export function tierRevenuePercentLabel(tier: 1 | 2 | 3 | 4): string {
  const bps = TIER_PERCENT_BPS[tier];
  return `${bps / 100}%`;
}
