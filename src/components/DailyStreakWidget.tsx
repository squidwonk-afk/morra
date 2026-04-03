"use client";

import { useEffect, useState } from "react";
import { Flame, Gift } from "lucide-react";
import { Button } from "./ui/button";
import { motion } from "motion/react";
import { parseDate } from "@/lib/datetime/safe-date";
import { XP_REWARDS } from "@/lib/gamification";

function formatCooldown(ms: number): string {
  if (ms <= 0) return "0:00:00";
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function useCooldownCountdown(nextClaimAtIso: string | null | undefined, active: boolean): number {
  const [remainingMs, setRemainingMs] = useState(0);
  useEffect(() => {
    if (!active || !nextClaimAtIso) {
      setRemainingMs(0);
      return;
    }
    const parsed = parseDate(nextClaimAtIso);
    if (!parsed) {
      setRemainingMs(0);
      return;
    }
    const target = parsed.getTime();
    const tick = () => setRemainingMs(Math.max(0, target - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [active, nextClaimAtIso]);
  return remainingMs;
}

interface DailyStreakWidgetProps {
  streak: number;
  onClaimReward?: () => void;
  canClaim?: boolean;
  nextClaimAt?: string | null;
  claimBusy?: boolean;
}

export function DailyStreakWidget({
  streak,
  onClaimReward,
  canClaim = false,
  nextClaimAt = null,
  claimBusy = false,
}: DailyStreakWidgetProps) {
  const onCooldown = !canClaim;
  const remainingMs = useCooldownCountdown(nextClaimAt, onCooldown && Boolean(nextClaimAt));
  const xpAmt = XP_REWARDS.DAILY_LOGIN;
  const showTimer = onCooldown && Boolean(nextClaimAt);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-6 rounded-2xl bg-gradient-to-br from-[#FF6B00]/10 to-[#121212] border border-[#FF6B00]/30 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-radial from-[#FF6B00]/5 to-transparent opacity-50" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#FF9500] flex items-center justify-center shadow-[0_0_30px_rgba(255,107,0,0.5)]"
            >
              <Flame className="text-[#0A0A0A]" size={28} />
            </motion.div>
            <div>
              <h3 className="text-2xl font-bold text-[#FF6B00]">{streak}-Day Streak</h3>
              <p className="text-sm text-[#A0A0A0]">Keep it going!</p>
            </div>
          </div>
        </div>

        <div className="flex gap-1 mb-4">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-all ${
                i < streak % 7 || (streak >= 7 && streak % 7 === 0)
                  ? "bg-gradient-to-r from-[#FF6B00] to-[#FF9500] shadow-[0_0_10px_rgba(255,107,0,0.3)]"
                  : "bg-[#1A1A1A]"
              }`}
            />
          ))}
        </div>

        <Button
          type="button"
          disabled={!canClaim || claimBusy}
          onClick={() => canClaim && !claimBusy && onClaimReward?.()}
          className="w-full bg-gradient-to-r from-[#FF6B00] to-[#FF9500] text-[#0A0A0A] hover:opacity-90 font-bold shadow-[0_0_20px_rgba(255,107,0,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:opacity-50"
        >
          <Gift className="mr-2" size={16} />
          {claimBusy
            ? "Claiming…"
            : canClaim
              ? `Claim Daily Reward (+${xpAmt} XP)`
              : nextClaimAt
                ? `Available in ${formatCooldown(remainingMs)}`
                : "Already claimed"}
        </Button>
        {showTimer ? (
          <p className="mt-2 text-center text-xs text-[#A0A0A0]">Next claim unlocks after 24 hours from your last claim.</p>
        ) : null}

        <div className="mt-4 pt-4 border-t border-[#FF6B00]/20">
          <p className="text-xs text-[#A0A0A0] mb-2">Milestone Rewards:</p>
          <div className="flex justify-between text-xs">
            <span className={streak >= 7 ? "text-[#00FF94]" : "text-[#A0A0A0]"}>7 days: +50 XP</span>
            <span className={streak >= 14 ? "text-[#00FF94]" : "text-[#A0A0A0]"}>14 days: +100 XP</span>
            <span className={streak >= 30 ? "text-[#00FF94]" : "text-[#A0A0A0]"}>30 days: +250 XP</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
