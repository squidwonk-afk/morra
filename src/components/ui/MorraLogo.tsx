"use client";

import { cn } from "@/components/ui/utils";

export function MorraLogo({
  className,
  textClassName,
}: {
  className?: string;
  textClassName?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex select-none bg-transparent leading-none [background:none]",
        className
      )}
      aria-label="MORRA"
    >
      <span
        className={cn(
          "relative inline-block uppercase font-bold",
          "text-[#00FF94] tracking-[0.32em]",
          "drop-shadow-[0_0_6px_#00FF94] drop-shadow-[0_0_12px_rgba(0,255,148,0.6)] drop-shadow-[0_0_24px_rgba(0,255,148,0.4)]",
          "transition-[transform,filter] duration-200 ease-out",
          "hover:scale-[1.04]",
          "hover:drop-shadow-[0_0_10px_#00FF94] hover:drop-shadow-[0_0_18px_rgba(0,255,148,0.7)] hover:drop-shadow-[0_0_34px_rgba(0,255,148,0.45)]",
          "[font-family:'Mokoto_Glitch_1','Mokoto','Orbitron','Space_Grotesk',ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation_Mono','Courier_New',monospace]",
          "text-[clamp(18px,2.6vw,30px)]",
          textClassName
        )}
        data-text="MORRA"
      >
        MORRA
      </span>

      <style jsx>{`
        span[data-text]::before,
        span[data-text]::after {
          content: attr(data-text);
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          opacity: 0;
          mix-blend-mode: screen;
        }

        span[data-text]:hover::before {
          opacity: 0.55;
          transform: translate(1px, 0);
          text-shadow: 0 0 6px rgba(0, 255, 148, 0.55);
          clip-path: inset(0 0 62% 0);
          animation: glitchTop 0.55s steps(2, end) infinite;
        }

        span[data-text]:hover::after {
          opacity: 0.45;
          transform: translate(-1px, 0);
          text-shadow: 0 0 6px rgba(0, 255, 148, 0.35);
          clip-path: inset(62% 0 0 0);
          animation: glitchBottom 0.55s steps(2, end) infinite;
        }

        @keyframes glitchTop {
          0% {
            transform: translate(1px, 0);
          }
          33% {
            transform: translate(-1px, -1px);
          }
          66% {
            transform: translate(2px, 1px);
          }
          100% {
            transform: translate(1px, 0);
          }
        }

        @keyframes glitchBottom {
          0% {
            transform: translate(-1px, 0);
          }
          33% {
            transform: translate(1px, 1px);
          }
          66% {
            transform: translate(-2px, -1px);
          }
          100% {
            transform: translate(-1px, 0);
          }
        }
      `}</style>
    </span>
  );
}

