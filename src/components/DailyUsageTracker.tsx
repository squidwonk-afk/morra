import { Clock, Zap, Lock } from "lucide-react";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import Link from "next/link";
import { useState, useEffect } from "react";

interface DailyUsageTrackerProps {
  used: number;
  total: number;
  resetTime?: Date;
  plan?: string;
}

export function DailyUsageTracker({
  used,
  total,
  resetTime = new Date(new Date().setHours(24, 0, 0, 0)),
  plan = "Free"
}: DailyUsageTrackerProps) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const diff = resetTime.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft("Ready now!");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${hours}h ${minutes}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [resetTime]);

  const percentage = (used / total) * 100;
  const isLimitReached = used >= total;

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-[#00FF94]/10 to-[#121212] border border-[#00FF94]/30">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold mb-1">Daily Usage</h3>
          <p className="text-sm text-[#A0A0A0]">{plan} Plan</p>
        </div>
        <div className="text-right">
          <p className={`text-3xl font-bold ${isLimitReached ? "text-[#FF6B00]" : "text-[#00FF94]"}`}>
            {used}/{total}
          </p>
          <p className="text-xs text-[#A0A0A0]">generations</p>
        </div>
      </div>

      <Progress 
        value={percentage} 
        className={`h-3 mb-4 ${isLimitReached ? "bg-[#FF6B00]/20" : "bg-[#121212]"}`}
      />

      {isLimitReached ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[#FF6B00] bg-[#FF6B00]/10 p-3 rounded-xl border border-[#FF6B00]/30">
            <Lock size={16} />
            <p className="text-sm font-medium">Daily limit reached</p>
          </div>
          
          <div className="flex items-center gap-2 text-[#A0A0A0] text-sm">
            <Clock size={14} />
            <span>Next generation in: <span className="text-[#00FF94] font-medium">{timeLeft}</span></span>
          </div>

          <div className="pt-4 border-t border-[#00FF94]/20">
            <p className="text-sm text-[#A0A0A0] mb-3">Need more? Upgrade now:</p>
            <div className="flex gap-2">
              <Link href="/pricing" className="flex-1">
                <Button 
                  size="sm"
                  className="w-full bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90 shadow-[0_0_20px_rgba(0,255,148,0.3)]"
                >
                  <Zap className="mr-2" size={14} />
                  Upgrade
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 text-[#00FF94] text-sm mb-3">
            <Zap size={14} />
            <span>{total - used} generation{total - used !== 1 ? 's' : ''} remaining today</span>
          </div>
          
          {plan === "Free" && (
            <div className="pt-4 border-t border-[#00FF94]/20">
              <p className="text-xs text-[#A0A0A0] mb-2">
                💡 Resets daily at midnight • Non-stackable
              </p>
              <Link href="/pricing">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full border-[#00FF94]/30 text-[#00FF94] hover:bg-[#00FF94]/10 text-xs"
                >
                  Upgrade for unlimited access
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {plan === "Free" && (
        <div className="mt-4 p-3 rounded-xl bg-[#121212] border border-[#00FF94]/10">
          <p className="text-xs text-[#A0A0A0] text-center">
            Fair usage system • Designed for sustainability
          </p>
        </div>
      )}
    </div>
  );
}
