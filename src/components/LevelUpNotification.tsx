import { motion, AnimatePresence } from "motion/react";
import { Trophy, Sparkles, Gift } from "lucide-react";
import { useEffect, useState } from "react";

interface LevelUpNotificationProps {
  show: boolean;
  level: number;
  rewards?: {
    credits?: number;
    title?: string;
    badge?: string;
  };
  onClose: () => void;
}

export function LevelUpNotification({
  show,
  level,
  rewards,
  onClose,
}: LevelUpNotificationProps) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);
    if (show) {
      const timer = setTimeout(() => {
        setVisible(false);
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 50 }}
          className="fixed bottom-8 right-8 z-50 max-w-md"
        >
          <div className="relative p-6 rounded-2xl bg-gradient-to-br from-[#00FF94]/20 to-[#121212] border-2 border-[#00FF94] overflow-hidden">
            {/* Animated background glow */}
            <motion.div
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute inset-0 bg-[#00FF94]/20 blur-xl"
            />

            {/* Content */}
            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center gap-4 mb-4">
                <motion.div
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 1,
                    ease: "easeOut",
                  }}
                  className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#00FF94] to-[#9BFF00] flex items-center justify-center shadow-[0_0_40px_rgba(0,255,148,0.8)]"
                >
                  <Trophy className="text-[#0A0A0A]" size={32} />
                </motion.div>
                <div>
                  <p className="text-sm text-[#A0A0A0]">Level Up!</p>
                  <p className="text-3xl font-bold text-[#00FF94]">Level {level}</p>
                </div>
              </div>

              {/* Rewards */}
              {rewards && (
                <div className="space-y-2">
                  <p className="text-sm text-[#A0A0A0] mb-2">Rewards Unlocked:</p>
                  {rewards.credits && (
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="flex items-center gap-2"
                    >
                      <Sparkles className="text-[#00FF94]" size={16} />
                      <span className="font-bold text-[#00FF94]">
                        +{rewards.credits} Credits
                      </span>
                    </motion.div>
                  )}
                  {rewards.title && (
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="flex items-center gap-2"
                    >
                      <Gift className="text-[#9BFF00]" size={16} />
                      <span className="font-bold text-[#9BFF00]">{rewards.title}</span>
                    </motion.div>
                  )}
                  {rewards.badge && (
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="flex items-center gap-2"
                    >
                      <span className="text-2xl">{rewards.badge}</span>
                      <span className="font-bold">New Badge</span>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Close button */}
              <button
                onClick={() => {
                  setVisible(false);
                  onClose();
                }}
                className="absolute top-3 right-3 text-[#A0A0A0] hover:text-[#00FF94] transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
