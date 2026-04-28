import crypto from "node:crypto";

export const BOSS_LAST_HIT_COOKIE = "mir-boss-last-hit-state";
export const BOSS_LAST_HIT_REWARD_POINTS = 50;
export const RUNNER_REQUIRED_SCORE = 5000;

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
  startedAt: number | null;
  runs: RunnerRunSummary[];
};

export function createInitialBossLastHitState(rewardClaimedDate?: string): BossLastHitGameState {
  return {
    active: true,
    finished: false,
    score: 0,
    bestScore: 0,
    distance: 0,
    obstaclesCleared: 0,
    durationMs: 0,
    requiredScore: RUNNER_REQUIRED_SCORE,
    rewardClaimedDate,
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

  return {
    ...state,
    active: false,
    finished: true,
    score,
    bestScore: Math.max(state.bestScore, score),
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

  return {
    ...state,
    bestScore: Math.max(state.bestScore, storedBestScore),
    runs: state.runs.length > 0 ? state.runs : storedRuns,
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
