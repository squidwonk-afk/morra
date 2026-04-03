/**
 * Validates required environment variables when running in production.
 * Called from `instrumentation.ts` on server startup.
 *
 * Secrets (STRIPE_SECRET_KEY, OPENROUTER_API_KEY, CRON_SECRET, etc.) must only be set
 * in Vercel Project → Settings → Environment Variables (never NEXT_PUBLIC_*).
 */
export function validateProductionEnvironment(): void {
  if (process.env.NODE_ENV !== "production") return;
  /** Preview deployments often use partial env; enforce full list on production only. */
  if (process.env.VERCEL_ENV === "preview") return;

  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "MORRA_SESSION_SECRET",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "CRON_SECRET",
  ] as const;

  for (const key of required) {
    const v = process.env[key];
    if (!v?.trim()) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  if ((process.env.MORRA_SESSION_SECRET?.length ?? 0) < 32) {
    throw new Error(
      "Missing or invalid environment variable: MORRA_SESSION_SECRET must be at least 32 characters."
    );
  }

  if (!process.env.OPENROUTER_API_KEY?.trim() && process.env.AI_PROVIDER !== "mock") {
    console.warn(
      "[MORRA] OPENROUTER_API_KEY is not set; AI will use mock mode unless AI_PROVIDER=mock is set."
    );
  }
}
