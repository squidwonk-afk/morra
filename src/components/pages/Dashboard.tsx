"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { DailyStreakWidget } from "@/components/DailyStreakWidget";
import { DailyUsageTracker } from "@/components/DailyUsageTracker";
import { LevelLadder } from "@/components/LevelLadder";
import { XPBar } from "@/components/XPBar";
import { FirstTimeGiftModal, FIRST_SESSION_KEY } from "@/components/FirstTimeGiftModal";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useMorraUser } from "@/contexts/MorraUserContext";
import { computeXpProgressFromLadder } from "@/lib/gamification/xp-progress";
import { displayUsername } from "@/lib/profile/username";
import { monthlySubscriptionCreditsForUserPlan } from "@/lib/pricing";
import { ArrowRight, Calendar, Clock, CreditCard, Image, Music, Sparkles, User } from "lucide-react";
import { toast } from "sonner";

type Dash = {
  profile?: { display_name?: string; username?: string; plan?: string };
  credits?: { balance?: number };
  xp?: { xp?: number; level?: number; streak?: number; lastActiveDate?: string | null };
  xpProgress?: {
    currentLevel?: number;
    currentLevelXP?: number;
    nextLevelXP?: number;
    progressPercent?: number;
    xpToNextLevel?: number;
  };
  freeTier?: {
    generationsLast24h?: number;
    freeGenerationsRemaining?: number | null;
    dailyCap?: number;
    windowHours?: number | null;
  };
  recentActivity?: { id: string; type: string; title: string; createdAt: string }[];
  dailyBonus?: { claimedToday?: boolean };
  xpLadder?: { level: number; xpRequired: number; unlocked: boolean; current: boolean }[];
};

const quickActions = [
  {
    icon: User,
    title: "Generate Bio",
    description: "Create artist bio & EPK",
    path: "/app/identity",
    color: "from-[#00FF94] to-[#9BFF00]",
  },
  {
    icon: Calendar,
    title: "Plan Release",
    description: "Build rollout timeline",
    path: "/app/rollout",
    color: "from-[#9BFF00] to-[#00FF94]",
  },
  {
    icon: Music,
    title: "Analyze Lyrics",
    description: "Get flow insights",
    path: "/app/lyrics",
    color: "from-[#00FF94] to-[#00ccff]",
  },
  {
    icon: Image,
    title: "Cover Concepts",
    description: "Generate art ideas",
    path: "/app/cover",
    color: "from-[#00ccff] to-[#9BFF00]",
  },
];

function activityIcon(type: string) {
  if (type === "rollout") return Calendar;
  if (type === "lyrics") return Music;
  if (type === "cover") return Image;
  if (type === "collab") return User;
  return User;
}

function activityLabel(type: string) {
  const m: Record<string, string> = {
    identity: "Bio / Identity",
    rollout: "Release planned",
    lyrics: "Lyrics analyzed",
    cover: "Cover concepts",
    collab: "Collab search",
  };
  return m[type] ?? "Generation";
}

export function Dashboard() {
  const { me, refresh } = useMorraUser();
  const [dash, setDash] = useState<Dash | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [giftOpen, setGiftOpen] = useState(false);
  const [claimBusy, setClaimBusy] = useState(false);
  const [xpAnim, setXpAnim] = useState(false);
  const [connectBusy, setConnectBusy] = useState(false);
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const connectInFlightRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/dashboard", { credentials: "include", cache: "no-store" });
      const j = (await r.json()) as Dash & { ok?: boolean; error?: string };
      if (!r.ok) {
        setLoadError(j.error || "Could not load dashboard");
        return;
      }
      setLoadError(null);
      setDash(j);
    } catch {
      setLoadError("Network error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!me?.user?.id || me.user.giftClaimed) return;
    const today = new Date().toISOString().slice(0, 10);
    if (typeof window === "undefined") return;
    if (localStorage.getItem(FIRST_SESSION_KEY) !== today) return;
    const mark = sessionStorage.getItem("morra_gift_modal_shown");
    if (mark === `${me.user.id}:${today}`) return;
    sessionStorage.setItem("morra_gift_modal_shown", `${me.user.id}:${today}`);
    setGiftOpen(true);
  }, [me?.user]);

  const displayName = dash?.profile?.display_name ?? me?.user?.displayName ?? "Artist";
  const userHandle = displayUsername(dash?.profile?.username ?? me?.user?.username);
  const plan = dash?.profile?.plan ?? "free";
  const balance = dash?.credits?.balance ?? 0;
  const stripeLinked = Boolean(me?.user?.stripeConnectAccountId?.trim());
  const availableCents = me?.earnings?.availableCents ?? 0;
  const pendingEarningsCents = me?.earnings?.pendingCents ?? 0;
  const minPayoutCents = me?.minPayoutCents ?? 500;
  const nextPendingReleaseAt = me?.nextPendingReleaseAt ?? null;
  const payoutInProgress = Boolean(me?.payoutInProgress);
  const earningsUsd = (availableCents / 100).toFixed(2);
  const canWithdraw =
    stripeLinked &&
    availableCents >= minPayoutCents &&
    !(me?.user?.flagged ?? false) &&
    !payoutInProgress;
  const monthlyPack = monthlySubscriptionCreditsForUserPlan(plan);
  const cap = monthlyPack ?? Math.max(balance, 1);
  const creditPercent = Math.min(100, Math.round((balance / cap) * 100));

  const usedFree =
    plan === "free" ? (dash?.freeTier?.generationsLast24h ?? 0) : 0;
  const freeCap = dash?.freeTier?.dailyCap ?? 1;

  const canClaimDaily = !(dash?.dailyBonus?.claimedToday ?? false);
  const userXP = dash?.xp?.xp ?? 0;
  const xpProgress = dash?.xpProgress;

  async function handleStartCreatingFromGift() {
    try {
      await fetch("/api/onboarding/gift/seen", { method: "POST", credentials: "include" });
    } catch {
      // ignore
    } finally {
      setGiftOpen(false);
      await refresh();
    }
  }

  async function handleWithdrawEarnings() {
    if (withdrawBusy || !canWithdraw) return;
    setWithdrawBusy(true);
    try {
      const r = await fetch("/api/stripe/payout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const j = (await r.json()) as {
        ok?: boolean;
        error?: string;
        amountCents?: number;
      };
      if (!r.ok) {
        toast.error(j.error || "Withdrawal failed");
        return;
      }
      const usd =
        typeof j.amountCents === "number"
          ? new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(
              j.amountCents / 100
            )
          : null;
      toast.success(usd ? `Sent ${usd} to your Stripe account.` : "Withdrawal sent.");
      await refresh();
      await load();
    } catch {
      toast.error("Network error");
    } finally {
      setWithdrawBusy(false);
    }
  }

  async function handleConnectStripe() {
    if (connectBusy || connectInFlightRef.current) return;
    connectInFlightRef.current = true;
    setConnectBusy(true);
    try {
      const r = await fetch("/api/stripe/connect/create", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
      const j = (await r.json()) as { url?: string; error?: string };
      if (!r.ok) {
        toast.error(j.error || "Could not start Stripe setup");
        return;
      }
      if (j.url) {
        window.location.href = j.url;
        return;
      }
      toast.error("No redirect URL returned");
    } catch {
      toast.error("Network error");
    } finally {
      connectInFlightRef.current = false;
      setConnectBusy(false);
    }
  }

  async function handleClaimDailyReward() {
    if (claimBusy) return;
    setClaimBusy(true);
    try {
      const r = await fetch("/api/claim-xp", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
      const j = (await r.json()) as {
        ok?: boolean;
        error?: string;
        xp?: number;
        newXP?: number;
        newLevel?: number;
        newStreak?: number;
        level?: number;
        streak?: number;
        xpGained?: number;
      };
      if (!r.ok) {
        toast.error(j.error || "Could not apply daily bonus");
        return;
      }
      await refresh();
      const xpVal = j.newXP ?? j.xp;
      const lv = typeof j.newLevel === "number" ? j.newLevel : j.level;
      const st = typeof j.newStreak === "number" ? j.newStreak : j.streak;
      const gained = j.xpGained ?? 25;
      if (typeof xpVal === "number") {
        setXpAnim(true);
        setDash((prev) => {
          if (!prev?.xpLadder?.length) return prev;
          const ladder = prev.xpLadder.map((run) => ({
            level: run.level,
            xpRequired: run.xpRequired,
          }));
          const xpProg = computeXpProgressFromLadder(xpVal, ladder);
          const levelResolved =
            typeof lv === "number" ? lv : xpProg.currentLevel;
          const streakResolved =
            typeof st === "number" ? st : (prev.xp?.streak ?? 0);
          return {
            ...prev,
            xp: {
              ...prev.xp,
              xp: xpVal,
              level: levelResolved,
              streak: streakResolved,
            },
            xpProgress: xpProg,
            dailyBonus: { claimedToday: true },
            xpLadder: prev.xpLadder.map((run) => ({
              ...run,
              unlocked: xpVal >= run.xpRequired,
              current: run.level === levelResolved,
            })),
          };
        });
        window.setTimeout(() => setXpAnim(false), 1800);
      }
      toast.success(`Daily bonus claimed (+${gained} XP)`);
    } finally {
      setClaimBusy(false);
      await load();
      await refresh();
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <FirstTimeGiftModal
        open={giftOpen}
        onStart={() => void handleStartCreatingFromGift()}
      />

      {loadError ? (
        <p className="text-red-400 mb-6">{loadError}</p>
      ) : null}

      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-3">
          Welcome back,{" "}
          <span className="text-[#00FF94]">{displayName}</span>
        </h1>
        <p className="text-lg text-[#00FF94]/90 font-medium mb-2">@{userHandle}</p>
        <p className="text-xl text-[#A0A0A0]">
          Let&apos;s create something incredible today
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        <div className="lg:col-span-2">
          <XPBar
            currentXP={userXP}
            currentLevelXP={xpProgress?.currentLevelXP ?? 0}
            nextLevelXP={xpProgress?.nextLevelXP ?? 0}
            progressPercent={xpProgress?.progressPercent ?? 0}
            xpToNextLevel={xpProgress?.xpToNextLevel ?? 0}
            currentLevel={xpProgress?.currentLevel ?? dash?.xp?.level ?? 1}
            showAnimation={xpAnim}
          />
        </div>
        <DailyStreakWidget
          streak={dash?.xp?.streak ?? 0}
          onClaimReward={() => void handleClaimDailyReward()}
          canClaim={canClaimDaily && !claimBusy}
        />
      </div>

      {dash?.xpLadder?.length ? (
        <div className="mb-12">
          <LevelLadder rungs={dash.xpLadder} currentXp={userXP} />
        </div>
      ) : null}

      <div className="mb-12 rounded-2xl bg-[#121212] border border-[#00FF94]/20 p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Credits Remaining</h2>
            <p className="text-[#A0A0A0]">Your current generation balance</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-[#00FF94]">{balance}</p>
            <p className="text-[#A0A0A0] text-sm">credits</p>
          </div>
        </div>
        <Progress value={creditPercent} className="h-3 bg-[#121212]" />
        <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-[#A0A0A0]">
            <Sparkles className="inline mr-2" size={16} />
            Plan: <span className="text-[#00FF94] capitalize">{plan}</span>
          </p>
          <div className="flex gap-3">
            <Link href="/pricing#credits">
              <Button
                size="sm"
                className="bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90 shadow-[0_0_20px_rgba(0,255,148,0.3)]"
              >
                Buy Credits
              </Button>
            </Link>
            <Link href="/pricing#upgrade">
              <Button
                variant="outline"
                size="sm"
                className="border-[#00FF94]/30 text-[#00FF94] hover:bg-[#00FF94]/10"
              >
                Upgrade Plan
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="mb-12 rounded-2xl bg-[#121212] border border-[#00FF94]/20 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#00FF94]/10 flex items-center justify-center flex-shrink-0">
              <CreditCard className="text-[#00FF94]" size={22} />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1">Payouts / Earnings</h2>
              <p className="text-[#A0A0A0] text-sm max-w-xl">
                You may earn based on qualifying referrals. Payouts are processed by Stripe and may be
                delayed (including in-app holds and bank settlement). All payouts are in USD. Nothing here
                is guaranteed income.
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right flex-shrink-0 space-y-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#707070] mb-1">Available</p>
              <p className="text-2xl font-bold text-[#00FF94]">${earningsUsd}</p>
              <p className="text-xs text-[#707070]">
                Minimum withdrawal {new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(minPayoutCents / 100)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[#707070] mb-1">Pending</p>
              <p className="text-lg font-semibold text-[#E0E0E0]">
                ${(pendingEarningsCents / 100).toFixed(2)}
              </p>
              {nextPendingReleaseAt && pendingEarningsCents > 0 ? (
                <p className="text-xs text-[#707070] max-w-[220px] sm:ml-auto sm:text-right">
                  Available in {formatDistanceToNow(new Date(nextPendingReleaseAt), { addSuffix: true })} (
                  ~10-day hold from accrual)
                </p>
              ) : (
                <p className="text-xs text-[#707070] max-w-[220px] sm:ml-auto sm:text-right">
                  New referral earnings start in pending; they become available after a ~10-day hold.
                </p>
              )}
            </div>
          </div>
        </div>
        {stripeLinked ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-[#00FF94]/15 border border-[#00FF94]/40 px-4 py-1.5 text-sm font-semibold text-[#00FF94]">
                Stripe Connected
              </span>
              <p className="text-sm text-[#A0A0A0]">
                Withdraw sends your full available USD balance to Stripe (min{" "}
                {new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(
                  minPayoutCents / 100
                )}
                ). Stripe pays out to your bank on its schedule; transfers can take time.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
              <Button
                type="button"
                disabled={withdrawBusy || !canWithdraw}
                onClick={() => void handleWithdrawEarnings()}
                variant="outline"
                className="border-[#00FF94]/50 text-[#00FF94] hover:bg-[#00FF94]/10 w-full sm:w-auto disabled:opacity-50"
              >
                {withdrawBusy ? "Withdrawing…" : "Withdraw Earnings"}
              </Button>
              {payoutInProgress ? (
                <p className="text-sm text-[#E0B040]">A withdrawal is processing. Refresh in a moment.</p>
              ) : me?.user?.flagged ? (
                <p className="text-sm text-[#FF6B00]">Withdrawals are temporarily unavailable.</p>
              ) : availableCents <= 0 ? (
                <p className="text-sm text-[#707070]">No available balance to withdraw.</p>
              ) : availableCents < minPayoutCents ? (
                <p className="text-sm text-[#707070]">
                  Minimum withdrawal{" "}
                  {new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(
                    minPayoutCents / 100
                  )}
                  .
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Button
                type="button"
                disabled={connectBusy}
                onClick={() => void handleConnectStripe()}
                className="bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90 shadow-[0_0_20px_rgba(0,255,148,0.25)] w-full sm:w-auto"
              >
                {connectBusy ? "Connecting…" : "Connect Stripe"}
              </Button>
              <p className="text-sm text-[#707070]">
                Connect Stripe first to withdraw. See the FAQ for how payouts work.
              </p>
            </div>
            <Button
              type="button"
              disabled
              variant="outline"
              className="border-[#00FF94]/20 text-[#505050] w-full sm:w-auto cursor-not-allowed"
            >
              Withdraw Earnings
            </Button>
            <p className="text-sm text-[#707070]">Connect Stripe first</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
        <DailyUsageTracker
          used={usedFree}
          total={freeCap}
          plan={plan === "free" ? "Free" : plan}
        />
      </div>

      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link key={index} href={action.path}>
                <div className="group p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20 hover:border-[#00FF94]/50 transition-all hover:shadow-[0_0_30px_rgba(0,255,148,0.2)] cursor-pointer h-full">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(0,255,148,0.3)]`}
                  >
                    <Icon className="text-[#0A0A0A]" size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-2 group-hover:text-[#00FF94] transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-[#A0A0A0] text-sm mb-4">{action.description}</p>
                  <div className="flex items-center text-[#00FF94] opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-sm">Start now</span>
                    <ArrowRight className="ml-2" size={16} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
        <div className="rounded-2xl bg-[#121212] border border-[#00FF94]/20 overflow-hidden">
          {(dash?.recentActivity ?? []).map((activity, index, arr) => {
            const Icon = activityIcon(activity.type);
            return (
              <div
                key={activity.id}
                className={`p-6 flex items-center gap-4 hover:bg-[#00FF94]/5 transition-colors ${
                  index !== arr.length - 1 ? "border-b border-[#00FF94]/10" : ""
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-[#00FF94]/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="text-[#00FF94]" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#A0A0A0] mb-1">
                    {activityLabel(activity.type)}
                  </p>
                  <p className="font-semibold truncate">{activity.title}</p>
                </div>
                <div className="flex items-center text-[#A0A0A0] text-sm whitespace-nowrap">
                  <Clock size={16} className="mr-2" />
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </div>
              </div>
            );
          })}

          {(dash?.recentActivity ?? []).length === 0 && (
            <div className="p-12 text-center">
              <p className="text-[#A0A0A0] mb-4">No recent activity yet</p>
              <p className="text-sm text-[#A0A0A0]">
                Start creating to see your history here
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-[#00FF94]/5 to-[#9BFF00]/5 border border-[#00FF94]/20">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#00FF94]/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="text-[#00FF94]" size={20} />
          </div>
          <div>
            <h3 className="font-bold mb-2">Pro Tip</h3>
            <p className="text-[#A0A0A0]">
              Use the Lyric Analyzer before your recording session to identify weak spots and improve
              your flow. Most artists see better results when they iterate 2-3 times.
            </p>
          </div>
        </div>
      </div>

      {/* Assistant widget removed from dashboard footer */}
    </div>
  );
}
