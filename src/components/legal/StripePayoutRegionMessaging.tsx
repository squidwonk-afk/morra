import { cn } from "@/components/ui/utils";

/** Shown before Connect / onboarding — calm, factual. */
export function StripeOnboardingRegionNote({ className }: { className?: string }) {
  return (
    <p className={cn("text-sm text-[#A0A0A0] leading-relaxed", className)}>
      Payout availability depends on your country and Stripe support.
    </p>
  );
}

type WithdrawClarificationsProps = {
  className?: string;
  /** Stronger copy when withdrawal likely failed for country / Stripe eligibility. */
  emphasizeRegionalLimit?: boolean;
  /** Shorter copy for tight layouts (e.g. popovers). */
  compact?: boolean;
};

/**
 * Withdraw / earnings context: general clarity + optional emphasis + support path.
 * Does not block actions — informational only.
 */
export function StripePayoutWithdrawClarifications({
  className,
  emphasizeRegionalLimit = false,
  compact = false,
}: WithdrawClarificationsProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[#00FF94]/15 bg-[#0A0A0A]/60 px-4 py-3 space-y-2 text-sm text-[#B0B0B0] leading-relaxed",
        compact && "py-2.5 px-3 space-y-1.5 text-xs",
        className
      )}
    >
      {emphasizeRegionalLimit ? (
        <p>
          Payouts may not be available in your region due to Stripe limitations. This is often set by
          Stripe or banking rules, not by MORRA.
        </p>
      ) : (
        <p>
          Cash withdrawals depend on Stripe and your location. Some countries have limits on Connect or
          bank transfers; Stripe may offer alternative options where they exist.
        </p>
      )}
      {!compact ? (
        <p className="text-xs text-[#888888]">
          Contact support through the AI assistant on morra.store, or review Stripe&apos;s documentation for
          Connect and payout availability in your country.
        </p>
      ) : (
        <p className="text-[11px] text-[#888888] leading-snug">
          Contact support or check Stripe payout availability for your country.
        </p>
      )}
    </div>
  );
}

/** Optional: broaden detection when API error text suggests eligibility / region. */
export function stripeErrorSuggestsRegionalLimit(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("country") ||
    m.includes("region") ||
    m.includes("unsupported") ||
    m.includes("not supported") ||
    m.includes("ineligible") ||
    m.includes("restricted") ||
    m.includes("not available in")
  );
}
