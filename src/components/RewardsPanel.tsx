import { Gift, Lock, Sparkles, Trophy, Award } from "lucide-react";
import { motion } from "motion/react";
import { Level } from "@/lib/gamification";

interface RewardsPanelProps {
  currentLevel: number;
  unlockedRewards: Level[];
  upcomingRewards: Level[];
}

export function RewardsPanel({
  currentLevel,
  unlockedRewards,
  upcomingRewards,
}: RewardsPanelProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Gift className="text-[#00FF94]" />
        Level Rewards
      </h2>

      {/* Upcoming Rewards */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-[#A0A0A0]">Upcoming Rewards</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {upcomingRewards.map((reward, index) => (
            <motion.div
              key={reward.level}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-xl bg-[#121212] border border-[#00FF94]/20 relative overflow-hidden group hover:border-[#00FF94]/40 transition-all"
            >
              {/* Locked overlay */}
              <div className="absolute inset-0 bg-[#0A0A0A]/50 backdrop-blur-[2px] flex items-center justify-center z-10">
                <Lock className="text-[#A0A0A0]" size={24} />
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#00FF94]/10 flex items-center justify-center">
                  <Trophy className="text-[#00FF94]" size={20} />
                </div>
                <div>
                  <p className="font-bold">Level {reward.level}</p>
                  <p className="text-xs text-[#A0A0A0]">
                    {reward.xpRequired.toLocaleString()} XP
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {reward.rewards.credits && (
                  <div className="flex items-center gap-2 text-[#00FF94]">
                    <Sparkles size={14} />
                    <span>+{reward.rewards.credits} credits</span>
                  </div>
                )}
                {reward.rewards.title && (
                  <div className="flex items-center gap-2 text-[#9BFF00]">
                    <Award size={14} />
                    <span className="text-xs">{reward.rewards.title}</span>
                  </div>
                )}
                {reward.rewards.badge && (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{reward.rewards.badge}</span>
                    <span className="text-xs text-[#A0A0A0]">Badge unlocked</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Unlocked Rewards */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-[#A0A0A0]">Unlocked Rewards</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {unlockedRewards.length === 0 ? (
            <div className="col-span-full p-8 rounded-xl bg-[#121212] border border-[#00FF94]/10 text-center">
              <p className="text-[#A0A0A0]">Level up to unlock rewards!</p>
            </div>
          ) : (
            unlockedRewards.reverse().map((reward, index) => (
              <motion.div
                key={reward.level}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-xl bg-gradient-to-br from-[#00FF94]/10 to-[#121212] border border-[#00FF94]/30 relative overflow-hidden"
              >
                {/* Unlocked checkmark */}
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#00FF94] flex items-center justify-center">
                  <span className="text-[#0A0A0A] text-xs font-bold">✓</span>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00FF94] to-[#9BFF00] flex items-center justify-center shadow-[0_0_15px_rgba(0,255,148,0.3)]">
                    <Trophy className="text-[#0A0A0A]" size={20} />
                  </div>
                  <div>
                    <p className="font-bold">Level {reward.level}</p>
                    <p className="text-xs text-[#00FF94]">Unlocked</p>
                  </div>
                </div>

                <div className="space-y-1 text-sm">
                  {reward.rewards.credits && (
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-[#00FF94]" />
                      <span>+{reward.rewards.credits} credits</span>
                    </div>
                  )}
                  {reward.rewards.title && (
                    <div className="flex items-center gap-2">
                      <Award size={14} className="text-[#9BFF00]" />
                      <span className="text-xs">{reward.rewards.title}</span>
                    </div>
                  )}
                  {reward.rewards.badge && (
                    <div className="flex items-center gap-2">
                      <span className="text-base">{reward.rewards.badge}</span>
                      <span className="text-xs text-[#A0A0A0]">Badge</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
