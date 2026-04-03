export type XpLadderRung = { level: number; xpRequired: number };

export type XpProgressComputed = {
  currentLevel: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progressPercent: number;
  xpToNextLevel: number;
};

/** Same ladder math as /api/dashboard (single source for client after daily claim). */
export function computeXpProgressFromLadder(
  xp: number,
  rows: XpLadderRung[]
): XpProgressComputed {
  let bestLevel = 1;
  let currentLevelXP = 0;
  let nextLevelXP = 0;
  for (const r of rows) {
    const req = Number(r.xpRequired);
    if (xp >= req) {
      bestLevel = Number(r.level);
      currentLevelXP = req;
    } else {
      nextLevelXP = req;
      break;
    }
  }
  if (!nextLevelXP) nextLevelXP = currentLevelXP;
  const denom = Math.max(1, nextLevelXP - currentLevelXP);
  const progressPercent = Math.min(
    100,
    Math.max(0, ((xp - currentLevelXP) / denom) * 100)
  );
  const xpToNextLevel = Math.max(0, nextLevelXP - xp);
  return {
    currentLevel: bestLevel,
    currentLevelXP,
    nextLevelXP,
    progressPercent,
    xpToNextLevel,
  };
}
