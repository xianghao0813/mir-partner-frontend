import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { compactAuthMetadata } from "@/lib/authMetadata";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  BOSS_LAST_HIT_COOKIE,
  buildBossLastHitPublicState,
  getRewardClaimDateInShanghai,
  getTodayRewardClaimed,
  normalizeDailyRunnerState,
  parseBossLastHitState,
  resolveBossLastHitStrike,
} from "@/lib/bossLastHit";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const state = parseBossLastHitState(cookieStore.get(BOSS_LAST_HIT_COOKIE)?.value);

  if (!state) {
    return NextResponse.json({ message: "No active game session." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        score?: number;
        distance?: number;
        obstaclesCleared?: number;
        durationMs?: number;
      }
    | null;

  if (
    typeof body?.score !== "number" ||
    typeof body?.distance !== "number" ||
    typeof body?.obstaclesCleared !== "number" ||
    typeof body?.durationMs !== "number"
  ) {
    return NextResponse.json({ message: "Invalid run result." }, { status: 400 });
  }

  const rewardClaimedDate = getTodayRewardClaimed(user.user_metadata);
  const nextState = resolveBossLastHitStrike(normalizeDailyRunnerState(state, rewardClaimedDate), {
    score: body.score,
    distance: body.distance,
    obstaclesCleared: body.obstaclesCleared,
    durationMs: body.durationMs,
  });

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: compactAuthMetadata({
      ...(user.user_metadata ?? {}),
      boss_last_hit_best_score: nextState.bestScore,
      boss_last_hit_day_key: getRewardClaimDateInShanghai(),
      boss_last_hit_daily_runs: nextState.dailyRunCount,
      boss_last_hit_daily_best_score: nextState.dailyBestScore,
    }),
  });

  if (updateError) {
    return NextResponse.json({ message: updateError.message }, { status: 500 });
  }

  const response = NextResponse.json({
    ok: true,
    game: buildBossLastHitPublicState(nextState),
  });
  response.cookies.set(BOSS_LAST_HIT_COOKIE, JSON.stringify(nextState), {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 6,
  });

  return response;
}
