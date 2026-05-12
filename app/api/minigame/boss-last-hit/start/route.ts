import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  BOSS_LAST_HIT_COOKIE,
  RUNNER_DAILY_ATTEMPT_LIMIT,
  buildBossLastHitPublicState,
  createInitialBossLastHitState,
  getRewardClaimDateInShanghai,
  normalizeDailyRunnerState,
  parseBossLastHitState,
} from "@/lib/bossLastHit";
import { readBossLastHitDailyState } from "@/lib/bossLastHitDb";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const today = getRewardClaimDateInShanghai();
  const dailyState = await readBossLastHitDailyState(user.id, user.user_metadata);
  const rewardClaimedDate = dailyState.rewardClaimedDate;
  const cookieStore = await cookies();
  const previousState = parseBossLastHitState(cookieStore.get(BOSS_LAST_HIT_COOKIE)?.value);
  const storedState = normalizeDailyRunnerState(
    previousState ?? createInitialBossLastHitState(rewardClaimedDate),
    rewardClaimedDate
  );
  const persistedRunCount = Math.max(storedState.dailyRunCount, dailyState.dailyRunCount);

  if (rewardClaimedDate !== today && persistedRunCount >= RUNNER_DAILY_ATTEMPT_LIMIT) {
    return NextResponse.json(
      { message: "今日挑战次数已用完，请先领取最高成绩奖励或明日再试。", game: buildBossLastHitPublicState(storedState) },
      { status: 400 }
    );
  }

  const gameState = {
    ...normalizeDailyRunnerState(createInitialBossLastHitState(rewardClaimedDate), rewardClaimedDate),
    bestScore: Math.max(storedState.bestScore, dailyState.bestScore),
    runs: dailyState.runs.length > 0 ? dailyState.runs : storedState.runs,
    dailyRunCount: persistedRunCount,
    dailyBestScore: Math.max(storedState.dailyBestScore, dailyState.dailyBestScore),
  };
  const response = NextResponse.json({
    ok: true,
    game: buildBossLastHitPublicState(gameState),
  });
  response.cookies.set(BOSS_LAST_HIT_COOKIE, JSON.stringify(gameState), {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 6,
  });

  return response;
}
