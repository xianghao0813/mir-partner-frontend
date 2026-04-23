import crypto from "node:crypto";

export const BOSS_LAST_HIT_COOKIE = "mir-boss-last-hit-state";
export const BOSS_LAST_HIT_REWARD_POINTS = 50;
export const BOSS_LAST_HIT_TOTAL_WAVES = 12;
export const BOSS_LAST_HIT_CLEAR_SUCCESS_COUNT = 8;

export type SlashDirection = "left" | "right";

export type BossLastHitAttempt = {
  wave: number;
  direction: SlashDirection;
  reactionMs: number;
  success: boolean;
  label: string;
};

export type BossLastHitWaveState = {
  wave: number;
  direction: SlashDirection;
  spawnedAt: number;
  timeLimitMs: number;
};

export type BossLastHitGameState = {
  wave: number;
  successes: number;
  combo: number;
  bestCombo: number;
  attempts: BossLastHitAttempt[];
  finished: boolean;
  rewardClaimedDate?: string;
  currentWave: BossLastHitWaveState | null;
};

export function createInitialBossLastHitState(rewardClaimedDate?: string): BossLastHitGameState {
  return {
    wave: 1,
    successes: 0,
    combo: 0,
    bestCombo: 0,
    attempts: [],
    finished: false,
    rewardClaimedDate,
    currentWave: createWaveState(1),
  };
}

export function resolveBossLastHitStrike(
  state: BossLastHitGameState,
  direction: SlashDirection,
  now = Date.now()
): BossLastHitGameState {
  if (!state.currentWave || state.finished) {
    return state;
  }

  const reactionMs = Math.max(0, now - state.currentWave.spawnedAt);
  const withinTime = reactionMs <= state.currentWave.timeLimitMs;
  const success = withinTime && direction === state.currentWave.direction;
  const label = !withinTime
    ? "出手太慢"
    : direction === state.currentWave.direction
      ? "斩杀成功"
      : "方向错误";
  const successes = state.successes + (success ? 1 : 0);
  const combo = success ? state.combo + 1 : 0;
  const bestCombo = Math.max(state.bestCombo, combo);
  const attempts = [
    ...state.attempts,
    {
      wave: state.currentWave.wave,
      direction: state.currentWave.direction,
      reactionMs,
      success,
      label,
    },
  ];

  if (state.currentWave.wave >= BOSS_LAST_HIT_TOTAL_WAVES) {
    return {
      ...state,
      wave: BOSS_LAST_HIT_TOTAL_WAVES,
      successes,
      combo,
      bestCombo,
      attempts,
      finished: true,
      currentWave: null,
    };
  }

  const nextWave = state.currentWave.wave + 1;

  return {
    ...state,
    wave: nextWave,
    successes,
    combo,
    bestCombo,
    attempts,
    finished: false,
    currentWave: createWaveState(nextWave, now),
  };
}

export function buildBossLastHitPublicState(state: BossLastHitGameState) {
  return {
    wave: state.wave,
    totalWaves: BOSS_LAST_HIT_TOTAL_WAVES,
    requiredSuccesses: BOSS_LAST_HIT_CLEAR_SUCCESS_COUNT,
    successes: state.successes,
    combo: state.combo,
    bestCombo: state.bestCombo,
    attempts: state.attempts,
    gameFinished: state.finished,
    gameActive: Boolean(state.currentWave),
    currentEnemy: state.currentWave
      ? {
          direction: state.currentWave.direction,
        }
      : null,
    timeLimitMs: state.currentWave?.timeLimitMs ?? 0,
  };
}

export function parseBossLastHitState(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as BossLastHitGameState;
  } catch {
    return null;
  }
}

export function getRewardClaimDateInShanghai(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function readMirPoints(metadata: Record<string, unknown> | undefined) {
  const candidateKeys = ["mir_points", "partner_points", "total_points", "points"];

  for (const key of candidateKeys) {
    const value = metadata?.[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.max(0, Math.floor(value));
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return Math.max(0, Math.floor(parsed));
      }
    }
  }

  return 0;
}

export function getTodayRewardClaimed(metadata: Record<string, unknown> | undefined) {
  const value = metadata?.boss_last_hit_reward_date;
  return typeof value === "string" ? value.trim() : "";
}

export function createBossLastHitRewardReceipt({
  userId,
  claimedDate,
  awardedPoints,
}: {
  userId: string;
  claimedDate: string;
  awardedPoints: number;
}) {
  return crypto
    .createHash("sha256")
    .update(`boss-last-hit:${userId}:${claimedDate}:${awardedPoints}`, "utf8")
    .digest("hex")
    .slice(0, 16)
    .toUpperCase();
}

function createWaveState(wave: number, spawnedAt = Date.now()): BossLastHitWaveState {
  const baseTimeLimit = 1050;
  const reducedTimeLimit = baseTimeLimit - (wave - 1) * 28;

  return {
    wave,
    direction: Math.random() > 0.5 ? "left" : "right",
    spawnedAt,
    timeLimitMs: Math.max(420, reducedTimeLimit + Math.floor(Math.random() * 140)),
  };
}
