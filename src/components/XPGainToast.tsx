import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Zap, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

interface XPGainToastProps {
  show: boolean;
  amount: number;
  reason?: string;
  onClose: () => void;
}

export function XPGainToast({ show, amount, reason, onClose }: XPGainToastProps) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);
    if (show) {
      const timer = setTimeout(() => {
        setVisible(false);
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.8 }}
          className="fixed top-24 right-8 z-50"
        >
          <div className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#00FF94]/20 to-[#9BFF00]/20 border border-[#00FF94]/50 backdrop-blur-sm shadow-[0_0_30px_rgba(0,255,148,0.3)]">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 180, 360],
                }}
                transition={{
                  duration: 0.6,
                  ease: "easeOut",
                }}
              >
                <Sparkles className="text-[#00FF94]" size={20} />
              </motion.div>
              <div>
                <p className="font-bold text-[#00FF94] text-lg">
                  +{amount} XP
                </p>
                {reason && (
                  <p className="text-xs text-[#A0A0A0]">{reason}</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Floating XP indicator component (for in-page animations)
interface FloatingXPProps {
  show: boolean;
  amount: number;
  position: { x: number; y: number };
}

export function FloatingXP({ show, amount, position }: FloatingXPProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 0, scale: 0.5 }}
          animate={{ opacity: 1, y: -50, scale: 1 }}
          exit={{ opacity: 0, y: -80 }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{
            position: "absolute",
            left: position.x,
            top: position.y,
            pointerEvents: "none",
          }}
          className="z-50"
        >
          <div className="flex items-center gap-1 text-[#00FF94] font-bold text-sm drop-shadow-[0_0_8px_rgba(0,255,148,0.8)]">
            <Zap size={14} />
            <span>+{amount} XP</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
