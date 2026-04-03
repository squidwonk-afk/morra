/** Matches `/api/me` and `/api/dashboard` linear level rule: 100 XP per level. */
export function xpLevelProgress(xp: number): {
  level: number;
  progressPercent: number;
  xpToNext: number;
  currentFloor: number;
  nextCeiling: number;
} {
  const x = Math.max(0, Math.floor(xp));
  const currentFloor = Math.floor(x / 100) * 100;
  const nextCeiling = currentFloor + 100;
  const level = Math.floor(x / 100) + 1;
  const within = x - currentFloor;
  const progressPercent = Math.min(100, Math.max(0, within));
  const xpToNext = Math.max(0, nextCeiling - x);
  return { level, progressPercent, xpToNext, currentFloor, nextCeiling };
}
