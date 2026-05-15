import crypto from "node:crypto";

export const BOSS_LAST_HIT_COOKIE = "mir-boss-last-hit-state";
export const RUNNER_DAILY_ATTEMPT_LIMIT = 5;

export type RunnerRunSummary = {
  score: number;
  distance: number;
  obstaclesCleared: number;
  durationMs: number;
  completedAt: number;
};

export type BossLastHitGameState = {
  active: boolean;
  finished: boolean;
  score: number;
  bestScore: number;
  distance: number;
  obstaclesCleared: number;
  durationMs: number;
  requiredScore: number;
  rewardClaimedDate?: string;
  dailyKey: string;
  dailyRunCount: number;
  dailyBestScore: number;
  startedAt: number | null;
  runs: RunnerRunSummary[];
};

export function createInitialBossLastHitState(rewardClaimedDate?: string): BossLastHitGameState {
  const dailyKey = getRewardClaimDateInShanghai();
  return {
    active: true,
    finished: false,
    score: 0,
    bestScore: 0,
    distance: 0,
    obstaclesCleared: 0,
    durationMs: 0,
    requiredScore: 0,
    rewardClaimedDate,
    dailyKey,
    dailyRunCount: 0,
    dailyBestScore: 0,
    startedAt: Date.now(),
    runs: [],
  };
}

export function resolveBossLastHitStrike(
  state: BossLastHitGameState,
  result: {
    score: number;
    distance: number;
    obstaclesCleared: number;
    durationMs: number;
  },
  now = Date.now()
): BossLastHitGameState {
  const score = clampMetric(result.score);
  const distance = clampMetric(result.distance);
  const obstaclesCleared = clampMetric(result.obstaclesCleared);
  const durationMs = clampMetric(result.durationMs);
  const runs = [
    {
      score,
      distance,
      obstaclesCleared,
      durationMs,
      completedAt: now,
    },
    ...state.runs,
  ].slice(0, 6);
  const rewardClaimedToday = state.rewardClaimedDate === getRewardClaimDateInShanghai();
  const dailyRunCount = rewardClaimedToday ? state.dailyRunCount : Math.min(RUNNER_DAILY_ATTEMPT_LIMIT, state.dailyRunCount + 1);
  const dailyBestScore = rewardClaimedToday ? state.dailyBestScore : Math.max(state.dailyBestScore, score);

  return {
    ...state,
    active: false,
    finished: true,
    score,
    bestScore: Math.max(state.bestScore, score),
    dailyRunCount,
    dailyBestScore,
    distance,
    obstaclesCleared,
    durationMs,
    startedAt: state.startedAt ?? now,
    runs,
  };
}

export function buildBossLastHitPublicState(state: BossLastHitGameState) {
  return {
    requiredScore: state.requiredScore,
    score: state.score,
    bestScore: state.bestScore,
    distance: state.distance,
    obstaclesCleared: state.obstaclesCleared,
    durationMs: state.durationMs,
    runs: state.runs,
    gameFinished: state.finished,
    gameActive: state.active,
    rewardClaimedDate: state.rewardClaimedDate ?? "",
    dailyKey: state.dailyKey,
    dailyRunCount: state.dailyRunCount,
    dailyBestScore: state.dailyBestScore,
    dailyAttemptLimit: RUNNER_DAILY_ATTEMPT_LIMIT,
  };
}

export function getStoredBossLastHitBestScore(metadata: Record<string, unknown> | undefined) {
  return readNumber(metadata?.boss_last_hit_best_score);
}

export function getStoredBossLastHitRuns(metadata: Record<string, unknown> | undefined): RunnerRunSummary[] {
  const raw = Array.isArray(metadata?.boss_last_hit_runs) ? metadata.boss_last_hit_runs : [];

  return raw
    .map((item) => normalizeStoredRun(item))
    .filter((item): item is RunnerRunSummary => item !== null)
    .slice(0, 6);
}

export function mergeBossLastHitStateWithStoredRuns(
  state: BossLastHitGameState,
  metadata: Record<string, unknown> | undefined
): BossLastHitGameState {
  const storedRuns = getStoredBossLastHitRuns(metadata);
  const storedBestScore = getStoredBossLastHitBestScore(metadata);
  const lastRun = state.runs[0] ?? storedRuns[0];

  return {
    ...state,
    score: state.finished && lastRun ? lastRun.score : state.score,
    distance: state.finished && lastRun ? lastRun.distance : state.distance,
    obstaclesCleared: state.finished && lastRun ? lastRun.obstaclesCleared : state.obstaclesCleared,
    durationMs: state.finished && lastRun ? lastRun.durationMs : state.durationMs,
    bestScore: Math.max(state.bestScore, storedBestScore),
    runs: state.runs.length > 0 ? state.runs : storedRuns,
  };
}

export function normalizeDailyRunnerState(
  state: BossLastHitGameState,
  rewardClaimedDate?: string,
  now = new Date()
): BossLastHitGameState {
  const dailyKey = getRewardClaimDateInShanghai(now);
  const sameDay = state.dailyKey === dailyKey;

  return {
    ...state,
    dailyKey,
    rewardClaimedDate,
    dailyRunCount: sameDay ? state.dailyRunCount : 0,
    dailyBestScore: sameDay ? state.dailyBestScore : 0,
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
  const resetAdjusted = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(resetAdjusted);
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

function normalizeStoredRun(item: unknown) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const source = item as Record<string, unknown>;

  return {
    score: readNumber(source.score),
    distance: readNumber(source.distance),
    obstaclesCleared: readNumber(source.obstaclesCleared),
    durationMs: readNumber(source.durationMs),
    completedAt: readNumber(source.completedAt),
  };
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed));
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

function clampMetric(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}
