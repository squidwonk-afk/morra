"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useMorraUser } from "@/contexts/MorraUserContext";
import { useMorraCheckout } from "@/hooks/use-morra-checkout";
import { CREDIT_COSTS } from "@/lib/constants/credits";
import {
  CREDIT_PACKS,
  CREDIT_PACK_KEYS,
  PLAN_FEATURE_BULLETS,
  PLANS,
  PLAN_KEYS,
  type CreditPackKey,
  type PlanKey,
} from "@/lib/pricing";
import type { ReactNode } from "react";

const FREE_PLAN = {
  name: "Free",
  priceLabel: "$0",
  creditsLabel: "1 generation / rolling 24h",
  features: [
    "1 generation per rolling 24 hours (server enforced)",
    "Full tool access when using credits",
    "AI Assistant",
    "Leveling & referrals",
  ],
};

const PLAN_MICROCOPY: Record<PlanKey, string> = {
  starter: "Core access for emerging artists",
  pro: "Best value for weekly creators",
  elite: "Maximum throughput & models",
};

function linesToFeatureNodes(lines: readonly string[]): ReactNode[] {
  return lines.map((s, i) => (
    <span key={`${s}-${i}`} className="block">
      {s}
    </span>
  ));
}

const PAID_FEATURES: Record<PlanKey, ReactNode[]> = {
  starter: linesToFeatureNodes(PLAN_FEATURE_BULLETS.starter),
  pro: linesToFeatureNodes(PLAN_FEATURE_BULLETS.pro),
  elite: linesToFeatureNodes(PLAN_FEATURE_BULLETS.elite),
};

const TOOL_COST_ROWS: { action: string; tool: keyof typeof CREDIT_COSTS; note?: string }[] = [
  { action: "Artist Bio / Identity", tool: "identity" },
  { action: "Release rollout plan", tool: "rollout" },
  { action: "Lyric analysis", tool: "lyrics", note: "depth may vary" },
  { action: "Cover art concepts", tool: "cover" },
  { action: "Collab finder", tool: "collab" },
];

function TierIncludes({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm font-semibold text-[#00FF94] tracking-wide mb-5 mt-1 leading-snug">
      {children}
    </p>
  );
}

export function Pricing() {
  const { me } = useMorraUser();
  const { startCheckout, busy } = useMorraCheckout();
  const loggedIn = Boolean(me?.user);

  return (
    <div className="min-h-screen py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            Choose Your <span className="text-[#00FF94]">Plan</span>
          </h1>
          <p className="text-xl text-[#A0A0A0] max-w-2xl mx-auto leading-relaxed">
            Pricing matches Stripe Checkout, see Settings to purchase when signed in
          </p>
        </div>

        <div
          id="upgrade"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6 max-w-7xl mx-auto mb-20 scroll-mt-24 items-stretch"
        >
          <div className="p-8 sm:p-9 rounded-2xl border bg-[#121212] border-[#00FF94]/20 flex flex-col h-full">
            <h3 className="text-2xl font-bold mb-1 text-white">{FREE_PLAN.name}</h3>
            <div className="mb-2 mt-2">
              <span className="text-5xl font-bold text-[#00FF94] tabular-nums">{FREE_PLAN.priceLabel}</span>
            </div>
            <p className="text-sm text-[#737373] mb-5 min-h-[2.5rem] leading-relaxed">
              Try every tool on your schedule
            </p>
            <p className="text-[#A0A0A0] mb-6 pb-6 border-b border-[#00FF94]/15 text-sm leading-relaxed">
              {FREE_PLAN.creditsLabel}
            </p>
            <ul className="space-y-4 mb-10 flex-1">
              {FREE_PLAN.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3.5">
                  <Check className="text-[#00FF94] flex-shrink-0 mt-0.5" size={20} strokeWidth={2.25} />
                  <span className="text-[#B5B5B5] leading-relaxed text-[15px]">{feature}</span>
                </li>
              ))}
            </ul>
            <Link href={loggedIn ? "/app" : "/signup"} className="mt-auto">
              <Button className="w-full h-11 bg-[#121212] text-[#00FF94] border border-[#00FF94]/30 hover:bg-[#00FF94]/10">
                {loggedIn ? "Dashboard" : "Get Started"}
              </Button>
            </Link>
          </div>

          {PLAN_KEYS.map((key) => {
            const plan = PLANS[key];
            const isPro = key === "pro";
            const isStarter = key === "starter";
            const isElite = key === "elite";

            const cardClass = isPro
              ? "relative z-[1] rounded-2xl border-2 border-[#00FF94] bg-gradient-to-b from-[#00FF94]/14 via-[#121212] to-[#121212] shadow-[0_0_48px_rgba(0,255,148,0.22),0_0_1px_rgba(0,255,148,0.6)] md:scale-[1.03] lg:scale-[1.04] transition-transform duration-300"
              : isElite
                ? "rounded-2xl border bg-[#121212] border-[#9BFF00]/35 ring-1 ring-[#9BFF00]/25"
                : "rounded-2xl border bg-[#121212] border-[#00FF94]/20";

            return (
              <div
                key={key}
                className={`${cardClass} p-8 sm:p-9 flex flex-col h-full`}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-[#00FF94] text-[#0A0A0A] text-xs font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(0,255,148,0.5)] whitespace-nowrap">
                    Best Value
                  </div>
                )}

                <h3 className={`text-2xl font-bold mb-1 text-white ${isPro ? "mt-3" : ""}`}>{plan.name}</h3>
                <div className="mb-2 mt-2 flex flex-wrap items-baseline gap-x-1 gap-y-0">
                  <span className="text-5xl font-bold text-[#00FF94] tabular-nums">${plan.price}</span>
                  <span className="text-[#888888] text-lg font-medium">/month</span>
                </div>
                <p className="text-sm text-[#737373] mb-5 min-h-[2.5rem] leading-relaxed">
                  {PLAN_MICROCOPY[key]}
                </p>
                <p className="text-[#A0A0A0] mb-1 pb-5 border-b border-[#00FF94]/15 text-sm leading-relaxed">
                  {plan.credits} credits / month (via Stripe subscription)
                </p>

                {!isStarter && isPro && <TierIncludes>Everything in Starter +</TierIncludes>}
                {!isStarter && isElite && <TierIncludes>Everything in Pro +</TierIncludes>}

                <ul className={`space-y-4 mb-10 flex-1 ${isStarter ? "mt-5" : ""}`}>
                  {PAID_FEATURES[key].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3.5">
                      <Check className="text-[#00FF94] flex-shrink-0 mt-0.5" size={20} strokeWidth={2.25} />
                      <span className="text-[#B5B5B5] leading-relaxed text-[15px]">{feature}</span>
                    </li>
                  ))}
                </ul>

                {loggedIn ? (
                  <Button
                    type="button"
                    disabled={busy}
                    className={`w-full h-11 mt-auto ${
                      isPro
                        ? "bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90 shadow-[0_0_24px_rgba(0,255,148,0.35)] font-semibold"
                        : "bg-[#121212] text-[#00FF94] border border-[#00FF94]/30 hover:bg-[#00FF94]/10"
                    }`}
                    onClick={() => void startCheckout({ type: "subscription", plan: key as PlanKey })}
                  >
                    Subscribe · ${plan.price}/mo
                  </Button>
                ) : (
                  <Link href="/signup" className="mt-auto">
                    <Button
                      className={`w-full h-11 ${
                        isPro
                          ? "bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90 shadow-[0_0_24px_rgba(0,255,148,0.35)] font-semibold"
                          : "bg-[#121212] text-[#00FF94] border border-[#00FF94]/30 hover:bg-[#00FF94]/10"
                      }`}
                    >
                      Get Started
                    </Button>
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center space-y-4">
          <p className="text-[#A0A0A0] max-w-2xl mx-auto leading-relaxed">
            Start free with daily access. Upgrade anytime, amounts above are defined in app config and Stripe.
          </p>
          <div className="pt-2">
            <p className="text-xs text-[#00FF94]/60">Fair usage keeps MORRA sustainable for all creators</p>
          </div>
        </div>

        <div className="mt-28 max-w-4xl mx-auto mb-16">
          <h2 className="text-3xl font-bold mb-12 text-center">Credit costs per tool</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TOOL_COST_ROWS.map((item) => (
              <div
                key={item.tool}
                className="flex items-center justify-between p-5 rounded-xl bg-[#121212] border border-[#00FF94]/20"
              >
                <span className="text-[#A0A0A0] leading-snug pr-4">
                  {item.action}
                  {item.note ? ` (${item.note})` : ""}
                </span>
                <span className="font-bold text-[#00FF94] whitespace-nowrap tabular-nums">
                  {CREDIT_COSTS[item.tool]} credits
                </span>
              </div>
            ))}
          </div>
        </div>

        <div id="credits" className="mt-16 max-w-4xl mx-auto mb-16 scroll-mt-24">
          <h2 className="text-3xl font-bold mb-4 text-center">Credit packs</h2>
          <p className="text-center text-[#A0A0A0] mb-10 max-w-xl mx-auto leading-relaxed">
            One-time packs, prices and credits match Stripe products in your Dashboard.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {CREDIT_PACK_KEYS.map((key) => {
              const pack = CREDIT_PACKS[key];
              return (
                <div
                  key={key}
                  className="p-6 sm:p-7 rounded-2xl bg-[#121212] border border-[#00FF94]/20 hover:border-[#00FF94]/40 transition-all"
                >
                  <p className="text-lg font-bold text-white mb-2">{pack.name}</p>
                  <p className="text-3xl font-bold text-[#00FF94] mb-1 tabular-nums">{pack.credits}</p>
                  <p className="text-[#A0A0A0] mb-5 text-sm">credits</p>
                  <p className="text-2xl font-bold mb-6 tabular-nums">${pack.price}</p>
                  {loggedIn ? (
                    <Button
                      type="button"
                      disabled={busy}
                      className="w-full h-11 bg-[#121212] text-[#00FF94] border border-[#00FF94]/30 hover:bg-[#00FF94]/10"
                      onClick={() => void startCheckout({ type: "credits", pack: key as CreditPackKey })}
                    >
                      Buy with Stripe
                    </Button>
                  ) : (
                    <Link href="/signup">
                      <Button className="w-full h-11 bg-[#121212] text-[#00FF94] border border-[#00FF94]/30 hover:bg-[#00FF94]/10">
                        Sign up to buy
                      </Button>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-28 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Common questions</h2>
          <div className="space-y-6">
            <div className="p-6 sm:p-7 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
              <h3 className="font-bold mb-3 text-lg">How do credits work?</h3>
              <p className="text-[#A0A0A0] leading-relaxed">
                Each tool run costs credits (see table above). Subscriptions add monthly credits when Stripe invoices
                are paid. Packs add credits immediately after checkout.
              </p>
            </div>
            <div className="p-6 sm:p-7 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
              <h3 className="font-bold mb-3 text-lg">Can I upgrade anytime?</h3>
              <p className="text-[#A0A0A0] leading-relaxed">
                Yes. Manage plans in Settings; Stripe is the source of truth for billing.
              </p>
            </div>
            <div className="p-6 sm:p-7 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
              <h3 className="font-bold mb-3 text-lg">What if I run out of credits?</h3>
              <p className="text-[#A0A0A0] leading-relaxed">
                Buy a pack or upgrade, or wait for your next free window if you are on Free.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
