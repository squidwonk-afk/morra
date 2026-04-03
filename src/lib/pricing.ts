/**
 * Single source of truth for plan/pack display amounts and credit counts.
 * Stripe Price IDs always come from environment variables (never hardcode IDs).
 */

const PLAN_ENV_KEYS = {
  starter: "STRIPE_STARTER_PRICE_ID",
  pro: "STRIPE_PRO_PRICE_ID",
  elite: "STRIPE_ELITE_PRICE_ID",
} as const;

const PACK_ENV_KEYS = {
  small: "STRIPE_PRICE_CREDITS_SMALL",
  medium: "STRIPE_PRICE_CREDITS_MEDIUM",
  large: "STRIPE_PRICE_CREDITS_LARGE",
  power: "STRIPE_PRICE_CREDITS_POWER",
} as const;

export type PlanKey = keyof typeof PLAN_ENV_KEYS;
export type CreditPackKey = keyof typeof PACK_ENV_KEYS;

export const PLAN_KEYS = Object.keys(PLAN_ENV_KEYS) as PlanKey[];
export const CREDIT_PACK_KEYS = Object.keys(PACK_ENV_KEYS) as CreditPackKey[];

/** Subscription tiers, safe to import in Client Components (no Stripe IDs). */
export const PLANS = {
  starter: { name: "Starter", price: 5, credits: 100 },
  pro: { name: "Pro", price: 10, credits: 300 },
  elite: { name: "Elite", price: 20, credits: 600 },
} as const satisfies Record<PlanKey, { name: string; price: number; credits: number }>;

/** Tier bullets for homepage + pricing (Pro/Elite: show with “Everything in … +” header in UI). */
export const PLAN_FEATURE_BULLETS: Record<PlanKey, readonly string[]> = {
  starter: [
    "100 credits/month",
    "Core tools across MORRA",
    "Save generations to your workspace",
    "Light priority queue",
  ],
  pro: [
    "300 credits/month",
    "Faster generation speed",
    "Priority queue access",
    "Higher-quality outputs",
    "Early access to new features",
  ],
  elite: [
    "600 credits/month",
    "Maximum generation speed",
    "Highest priority queue",
    "Premium models",
    "Unlimited saves",
  ],
};

/** One-time credit packs, safe to import in Client Components. */
export const CREDIT_PACKS = {
  small: { name: "Small Pack", price: 3, credits: 50 },
  medium: { name: "Medium Pack", price: 7, credits: 150 },
  large: { name: "Large Pack", price: 15, credits: 400 },
  power: { name: "Power Pack", price: 30, credits: 1000 },
} as const satisfies Record<
  CreditPackKey,
  { name: string; price: number; credits: number }
>;

/**
 * Credits granted by Stripe webhook on pack purchase (must match checkout metadata).
 * Env must use Stripe Price IDs (price_*), never product IDs (prod_*).
 */
export const WEBHOOK_CREDITS_BY_PACK: Record<CreditPackKey, number> = {
  small: 50,
  medium: 150,
  large: 400,
  power: 1000,
};

function assertStripePriceId(id: string, envKey: string): string {
  const t = id.trim();
  if (!t.startsWith("price_")) {
    throw new Error(`${envKey} must be a Stripe Price ID (price_*), not a product ID`);
  }
  return t;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) {
    throw new Error(`Missing ${name}`);
  }
  return v.trim();
}

/** Server-side: Stripe Price ID for a subscription plan. */
export function getPlanStripePriceId(plan: PlanKey): string {
  const key = PLAN_ENV_KEYS[plan];
  return assertStripePriceId(requireEnv(key), key);
}

/** Server-side: Stripe Price ID for a credit pack. */
export function getCreditPackStripePriceId(pack: CreditPackKey): string {
  const key = PACK_ENV_KEYS[pack];
  return assertStripePriceId(requireEnv(key), key);
}

export function isPlanKey(v: unknown): v is PlanKey {
  return typeof v === "string" && v in PLAN_ENV_KEYS;
}

export function isCreditPackKey(v: unknown): v is CreditPackKey {
  return typeof v === "string" && v in PACK_ENV_KEYS;
}

/** Map Stripe subscription line item price → plan key (webhook / sync). */
export function getPlanKeyFromStripePriceId(priceId: string): PlanKey | null {
  for (const key of PLAN_KEYS) {
    const envVal = process.env[PLAN_ENV_KEYS[key]]?.trim();
    if (envVal && envVal === priceId) return key;
  }
  return null;
}

/** Map Stripe checkout line item price → pack key (optional verification). */
export function getCreditPackKeyFromStripePriceId(
  priceId: string
): CreditPackKey | null {
  for (const key of CREDIT_PACK_KEYS) {
    const envVal = process.env[PACK_ENV_KEYS[key]]?.trim();
    if (envVal && envVal === priceId) return key;
  }
  return null;
}

export function monthlyCreditsForPlan(plan: PlanKey): number {
  return PLANS[plan].credits;
}

export function creditsForPack(pack: CreditPackKey): number {
  return CREDIT_PACKS[pack].credits;
}

/** For dashboard / UI: monthly subscription credits, or null if free. */
export function monthlySubscriptionCreditsForUserPlan(
  plan: string
): number | null {
  if (isPlanKey(plan)) return PLANS[plan].credits;
  return null;
}
