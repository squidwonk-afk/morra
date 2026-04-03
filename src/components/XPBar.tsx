import { Progress } from "./ui/progress";
import { Sparkles } from "lucide-react";
import { motion } from "motion/react";

interface XPBarProps {
  currentXP: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progressPercent: number;
  xpToNextLevel: number;
  currentLevel: number;
  showAnimation?: boolean;
}

export function XPBar({
  currentXP,
  currentLevelXP,
  nextLevelXP,
  progressPercent,
  xpToNextLevel,
  currentLevel,
  showAnimation = false,
}: XPBarProps) {
  return (
    <motion.div
      initial={showAnimation ? { opacity: 0, y: 20 } : {}}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl bg-gradient-to-br from-[#00FF94]/10 to-[#121212] border border-[#00FF94]/30"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold mb-1">Level {currentLevel}</h3>
          <p className="text-sm text-[#A0A0A0]">
            {xpToNextLevel > 0
              ? `${xpToNextLevel.toLocaleString()} XP to level ${currentLevel + 1}, +150 credits on level up`
              : "Max level in ladder"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-[#00FF94]">{currentXP.toLocaleString()}</p>
          <p className="text-xs text-[#A0A0A0]">Total XP</p>
        </div>
      </div>

      <div className="relative">
        <Progress
          value={progressPercent}
          className={`h-4 bg-[#121212] ${showAnimation ? "[&_[data-slot=progress-indicator]]:transition-transform [&_[data-slot=progress-indicator]]:duration-1000 [&_[data-slot=progress-indicator]]:ease-out" : ""}`}
        />
        <style>
          {`
            [data-slot="progress-indicator"] {
              background: linear-gradient(90deg, #00FF94, #9BFF00);
              box-shadow: 0 0 20px rgba(0, 255, 148, 0.5);
            }
          `}
        </style>
        {showAnimation && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute -top-8 left-1/2 transform -translate-x-1/2"
          >
            <div className="flex items-center gap-1 text-[#00FF94] text-sm font-bold">
              <Sparkles size={16} />
              <span>XP gained</span>
            </div>
          </motion.div>
        )}
      </div>

      <div className="flex justify-between mt-2 text-xs text-[#A0A0A0]">
        <span>{currentLevelXP.toLocaleString()} XP</span>
        <span>{Math.round(progressPercent)}%</span>
        <span>{nextLevelXP.toLocaleString()} XP</span>
      </div>
    </motion.div>
  );
}