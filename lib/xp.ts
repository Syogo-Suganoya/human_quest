const BASE_XP = 1000;
const DECAY = 0.6;
const MIN_XP = 100;

/** 同じ課題への挑戦回数(0-indexed, これまでの回数)からXPを逓減計算する */
export function calcXp(previousAttempts: number): number {
  const value = Math.round(BASE_XP * Math.pow(DECAY, previousAttempts));
  return Math.max(value, MIN_XP);
}

export function levelFromXp(totalXp: number): number {
  return Math.floor(totalXp / 1000) + 1;
}
