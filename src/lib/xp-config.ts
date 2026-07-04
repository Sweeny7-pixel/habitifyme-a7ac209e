// XP rules & level math. Kept centralised so UI never hardcodes values.

export const XP_REWARDS = {
  workout_complete: 50,
  gym_checkin: 20,
  weekly_review: 40,
  streak_7: 150,
  profile_complete: 25,
  sunday_planning: 30,
  diet_logging: 15,
  bonus_surprise: 150,
} as const;

export type XpReason = keyof typeof XP_REWARDS;

export const BONUS_SURPRISE_CHANCE = 0.1;

// Cumulative total-XP thresholds for each level (index = level - 1).
// Level 1 starts at 0 XP.
export const LEVEL_THRESHOLDS: readonly number[] = [
  0, 150, 400, 800, 1400, 2200, 3200, 4400, 5800, 7400,
];

export function getLevel(totalXP: number): number {
  const xp = Math.max(0, totalXP);
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return level;
}

export function getLevelProgress(totalXP: number): {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  pct: number;
} {
  const xp = Math.max(0, totalXP);
  const level = getLevel(xp);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold =
    LEVEL_THRESHOLDS[level] ??
    // Beyond the table: extrapolate with the last delta.
    currentThreshold +
      (LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] -
        LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 2]);
  const xpIntoLevel = xp - currentThreshold;
  const xpForNextLevel = nextThreshold - currentThreshold;
  const pct =
    xpForNextLevel > 0
      ? Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100))
      : 100;
  return { level, xpIntoLevel, xpForNextLevel, pct };
}
