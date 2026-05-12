import {
  type BossLastHitGameState,
  type RunnerRunSummary,
  RUNNER_DAILY_ATTEMPT_LIMIT,
  getRewardClaimDateInShanghai,
} from "@/lib/bossLastHit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type BossLastHitDailyState = {
  dayKey: string;
  bestScore: number;
  dailyBestScore: number;
  dailyRunCount: number;
  rewardClaimedDate: string;
  rewardReceipt: string;
  runs: RunnerRunSummary[];
};

export async function readBossLastHitDailyState(
  userId: string,
  metadata: Record<string, unknown> | undefined,
  now = new Date()
): Promise<BossLastHitDailyState> {
  const dayKey = getRewardClaimDateInShanghai(now);

  await migrateBossLastHitMetadataToDb(userId, metadata, dayKey);

  const [dailyState, runs] = await Promise.all([
    readDailyState(userId, dayKey),
    readDailyRuns(userId, dayKey),
  ]);

  return {
    dayKey,
    bestScore: dailyState?.bestScore ?? readNumber(metadata?.boss_last_hit_best_score),
    dailyBestScore: dailyState?.dailyBestScore ?? readNumber(metadata?.boss_last_hit_daily_best_score),
    dailyRunCount: dailyState?.dailyRunCount ?? readNumber(metadata?.boss_last_hit_daily_runs),
    rewardClaimedDate: dailyState?.rewardClaimedDate ?? readString(metadata?.boss_last_hit_reward_date),
    rewardReceipt: dailyState?.rewardReceipt ?? readString(metadata?.boss_last_hit_reward_receipt),
    runs,
  };
}

export async function saveBossLastHitRun(userId: string, state: BossLastHitGameState) {
  const latestRun = state.runs[0];
  if (!latestRun) {
    return;
  }

  const [runResult] = await Promise.all([
    supabaseAdmin.from("boss_last_hit_runs").insert({
      user_id: userId,
      day_key: state.dailyKey,
      score: latestRun.score,
      distance: latestRun.distance,
      obstacles_cleared: latestRun.obstaclesCleared,
      duration_ms: latestRun.durationMs,
      completed_at: new Date(latestRun.completedAt).toISOString(),
    }),
    upsertDailyState(userId, state.dailyKey, {
      bestScore: state.bestScore,
      dailyBestScore: state.dailyBestScore,
      dailyRunCount: Math.min(RUNNER_DAILY_ATTEMPT_LIMIT, state.dailyRunCount),
    }),
  ]);

  if (runResult.error) {
    throw new Error(runResult.error.message);
  }
}

export async function markBossLastHitRewardClaimed({
  userId,
  dayKey,
  receipt,
  bestScore,
  dailyBestScore,
  dailyRunCount,
}: {
  userId: string;
  dayKey: string;
  receipt: string;
  bestScore: number;
  dailyBestScore: number;
  dailyRunCount: number;
}) {
  await upsertDailyState(userId, dayKey, {
    bestScore,
    dailyBestScore,
    dailyRunCount,
    rewardReceipt: receipt,
    rewardClaimedAt: new Date().toISOString(),
  });
}

async function migrateBossLastHitMetadataToDb(
  userId: string,
  metadata: Record<string, unknown> | undefined,
  dayKey: string
) {
  const metadataDayKey = readString(metadata?.boss_last_hit_day_key);
  const rewardDate = readString(metadata?.boss_last_hit_reward_date);

  if (metadataDayKey !== dayKey && rewardDate !== dayKey) {
    return;
  }

  await upsertDailyState(userId, dayKey, {
    bestScore: readNumber(metadata?.boss_last_hit_best_score),
    dailyBestScore: readNumber(metadata?.boss_last_hit_daily_best_score),
    dailyRunCount: readNumber(metadata?.boss_last_hit_daily_runs),
    rewardReceipt: readString(metadata?.boss_last_hit_reward_receipt) || undefined,
    rewardClaimedAt: rewardDate === dayKey ? new Date().toISOString() : undefined,
  });
}

async function readDailyState(userId: string, dayKey: string) {
  const { data, error } = await supabaseAdmin
    .from("boss_last_hit_daily_states")
    .select("best_score,daily_best_score,daily_run_count,reward_claimed_at,reward_receipt")
    .eq("user_id", userId)
    .eq("day_key", dayKey)
    .maybeSingle();

  if (error) {
    console.error("[boss_last_hit_daily_states read]", error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    bestScore: readNumber(data.best_score),
    dailyBestScore: readNumber(data.daily_best_score),
    dailyRunCount: readNumber(data.daily_run_count),
    rewardClaimedDate: data.reward_claimed_at ? dayKey : "",
    rewardReceipt: readString(data.reward_receipt),
  };
}

async function readDailyRuns(userId: string, dayKey: string) {
  const { data, error } = await supabaseAdmin
    .from("boss_last_hit_runs")
    .select("score,distance,obstacles_cleared,duration_ms,completed_at")
    .eq("user_id", userId)
    .eq("day_key", dayKey)
    .order("completed_at", { ascending: false })
    .limit(6);

  if (error) {
    console.error("[boss_last_hit_runs read]", error);
    return [];
  }

  return (data ?? []).map((run) => ({
    score: readNumber(run.score),
    distance: readNumber(run.distance),
    obstaclesCleared: readNumber(run.obstacles_cleared),
    durationMs: readNumber(run.duration_ms),
    completedAt: new Date(readString(run.completed_at)).getTime(),
  }));
}

async function upsertDailyState(
  userId: string,
  dayKey: string,
  state: {
    bestScore: number;
    dailyBestScore: number;
    dailyRunCount: number;
    rewardClaimedAt?: string;
    rewardReceipt?: string;
  }
) {
  const payload: Record<string, unknown> = {
    user_id: userId,
    day_key: dayKey,
    best_score: state.bestScore,
    daily_best_score: state.dailyBestScore,
    daily_run_count: state.dailyRunCount,
    updated_at: new Date().toISOString(),
  };

  if (state.rewardClaimedAt) {
    payload.reward_claimed_at = state.rewardClaimedAt;
  }
  if (state.rewardReceipt) {
    payload.reward_receipt = state.rewardReceipt;
  }

  const { error } = await supabaseAdmin
    .from("boss_last_hit_daily_states")
    .upsert(payload, { onConflict: "user_id,day_key" });

  if (error) {
    throw new Error(error.message);
  }
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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
