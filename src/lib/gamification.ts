// Gamification System - XP, Levels, Rewards

export interface Level {
  level: number;
  xpRequired: number;
  rewards: {
    credits?: number;
    title?: string;
    badge?: string;
  };
}

export interface UserProgress {
  currentXP: number;
  currentLevel: number;
  dailyStreak: number;
  lastLoginDate: string;
  totalXPEarned: number;
  unlockedTitles: string[];
}

// XP Rewards for different actions
export const XP_REWARDS = {
  TOOL_USE: 10,
  DAILY_LOGIN: 25,
  REFERRAL_SIGNUP: 50,
  REFERRAL_SUBSCRIPTION: 100,
  WEEKLY_STREAK: 50,
  MONTHLY_STREAK: 200,
};

// Level progression system (exponential growth)
export const LEVELS: Level[] = [
  { level: 1, xpRequired: 0, rewards: {} },
  { level: 2, xpRequired: 100, rewards: { credits: 25, badge: "🎵" } },
  { level: 3, xpRequired: 250, rewards: { credits: 30, title: "Rookie Artist" } },
  { level: 4, xpRequired: 500, rewards: { credits: 40 } },
  { level: 5, xpRequired: 850, rewards: { credits: 50, title: "Rising Artist", badge: "⭐" } },
  { level: 6, xpRequired: 1300, rewards: { credits: 60 } },
  { level: 7, xpRequired: 1900, rewards: { credits: 75, title: "Independent Creator" } },
  { level: 8, xpRequired: 2650, rewards: { credits: 90 } },
  { level: 9, xpRequired: 3600, rewards: { credits: 110, badge: "🔥" } },
  { level: 10, xpRequired: 4800, rewards: { credits: 150, title: "Established Artist", badge: "💎" } },
  { level: 11, xpRequired: 6300, rewards: { credits: 175 } },
  { level: 12, xpRequired: 8150, rewards: { credits: 200, title: "Underground Legend" } },
  { level: 13, xpRequired: 10400, rewards: { credits: 225 } },
  { level: 14, xpRequired: 13100, rewards: { credits: 250, badge: "👑" } },
  { level: 15, xpRequired: 16300, rewards: { credits: 300, title: "Elite Creator", badge: "⚡" } },
  { level: 16, xpRequired: 20050, rewards: { credits: 350 } },
  { level: 17, xpRequired: 24400, rewards: { credits: 400, title: "Industry Pro" } },
  { level: 18, xpRequired: 29400, rewards: { credits: 450 } },
  { level: 19, xpRequired: 35100, rewards: { credits: 500, badge: "💫" } },
  { level: 20, xpRequired: 41550, rewards: { credits: 750, title: "MORRA Icon", badge: "🌟" } },
];

// Calculate current level based on XP
export function calculateLevel(xp: number): number {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) {
      return LEVELS[i].level;
    }
  }
  return 1;
}

// Get XP progress for current level
export function getLevelProgress(xp: number): {
  currentLevel: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progressPercent: number;
  xpToNextLevel: number;
} {
  const currentLevel = calculateLevel(xp);
  const currentLevelData = LEVELS.find(l => l.level === currentLevel);
  const nextLevelData = LEVELS.find(l => l.level === currentLevel + 1);

  if (!currentLevelData) {
    return {
      currentLevel: 1,
      currentLevelXP: 0,
      nextLevelXP: LEVELS[1].xpRequired,
      progressPercent: 0,
      xpToNextLevel: LEVELS[1].xpRequired,
    };
  }

  if (!nextLevelData) {
    // Max level reached
    return {
      currentLevel,
      currentLevelXP: currentLevelData.xpRequired,
      nextLevelXP: currentLevelData.xpRequired,
      progressPercent: 100,
      xpToNextLevel: 0,
    };
  }

  const xpInCurrentLevel = xp - currentLevelData.xpRequired;
  const xpNeededForNextLevel = nextLevelData.xpRequired - currentLevelData.xpRequired;
  const progressPercent = (xpInCurrentLevel / xpNeededForNextLevel) * 100;

  return {
    currentLevel,
    currentLevelXP: currentLevelData.xpRequired,
    nextLevelXP: nextLevelData.xpRequired,
    progressPercent: Math.min(progressPercent, 100),
    xpToNextLevel: nextLevelData.xpRequired - xp,
  };
}

// Get all unlocked rewards up to current level
export function getUnlockedRewards(level: number): Level[] {
  return LEVELS.filter(l => l.level <= level && l.level > 1);
}

// Get upcoming rewards (next 3 levels)
export function getUpcomingRewards(level: number): Level[] {
  return LEVELS.filter(l => l.level > level && l.level <= level + 3);
}

// Check if user earned daily login bonus today
export function shouldAwardDailyBonus(lastLoginDate: string): boolean {
  const today = new Date().toDateString();
  const lastLogin = new Date(lastLoginDate).toDateString();
  return today !== lastLogin;
}

// Calculate streak (simplified - in real app would check consecutive days)
export function calculateStreak(lastLoginDate: string, currentStreak: number): number {
  const lastLogin = new Date(lastLoginDate);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - lastLogin.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // If last login was yesterday, increment streak
  if (diffDays === 1) {
    return currentStreak + 1;
  }
  // If last login was today, keep streak
  if (diffDays === 0) {
    return currentStreak;
  }
  // If missed a day, reset streak
  return 1;
}
