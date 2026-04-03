/**
 * Structured server logs for launch ops (no card numbers, no session tokens).
 */

export type MorraLogArea =
  | "stripe_webhook"
  | "stripe_checkout"
  | "payout"
  | "ai"
  | "cron"
  | "payment";

type Meta = Record<string, string | number | boolean | null | undefined>;

function redactIfSecret(value: string): string {
  if (
    value.length >= 24 &&
    /^(sk_|whsec_|rk_live_|rk_test_|pk_live_|pk_test_)/.test(value)
  ) {
    return "[redacted]";
  }
  return value;
}

function sanitizeMeta(meta?: Meta): Meta | undefined {
  if (!meta) return undefined;
  const out: Meta = {};
  for (const [k, v] of Object.entries(meta)) {
    if (typeof v === "string") {
      out[k] = redactIfSecret(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function serialize(area: MorraLogArea, message: string, meta?: Meta): string {
  return JSON.stringify({
    morra: true,
    area,
    message,
    ts: new Date().toISOString(),
    ...sanitizeMeta(meta),
  });
}

export function logMorraError(area: MorraLogArea, message: string, meta?: Meta): void {
  console.error(serialize(area, message, meta));
}

export function logMorraWarn(area: MorraLogArea, message: string, meta?: Meta): void {
  console.warn(serialize(area, message, meta));
}

export function logMorraInfo(area: MorraLogArea, message: string, meta?: Meta): void {
  console.info(serialize(area, message, meta));
}
