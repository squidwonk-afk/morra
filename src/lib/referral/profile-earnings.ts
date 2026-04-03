/**
 * Read referral USD buckets from profiles row.
 * Prefers earnings_available_cents / earnings_pending_cents; falls back to legacy columns.
 */
export function readAvailableCents(row: Record<string, unknown>): number {
  const v = row.earnings_available_cents;
  if (typeof v === "number" && Number.isFinite(v)) {
    return Math.max(0, Math.floor(v));
  }
  const legacy = row.earnings_balance_cents;
  return Math.max(0, Math.floor(Number(legacy ?? 0)));
}

export function readPendingCents(row: Record<string, unknown>): number {
  const v = row.earnings_pending_cents;
  if (typeof v === "number" && Number.isFinite(v)) {
    return Math.max(0, Math.floor(v));
  }
  const legacy = row.pending_balance_cents;
  return Math.max(0, Math.floor(Number(legacy ?? 0)));
}
