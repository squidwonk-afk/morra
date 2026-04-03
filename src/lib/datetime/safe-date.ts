import { formatDistanceToNow, type FormatDistanceToNowOptions } from "date-fns";

/** Parse API / DB timestamps; returns null if missing or invalid (never throws). */
export function parseDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string") {
    const s = value.trim();
    if (s === "") return null;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function toIsoStringOrNull(value: unknown): string | null {
  const d = parseDate(value);
  if (!d) return null;
  try {
    return d.toISOString();
  } catch {
    return null;
  }
}

export function formatLocaleDateLong(value: unknown, invalid = "—"): string {
  const d = parseDate(value);
  if (!d) return invalid;
  try {
    return d.toLocaleDateString(undefined, { dateStyle: "long" });
  } catch {
    return invalid;
  }
}

export function formatLocaleString(value: unknown, invalid = "—"): string {
  const d = parseDate(value);
  if (!d) return invalid;
  try {
    return d.toLocaleString();
  } catch {
    return invalid;
  }
}

/** Milliseconds until `value`, or null if invalid. */
export function msUntilValidDate(value: unknown): number | null {
  const d = parseDate(value);
  if (!d) return null;
  return d.getTime() - Date.now();
}

/**
 * For countdown UIs: invalid / unparsable values behave like “already ended”
 * so callers can use `t <= 0` without crashing.
 */
export function msUntilOrEnded(value: unknown): number {
  const m = msUntilValidDate(value);
  return m == null ? Number.NEGATIVE_INFINITY : m;
}

export function formatDistanceToNowSafe(
  value: unknown,
  options: FormatDistanceToNowOptions | undefined,
  invalid = "—"
): string {
  const d = parseDate(value);
  if (!d) return invalid;
  try {
    return formatDistanceToNow(d, options);
  } catch {
    return invalid;
  }
}

/** Cooldown ms from a server ISO string; invalid → 0. */
export function cooldownMsFromNow(value: unknown): number {
  const d = parseDate(value);
  if (!d) return 0;
  return Math.max(0, d.getTime() - Date.now());
}
