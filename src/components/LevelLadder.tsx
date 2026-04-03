"use client";

type Rung = {
  level: number;
  xpRequired: number;
  unlocked: boolean;
  current: boolean;
};

const LEVEL_REWARD_CREDITS = 150;

export function LevelLadder({
  rungs,
  currentXp,
}: {
  rungs: Rung[];
  currentXp: number;
}) {
  if (!rungs.length) return null;

  return (
    <div className="rounded-2xl border border-[#00FF94]/25 bg-gradient-to-br from-[#00FF94]/5 via-[#0A0A0A] to-[#9BFF00]/5 p-6 shadow-[0_0_40px_rgba(0,255,148,0.12)]">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">Level ladder</h3>
          <p className="text-sm text-[#A0A0A0]">
            Each level grants {LEVEL_REWARD_CREDITS} credits, {currentXp} XP total
          </p>
        </div>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {rungs.map((r) => (
          <div
            key={r.level}
            className={[
              "flex items-center justify-between rounded-xl px-3 py-2.5 border transition-all",
              r.current
                ? "border-[#00FF94] bg-[#00FF94]/10 shadow-[0_0_24px_rgba(0,255,148,0.35)]"
                : r.unlocked
                  ? "border-[#00FF94]/30 bg-[#121212]"
                  : "border-[#2A2A2A] bg-[#0f0f0f] opacity-60",
            ].join(" ")}
          >
            <div className="flex items-center gap-3">
              <span
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold",
                  r.current
                    ? "bg-[#00FF94] text-[#0A0A0A]"
                    : r.unlocked
                      ? "bg-[#00FF94]/20 text-[#00FF94]"
                      : "bg-[#1A1A1A] text-[#666]",
                ].join(" ")}
              >
                {r.level}
              </span>
              <div>
                <p className="text-sm font-medium text-white">
                  Level {r.level}
                  {r.current ? " (you are here)" : ""}
                </p>
                <p className="text-xs text-[#A0A0A0]">{r.xpRequired} XP required</p>
              </div>
            </div>
            <div className="text-right">
              <p
                className={
                  r.unlocked ? "text-xs font-semibold text-[#9BFF00]" : "text-xs text-[#666]"
                }
              >
                {r.unlocked
                  ? `+${LEVEL_REWARD_CREDITS} cr`
                  : `+${LEVEL_REWARD_CREDITS} cr when unlocked`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
