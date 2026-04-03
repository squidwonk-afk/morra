"use client";

import { useEffect, useMemo, useState } from "react";
import { useMorraUser } from "@/contexts/MorraUserContext";
import { displayUsername } from "@/lib/profile/username";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Copy,
  Check,
  Gift,
  TrendingUp,
  Users,
  ChevronRight,
  DollarSign,
  Sparkles,
  Medal,
  Target,
  Share2,
} from "lucide-react";

type EngagementPayload = {
  leaderboard: {
    rank: number;
    userId: string;
    displayName: string | null;
    username: string | null;
    totalEarnedCents: number;
    referralCount: number;
  }[];
  myRank: number | null;
  stats: {
    totalEarnedCents: number;
    totalConversions: number;
    activeReferrals: number;
    tier: number;
    weeklyEarnedCents: number;
  } | null;
  milestones: {
    key: string;
    threshold: number;
    credits: number;
    complete: boolean;
    claimed: boolean;
  }[];
  messages: {
    nextTierReferrals: number | null;
    weeklyUsd: string;
  };
  viewerUserId?: string;
};

const tiers = [
  {
    level: 1,
    name: "Tier 1",
    range: "1-4 referrals",
    revenueShare: 1.2,
    minReferrals: 1,
    maxReferrals: 4,
  },
  {
    level: 2,
    name: "Tier 2",
    range: "5-14 referrals",
    revenueShare: 2.0,
    minReferrals: 5,
    maxReferrals: 14,
  },
  {
    level: 3,
    name: "Tier 3",
    range: "15-49 referrals",
    revenueShare: 3.5,
    minReferrals: 15,
    maxReferrals: 49,
  },
  {
    level: 4,
    name: "Tier 4",
    range: "50+ referrals",
    revenueShare: 5.0,
    minReferrals: 50,
    maxReferrals: Infinity,
  },
];

const referredUsers: { username: string; status: string; earnings: number }[] = [];

export function Referrals() {
  const { me } = useMorraUser();
  const [copied, setCopied] = useState(false);
  const [engagement, setEngagement] = useState<EngagementPayload | null>(null);
  const [referralStats, setReferralStats] = useState({
    active: 0,
    pending: 0,
    creditsEarned: 0,
    currentTier: 1 as 1 | 2 | 3 | 4,
    tierPercentLabel: "1.2%",
    lifetimeEarnedCents: 0,
    availableBalanceCents: 0,
  });

  const referralLink = useMemo(() => {
    const code = me?.user?.referralCode;
    if (!code) return "";
    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || "";
    return `${base}/signup?ref=${code}`;
  }, [me?.user?.referralCode]);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/dashboard", { credentials: "include" });
        const d = (await r.json()) as {
          referrals?: {
            pending?: number;
            active?: number;
            tier?: number;
            tierPercentLabel?: string;
            creditsEarned?: number;
            lifetimeEarnedCents?: number;
            availableBalanceCents?: number;
          };
        };
        if (!r.ok) return;
        const ref = d.referrals;
        if (!ref) return;
        const tier = Math.min(4, Math.max(1, ref.tier ?? 1)) as 1 | 2 | 3 | 4;
        setReferralStats({
          active: ref.active ?? 0,
          pending: ref.pending ?? 0,
          creditsEarned: ref.creditsEarned ?? 0,
          currentTier: tier,
          tierPercentLabel: ref.tierPercentLabel ?? "1.2%",
          lifetimeEarnedCents: ref.lifetimeEarnedCents ?? 0,
          availableBalanceCents: ref.availableBalanceCents ?? 0,
        });
      } catch {
        /* ignore */
      }
    })();
  }, [me?.user?.id]);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/referrals/engagement", { credentials: "include", cache: "no-store" });
        const d = (await r.json()) as EngagementPayload & { ok?: boolean };
        if (!r.ok) {
          setEngagement(null);
          return;
        }
        const { ok: _o, ...rest } = d;
        void _o;
        setEngagement(rest as EngagementPayload);
      } catch {
        setEngagement(null);
      }
    })();
  }, [me?.user?.id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  async function handleNativeShare() {
    if (!referralLink || typeof navigator === "undefined" || !navigator.share) {
      handleCopy();
      return;
    }
    try {
      await navigator.share({ title: "Join MORRA", text: "Sign up with my link:", url: referralLink });
    } catch {
      /* user cancelled */
    }
  }

  const totalInvited = referralStats.active + referralStats.pending;
  const activeCount = referralStats.active;

  const currentTier = tiers[referralStats.currentTier - 1];
  const nextTier = tiers[referralStats.currentTier];
  const progressToNextTier = nextTier
    ? Math.max(
        0,
        Math.min(
          100,
          ((activeCount - currentTier.minReferrals) /
            (nextTier.minReferrals - currentTier.minReferrals)) *
            100
        )
      )
    : 100;

  const pendingEarningsUsd = (me?.earnings?.pendingCents ?? 0) / 100;
  const lifetimeEarnedUsd = referralStats.lifetimeEarnedCents / 100;
  const availableUsd = referralStats.availableBalanceCents / 100;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-3">
          <span className="text-[#00FF94]">Referral Program</span>
        </h1>
        <p className="text-xl text-[#A0A0A0]">
          Earn credits and money by inviting other artists
        </p>
      </div>

      {/* Invite Section */}
      <div className="mb-8 p-8 rounded-2xl bg-gradient-to-br from-[#00FF94]/10 to-[#121212] border border-[#00FF94]/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDAsMjU1LDE0OCwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#00FF94] flex items-center justify-center shadow-[0_0_30px_rgba(0,255,148,0.5)]">
              <Gift className="text-[#0A0A0A]" size={24} />
            </div>
            <h2 className="text-2xl font-bold">Your Referral Link</h2>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Input
              readOnly
              value={referralLink}
              className="flex-1 bg-[#0A0A0A] border-[#00FF94]/30 font-mono text-sm"
            />
            <Button
              onClick={handleCopy}
              className="bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90 shadow-[0_0_20px_rgba(0,255,148,0.4)] px-6"
            >
              {copied ? (
                <>
                  <Check size={18} className="mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={18} className="mr-2" />
                  Copy
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleNativeShare()}
              className="border-[#00FF94]/40 text-[#00FF94] hover:bg-[#00FF94]/10"
            >
              <Share2 size={18} className="mr-2" />
              Share
            </Button>
          </div>
          
          <p className="mt-4 text-sm text-[#A0A0A0]">
            Share this link with other artists. When they sign up and subscribe, you earn credits and revenue share.
          </p>
        </div>
      </div>

      {engagement ? (
        <div className="mb-8 p-5 rounded-2xl bg-[#0A0A0A] border border-[#00FF94]/25 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-[#C8C8C8]">
            <Target className="text-[#00FF94] shrink-0" size={18} />
            {engagement.messages.nextTierReferrals != null && engagement.messages.nextTierReferrals > 0 ? (
              <p>
                You are{" "}
                <span className="text-[#00FF94] font-bold tabular-nums">
                  {engagement.messages.nextTierReferrals}
                </span>{" "}
                active referrals away from the next tier.
              </p>
            ) : engagement.messages.nextTierReferrals === null && engagement.stats && engagement.stats.activeReferrals >= 50 ? (
              <p>You&apos;re at the top tier, keep growing your network.</p>
            ) : engagement.stats ? (
              <p>You&apos;ve reached the next tier threshold. Keep invites coming.</p>
            ) : (
              <p>Climb tiers with validated, active referrals.</p>
            )}
          </div>
          <p className="text-sm text-[#A0A0A0]">
            You earned{" "}
            <span className="text-white font-semibold tabular-nums">${engagement.messages.weeklyUsd}</span>{" "}
            this week from referral revenue (leaderboard ledger).
          </p>
        </div>
      ) : null}

      {engagement ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#707070] mb-2">Growth earnings</p>
            <p className="text-3xl font-bold text-[#00FF94] tabular-nums">
              ${((engagement?.stats?.weeklyEarnedCents ?? 0) / 100).toFixed(2)}
            </p>
            <p className="text-sm text-[#A0A0A0] mt-1">This week (UTC) · referral ledger</p>
          </div>
          <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#707070] mb-2">Total (ledger)</p>
            <p className="text-3xl font-bold text-white tabular-nums">
              ${((engagement?.stats?.totalEarnedCents ?? 0) / 100).toFixed(2)}
            </p>
            <p className="text-sm text-[#A0A0A0] mt-1">
              {engagement?.stats?.totalConversions ?? 0} paid conversions ·{" "}
              {engagement?.stats?.activeReferrals ?? 0} active (validated)
            </p>
          </div>
        </div>
      ) : null}

      {engagement && engagement.milestones.length ? (
        <div className="mb-8 p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Medal className="text-[#00FF94]" size={22} />
            Referral milestones
          </h2>
          <p className="text-xs text-[#707070] mb-4">
            Bonus credits when paid conversions hit each threshold (one-time per milestone).
          </p>
          <div className="space-y-4">
            {engagement.milestones.map((m) => {
              const progressPct =
                m.threshold > 0
                  ? Math.min(100, ((engagement.stats?.totalConversions ?? 0) / m.threshold) * 100)
                  : 0;
              return (
                <div key={m.key} className="rounded-xl border border-[#00FF94]/12 bg-[#0A0A0A]/60 p-4">
                  <div className="flex justify-between gap-3 mb-2">
                    <span className="text-sm font-medium text-[#E0E0E0]">
                      {m.threshold} conversions →{" "}
                      <span className="text-[#00FF94] font-bold">{m.credits} credits</span>
                    </span>
                    <span className="text-xs shrink-0">
                      {m.claimed ? (
                        <span className="text-[#00FF94]">Claimed</span>
                      ) : m.complete ? (
                        <span className="text-[#E0B040]">Unlocking…</span>
                      ) : (
                        <span className="text-[#707070]">In progress</span>
                      )}
                    </span>
                  </div>
                  <Progress value={progressPct} className="h-2" />
                  <p className="text-[11px] text-[#707070] mt-1 tabular-nums">
                    {engagement.stats?.totalConversions ?? 0} / {m.threshold}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {engagement && engagement.leaderboard.length > 0 ? (
        <div className="mb-8 p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Medal className="text-[#00FF94]" size={22} />
              Referral leaderboard
            </h2>
            {engagement.myRank != null ? (
              <span className="text-sm text-[#A0A0A0]">
                Your rank: <span className="text-[#00FF94] font-bold">#{engagement.myRank}</span>
              </span>
            ) : null}
          </div>
          <ol className="space-y-2">
            {engagement.leaderboard.map((row) => {
              const isYou = engagement.viewerUserId && row.userId === engagement.viewerUserId;
              const label =
                row.displayName?.trim() ||
                displayUsername(row.username) ||
                "Artist";
              return (
                <li
                  key={row.userId}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 border transition-all ${
                    isYou
                      ? "bg-[#00FF94]/10 border-[#00FF94]/45 ring-1 ring-[#00FF94]/25"
                      : "bg-[#0A0A0A]/50 border-[#00FF94]/10"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg font-bold text-[#00FF94] w-8 tabular-nums shrink-0">
                      {row.rank}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-[#E0E0E0] truncate">
                        {label}
                        {isYou ? (
                          <span className="ml-2 text-[10px] uppercase text-[#00FF94]">You</span>
                        ) : null}
                      </p>
                      <p className="text-xs text-[#707070]">
                        {row.referralCount} conversions (ledger)
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-white tabular-nums">
                      ${(row.totalEarnedCents / 100).toFixed(2)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}

      {/* Earnings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20 hover:border-[#00FF94]/40 transition-all hover:shadow-[0_0_30px_rgba(0,255,148,0.15)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[#00FF94]/10 flex items-center justify-center">
              <Sparkles className="text-[#00FF94]" size={20} />
            </div>
            <span className="text-[#A0A0A0]">Total Credits Earned</span>
          </div>
          <p className="text-4xl font-bold text-[#00FF94]">{referralStats.creditsEarned}</p>
          <p className="text-sm text-[#A0A0A0] mt-1">Total invited: {totalInvited}</p>
        </div>

        <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20 hover:border-[#00FF94]/40 transition-all hover:shadow-[0_0_30px_rgba(0,255,148,0.15)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[#00FF94]/10 flex items-center justify-center">
              <DollarSign className="text-[#00FF94]" size={20} />
            </div>
            <span className="text-[#A0A0A0]">USD balances</span>
          </div>
          <p className="text-lg font-bold text-white">
            Available: <span className="text-[#00FF94]">${availableUsd.toFixed(2)}</span>
          </p>
          <p className="text-lg font-bold text-white mt-1">
            Lifetime earned (est.):{" "}
            <span className="text-[#00FF94]">${lifetimeEarnedUsd.toFixed(2)}</span>
          </p>
          <p className="text-sm text-[#A0A0A0] mt-2">
            Pending (maturity): ${pendingEarningsUsd.toFixed(2)} ·{" "}
            {referralStats.tierPercentLabel} rev. share tier
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20 hover:border-[#00FF94]/40 transition-all hover:shadow-[0_0_30px_rgba(0,255,148,0.15)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[#00FF94]/10 flex items-center justify-center">
              <Users className="text-[#00FF94]" size={20} />
            </div>
            <span className="text-[#A0A0A0]">Active Referrals</span>
          </div>
          <p className="text-4xl font-bold text-[#00FF94]">{activeCount}</p>
          <p className="text-sm text-[#A0A0A0] mt-1">
            {referralStats.pending} pending · Currently {currentTier.name}
          </p>
        </div>
      </div>

      {/* Tier Progress */}
      <div className="mb-8 p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="text-[#00FF94]" size={20} />
          Your Progress
        </h2>
        {nextTier ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#A0A0A0]">
                {activeCount} / {nextTier.minReferrals} active referrals to {nextTier.name}
              </span>
              <span className="text-[#00FF94] font-bold">
                {Math.round(progressToNextTier)}%
              </span>
            </div>
            <Progress value={progressToNextTier} className="h-3 mb-4" />
            <p className="text-sm text-[#A0A0A0]">
              {Math.max(0, nextTier.minReferrals - activeCount)} more active referrals to unlock{" "}
              <span className="text-[#00FF94] font-bold">+10 credits</span> per referral and{" "}
              <span className="text-[#00FF94] font-bold">{nextTier.revenueShare}% revenue share</span>
            </p>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-[#00FF94] font-bold mb-2">🎉 Maximum Tier Reached!</p>
            <p className="text-[#A0A0A0]">
              You are earning the highest rewards. Keep inviting to maximize your revenue!
            </p>
          </div>
        )}
      </div>

      {/* Tier Ladder */}
      <div className="mb-8 p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
        <h2 className="text-xl font-bold mb-6">Referral Tiers</h2>
        <div className="space-y-4">
          {tiers.map((tier) => {
            const isActive = tier.level === referralStats.currentTier;
            const isPast = tier.level < referralStats.currentTier;

            return (
              <div
                key={tier.level}
                className={`p-6 rounded-xl border transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-[#00FF94]/10 to-transparent border-[#00FF94] shadow-[0_0_30px_rgba(0,255,148,0.2)]"
                    : isPast
                    ? "bg-[#0A0A0A] border-[#00FF94]/10 opacity-60"
                    : "bg-[#0A0A0A] border-[#00FF94]/10 opacity-40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg ${
                        isActive
                          ? "bg-[#00FF94] text-[#0A0A0A] shadow-[0_0_20px_rgba(0,255,148,0.5)]"
                          : isPast
                          ? "bg-[#00FF94]/20 text-[#00FF94]"
                          : "bg-[#1a1a1a] text-[#A0A0A0]"
                      }`}
                    >
                      {tier.level}
                    </div>
                    <div>
                      <h3 className={`font-bold text-lg ${isActive ? "text-[#00FF94]" : ""}`}>
                        {tier.name}
                      </h3>
                      <p className="text-sm text-[#A0A0A0]">{tier.range}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#00FF94]">+10 credits</p>
                    <p className="text-sm text-[#A0A0A0]">{tier.revenueShare}% revenue share</p>
                  </div>
                </div>
                {isActive && (
                  <div className="mt-4 pt-4 border-t border-[#00FF94]/20">
                    <p className="text-sm text-[#00FF94] flex items-center gap-2">
                      <ChevronRight size={16} />
                      Current Tier - Active Now
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Referral List */}
      <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
        <h2 className="text-xl font-bold mb-6">Your Referrals</h2>
        <div className="space-y-3">
          {referredUsers.map((user, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 rounded-xl bg-[#0A0A0A] border border-[#00FF94]/10 hover:border-[#00FF94]/30 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00FF94] to-[#9BFF00] flex items-center justify-center">
                  <span className="text-[#0A0A0A] font-bold text-sm">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold">{user.username}</p>
                  <p className="text-sm text-[#A0A0A0]">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs ${
                        user.status === "Pro"
                          ? "bg-[#00FF94]/20 text-[#00FF94]"
                          : user.status === "Starter"
                          ? "bg-[#9BFF00]/20 text-[#9BFF00]"
                          : "bg-[#A0A0A0]/20 text-[#A0A0A0]"
                      }`}
                    >
                      {user.status}
                    </span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-[#00FF94]">
                  ${user.earnings.toFixed(2)}/mo
                </p>
                <p className="text-xs text-[#A0A0A0]">Revenue</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fair Usage Notice */}
      <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-[#00FF94]/5 to-[#9BFF00]/5 border border-[#00FF94]/20">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#00FF94]/20 flex items-center justify-center flex-shrink-0 mt-1">
            <Sparkles className="text-[#00FF94]" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold mb-2 text-[#00FF94]">Fair Usage & Sustainability</h3>
            <p className="text-[#A0A0A0] text-sm leading-relaxed mb-3">
              To keep MORRA sustainable and fair for all creators, referral rewards activate after meaningful platform usage. Revenue share applies only to active, paying subscribers. This prevents exploitation and ensures genuine community growth.
            </p>
            <p className="text-xs text-[#A0A0A0]/80">
              💚 Building a platform that works for everyone, not just those gaming the system.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}