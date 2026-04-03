import { Trophy } from "lucide-react";

interface LevelBadgeProps {
  level: number;
  size?: "sm" | "md" | "lg";
  showGlow?: boolean;
}

export function LevelBadge({ level, size = "md", showGlow = false }: LevelBadgeProps) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-base",
  };

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20,
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-xl bg-gradient-to-br from-[#00FF94] to-[#9BFF00] flex items-center justify-center font-bold text-[#0A0A0A] ${
        showGlow ? "shadow-[0_0_30px_rgba(0,255,148,0.5)]" : ""
      }`}
    >
      <div className="flex items-center gap-1">
        <Trophy size={iconSizes[size]} />
        <span>{level}</span>
      </div>
    </div>
  );
}
