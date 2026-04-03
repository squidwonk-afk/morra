"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Coins, DollarSign, Sparkles } from "lucide-react";
import { useMorraUser } from "@/contexts/MorraUserContext";
import { LOW_CREDIT_THRESHOLD } from "@/lib/conversion/constants";
import { xpLevelProgress } from "@/lib/metrics/xp-level-bar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SongWarsMetricsStrip } from "@/components/metrics/SongWarsMetricsStrip";
import {
  StripeOnboardingRegionNote,
  StripePayoutWithdrawClarifications,
  stripeErrorSuggestsRegionalLimit,
} from "@/components/legal/StripePayoutRegionMessaging";
import { toast } from "sonner";

function formatUsd(cents: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

/**
 * App-wide visibility strip: earnings, credits, XP — does not replace Navbar.
 */
export function GlobalMetricsHub() {
  const { me, refresh } = useMorraUser();
  const [earnOpen, setEarnOpen] = useState(false);
  const [payoutBusy, setPayoutBusy] = useState(false);
  const [payoutRegionalEmphasis, setPayoutRegionalEmphasis] = useState(false);

  const prevXpRef = useRef<number | null>(null);
  const prevAvailRef = useRef<number | null>(null);
  const [xpFlash, setXpFlash] = useState(false);
  const [earnFlash, setEarnFlash] = useState(false);

  const userId = me?.user?.id;
  const isGod = me?.user?.isGod ?? false;

  const credits = me?.credits?.balance ?? 0;
  const lowCredits = !isGod && credits > 0 && credits < LOW_CREDIT_THRESHOLD;
  const xpVal = me?.xp?.xp ?? 0;
  const levelFromMe = me?.xp?.level ?? 1;
  const { level: levelCalc, progressPercent, xpToNext } = xpLevelProgress(xpVal);
  const level = Math.max(1, levelFromMe, levelCalc);

  const availableCents = me?.earnings?.availableCents ?? 0;
  const pendingCents = me?.earnings?.pendingCents ?? 0;
  const minPayoutCents = me?.minPayoutCents ?? 500;
  const stripeConnected = Boolean(me?.user?.stripeConnectAccountId);
  const payoutInProgress = me?.payoutInProgress ?? false;
  const flagged = me?.user?.flagged ?? false;

  useEffect(() => {
    if (!userId) return;
    const prev = prevXpRef.current;
    prevXpRef.current = xpVal;
    if (prev !== null && xpVal > prev) {
      setXpFlash(true);
      const t = window.setTimeout(() => setXpFlash(false), 900);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [userId, xpVal]);

  useEffect(() => {
    if (!userId) return;
    const prev = prevAvailRef.current;
    prevAvailRef.current = availableCents;
    if (prev !== null && prev !== availableCents) {
      setEarnFlash(true);
      const t = window.setTimeout(() => setEarnFlash(false), 700);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [userId, availableCents]);

  async function withdraw() {
    if (!stripeConnected || payoutInProgress || flagged) return;
    if (availableCents < minPayoutCents) {
      toast.error(`Minimum withdrawal is ${formatUsd(minPayoutCents)}`);
      return;
    }
    setPayoutBusy(true);
    try {
      const r = await fetch("/api/stripe/payout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) {
        const msg = j.error || "Withdrawal failed";
        if (stripeErrorSuggestsRegionalLimit(msg)) setPayoutRegionalEmphasis(true);
        toast.error(msg);
        return;
      }
      setPayoutRegionalEmphasis(false);
      toast.success("Withdrawal initiated.");
      await refresh();
      setEarnOpen(false);
    } finally {
      setPayoutBusy(false);
    }
  }

  if (!userId) return null;

  const canWithdraw =
    stripeConnected && !payoutInProgress && !flagged && availableCents >= minPayoutCents;

  return (
    <div className="w-full border-b border-[#00FF94]/10 bg-[#0A0A0A]/92 backdrop-blur-md supports-[backdrop-filter]:bg-[#0A0A0A]/80">
      <div className="px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-2 justify-between">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 min-w-0">
          <Popover open={earnOpen} onOpenChange={setEarnOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-1 text-left transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-[#00FF94]/35 data-[state=open]:[&>svg:last-of-type]:rotate-180 ${
                  earnFlash ? "bg-[#00FF94]/12" : "hover:bg-[#121212]"
                }`}
              >
                <DollarSign size={15} className="text-[#00FF94]/85 shrink-0" aria-hidden />
                <span className="text-[11px] uppercase tracking-wide text-[#707070] hidden sm:inline">
                  Earnings
                </span>
                <span className="text-sm font-semibold text-[#E8E8E8] tabular-nums">
                  {formatUsd(availableCents)}
                </span>
                <ChevronDown
                  size={14}
                  className="text-[#606060] opacity-70 transition-transform duration-200"
                />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-[min(100vw-2rem,320px)] bg-[#121212] border-[#00FF94]/20 text-[#E8E8E8] p-4 shadow-xl"
            >
              <p className="text-xs uppercase tracking-wide text-[#707070] mb-3">Referral earnings</p>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-[#A0A0A0]">Available</span>
                  <span className="font-semibold tabular-nums text-[#00FF94]">
                    {formatUsd(availableCents)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#A0A0A0]">Pending</span>
                  <span className="font-medium tabular-nums text-[#C8C8C8]">{formatUsd(pendingCents)}</span>
                </div>
              </div>
              <StripeOnboardingRegionNote className="text-xs mt-3" />
              <StripePayoutWithdrawClarifications
                className="mt-2"
                compact
                emphasizeRegionalLimit={payoutRegionalEmphasis}
              />
              <div className="mt-4 flex flex-col gap-2">
                {canWithdraw ? (
                  <Button
                    type="button"
                    disabled={payoutBusy}
                    onClick={() => void withdraw()}
                    className="w-full bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90"
                  >
                    {payoutBusy ? "Processing…" : "Withdraw"}
                  </Button>
                ) : (
                  <Button asChild variant="outline" className="w-full border-[#00FF94]/30 text-[#00FF94]">
                    <Link href="/app/payouts" onClick={() => setEarnOpen(false)}>
                      {stripeConnected ? "Complete withdrawal in Payouts" : "Set up payouts"}
                    </Link>
                  </Button>
                )}
                <Link
                  href="/app/payouts"
                  className="text-center text-xs text-[#707070] hover:text-[#00FF94] transition-colors"
                  onClick={() => setEarnOpen(false)}
                >
                  Open earnings history
                </Link>
              </div>
            </PopoverContent>
          </Popover>

          <div
            className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-1 transition-colors duration-300 ${
              lowCredits ? "bg-[#E0B040]/10 ring-1 ring-[#E0B040]/35" : "bg-[#121212]/80"
            }`}
            title={lowCredits ? "Low credits" : "Credits balance"}
          >
            <Coins size={15} className={lowCredits ? "text-[#E0B040]" : "text-[#00FF94]/85"} aria-hidden />
            <span className="text-[11px] uppercase tracking-wide text-[#707070] hidden sm:inline">
              Credits
            </span>
            <span
              className={`text-sm font-bold tabular-nums transition-colors duration-300 ${
                lowCredits ? "text-[#E0B040]" : "text-[#00FF94]"
              }`}
            >
              {isGod ? "∞" : credits.toLocaleString()}
            </span>
          </div>

          <div
            className={`flex items-center gap-3 min-w-[140px] max-w-[220px] flex-1 sm:flex-initial transition-transform duration-500 ${
              xpFlash ? "scale-[1.02]" : "scale-100"
            }`}
          >
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[11px] text-[#909090]">
                <Sparkles size={13} className="text-[#00FF94]/80 shrink-0" aria-hidden />
                <span className="font-semibold text-[#E8E8E8] tabular-nums">Lv {level}</span>
                <span className="text-[#606060] truncate">· {xpToNext} XP to next</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#1A1A1A] overflow-hidden border border-[#00FF94]/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#00FF94]/90 to-[#9BFF00]/85 transition-all duration-700 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <SongWarsMetricsStrip />
      </div>
    </div>
  );
}
