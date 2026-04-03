/** Judge display names (stored keys are snake_case in DB). */
export const SONGWARS_JUDGES = [
  { key: "ar_visionary", label: "A&R Visionary" },
  { key: "production_architect", label: "Production Architect" },
  { key: "lyric_analyst", label: "Lyric Analyst" },
  { key: "cultural_pulse", label: "Cultural Pulse" },
] as const;

export type SongwarsJudgeKey = (typeof SONGWARS_JUDGES)[number]["key"];

/** Stored on transparency rows; maps from internal judge keys. */
export type SongWarJudgeType = "ar" | "production" | "lyrics" | "culture";

export const JUDGE_KEY_TO_TRANSPARENCY_TYPE: Record<SongwarsJudgeKey, SongWarJudgeType> = {
  ar_visionary: "ar",
  production_architect: "production",
  lyric_analyst: "lyrics",
  cultural_pulse: "culture",
};

export const TRANSPARENCY_TYPE_ORDER: SongWarJudgeType[] = [
  "ar",
  "production",
  "lyrics",
  "culture",
];

export const TRANSPARENCY_TYPE_LABEL: Record<SongWarJudgeType, string> = {
  ar: "A&R Visionary",
  production: "Production Architect",
  lyrics: "Lyric Analyst",
  culture: "Cultural Pulse",
};

export const JUDGE_WEIGHTS: Record<SongwarsJudgeKey, number> = {
  ar_visionary: 0.28,
  production_architect: 0.28,
  lyric_analyst: 0.24,
  cultural_pulse: 0.2,
};

export const MAX_PARTICIPANTS_DEFAULT = 30;
export const MAX_SUBMISSIONS_PER_USER = 3;

/** Top fraction advancing after round 1 */
export const R1_ADVANCE_FRACTION = 0.4;
/** Of survivors after R2 prep */
export const R2_ADVANCE_FRACTION = 0.5;

export const PRIZE_CREDITS_PAID = [600, 300, 150] as const;
export const PRIZE_CREDITS_FREE = [300, 150, 75] as const;

/** Population variance of four scores in 0..100 is at most this (two 0s and two 100s). */
export const SONG_WAR_MAX_JUDGE_VARIANCE = 2500;

export const LEADERBOARD_POINTS: Record<
  "first" | "second" | "third" | "topTen" | "participant",
  number
> = {
  first: 120,
  second: 80,
  third: 50,
  topTen: 20,
  participant: 5,
};
