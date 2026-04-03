"use client";

import { useEffect, useState } from "react";
import { Gift, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const FIRST_SESSION_KEY = "morra_first_session_utc";

export function FirstTimeGiftModal({
  open,
  onStart,
}: {
  open: boolean;
  onStart: () => void;
}) {
  const [anim, setAnim] = useState<"closed" | "opening" | "open">("closed");

  useEffect(() => {
    if (!open) return;
    setAnim("closed");
    const t = setTimeout(() => setAnim("opening"), 200);
    const t2 = setTimeout(() => setAnim("open"), 750);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      <div className="relative w-full max-w-md rounded-3xl border border-[#00FF94]/30 bg-[#0A0A0A] shadow-[0_0_50px_rgba(0,255,148,0.18)] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-[#00FF94]/10 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-[#9BFF00]/10 blur-3xl" />
        </div>

        <div className="relative p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              {/* Gift box */}
              <div
                className={[
                  "relative w-40 h-32 mx-auto",
                  anim === "closed" ? "animate-[giftPulse_1.8s_ease-in-out_infinite]" : "",
                ].join(" ")}
              >
                {/* Lid */}
                <div
                  className={[
                    "absolute left-1/2 -translate-x-1/2 top-0 w-44 h-12 rounded-2xl",
                    "bg-gradient-to-b from-[#00FF94] to-[#00c97a]",
                    "shadow-[0_0_30px_rgba(0,255,148,0.45)]",
                    anim === "opening" || anim === "open"
                      ? "origin-bottom -rotate-12 -translate-y-4"
                      : "rotate-0",
                    "transition-transform duration-500 ease-out",
                  ].join(" ")}
                />

                {/* Box body */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-40 h-24 rounded-2xl bg-[#121212] border border-[#00FF94]/30 shadow-[0_0_28px_rgba(0,255,148,0.18)]" />

                {/* Ribbon */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-10 h-24 bg-[#00FF94]/60 rounded-full blur-[0.2px]" />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-10 w-40 h-8 bg-[#00FF94]/35 rounded-full" />

                {/* Glow burst */}
                <div
                  className={[
                    "absolute left-1/2 -translate-x-1/2 top-6 w-56 h-56 rounded-full",
                    "bg-[#00FF94]/15 blur-2xl",
                    anim === "open" ? "opacity-100 scale-100" : "opacity-0 scale-75",
                    "transition-all duration-500 ease-out",
                  ].join(" ")}
                />

                {/* Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Gift
                    className="text-[#00FF94] drop-shadow-[0_0_12px_rgba(0,255,148,0.9)]"
                    size={34}
                  />
                </div>
              </div>

              {/* Particles */}
              <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: 10 }).map((_, i) => (
                  <span
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full bg-[#00FF94] opacity-70 animate-[particle_2.2s_ease-in-out_infinite]"
                    style={{
                      left: `${10 + (i * 8)}%`,
                      top: `${10 + ((i * 11) % 70)}%`,
                      animationDelay: `${i * 120}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div
            className={[
              "text-center transition-all duration-500 ease-out",
              anim === "open" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
            ].join(" ")}
          >
            <p className="text-sm text-[#00FF94] flex items-center justify-center gap-2">
              <Sparkles size={16} />
              Welcome to MORRA
            </p>
            <h2 className="text-2xl font-bold mt-2">+50 Credits unlocked</h2>
            <p className="text-[#A0A0A0] mt-2">
              Your credits are enforced on the server, no tricks, just create.
            </p>

            <Button
              type="button"
              onClick={onStart}
              className="w-full mt-6 bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90 shadow-[0_0_22px_rgba(0,255,148,0.35)] hover:shadow-[0_0_30px_rgba(0,255,148,0.5)] transition-all"
            >
              Start Creating
            </Button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes giftPulse {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-3px) scale(1.02);
          }
        }
        @keyframes particle {
          0%,
          100% {
            transform: translateY(0);
            opacity: 0.35;
          }
          50% {
            transform: translateY(-10px);
            opacity: 0.9;
          }
        }
      `}</style>
    </div>
  );
}

