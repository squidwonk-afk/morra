export const CREDIT_COSTS = {
  identity: 10,
  rollout: 15,
  lyrics: 10,
  cover: 20,
  collab: 5,
} as const;

export type ToolKey = keyof typeof CREDIT_COSTS;

/** Free generations: 5 on first UTC day, then 1 per UTC day. */
export const FREE_FIRST_DAY_GENERATIONS = 5;
export const FREE_DAILY_GENERATIONS = 1;

export const SIGNUP_BONUS_CREDITS = 50;

export const REFERRAL_ACTIVE_REFERRER_CREDITS = 10;

export const REFERRAL_ACTIVE_REFERRER_XP = 50;

/** One-time when referrer’s invitee subscribes (validated referral only). */
export const REFERRAL_SUBSCRIPTION_REFERRER_CREDITS = 0;

/** Sentinel XP on `reward_events` for one-time welcome gift (not counted toward hourly tool XP cap). */
export const WELCOME_GIFT_XP_MARKER = -999;
