"use client";

import { Flame, Gift } from "lucide-react";
import { Button } from "./ui/button";
import { motion } from "motion/react";

interface DailyStreakWidgetProps {
  streak: number;
  onClaimReward?: () => void;
  canClaim?: boolean;
}

export function DailyStreakWidget({
  streak,
  onClaimReward,
  canClaim = true,
}: DailyStreakWidgetProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-6 rounded-2xl bg-gradient-to-br from-[#FF6B00]/10 to-[#121212] border border-[#FF6B00]/30 relative overflow-hidden"
    >
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-radial from-[#FF6B00]/5 to-transparent opacity-50" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
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

        {/* Progress indicator */}
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

        {/* Claim button */}
        {canClaim ? (
          <Button
            type="button"
            onClick={() => onClaimReward?.()}
            className="w-full bg-gradient-to-r from-[#FF6B00] to-[#FF9500] text-[#0A0A0A] hover:opacity-90 font-bold shadow-[0_0_20px_rgba(255,107,0,0.4)]"
          >
            <Gift className="mr-2" size={16} />
            Claim Daily Reward (+25 XP)
          </Button>
        ) : (
          <div className="w-full py-3 rounded-xl bg-[#1A1A1A] text-[#A0A0A0] text-center text-sm">
            ✓ Daily bonus claimed (UTC day)
          </div>
        )}

        {/* Streak milestones */}
        <div className="mt-4 pt-4 border-t border-[#FF6B00]/20">
          <p className="text-xs text-[#A0A0A0] mb-2">Milestone Rewards:</p>
          <div className="flex justify-between text-xs">
            <span className={streak >= 7 ? "text-[#00FF94]" : "text-[#A0A0A0]"}>
              7 days: +50 XP
            </span>
            <span className={streak >= 14 ? "text-[#00FF94]" : "text-[#A0A0A0]"}>
              14 days: +100 XP
            </span>
            <span className={streak >= 30 ? "text-[#00FF94]" : "text-[#A0A0A0]"}>
              30 days: +250 XP
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
