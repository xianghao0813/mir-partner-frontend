import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  BOSS_LAST_HIT_COOKIE,
  buildBossLastHitPublicState,
  createInitialBossLastHitState,
  getTodayRewardClaimed,
  mergeBossLastHitStateWithStoredRuns,
  parseBossLastHitState,
} from "@/lib/bossLastHit";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const rewardClaimedDate = getTodayRewardClaimed(user.user_metadata);
  const cookieStore = await cookies();
  const previousState = parseBossLastHitState(cookieStore.get(BOSS_LAST_HIT_COOKIE)?.value);
  const storedState = mergeBossLastHitStateWithStoredRuns(
    previousState ?? createInitialBossLastHitState(rewardClaimedDate),
    user.user_metadata
  );
  const gameState = {
    ...createInitialBossLastHitState(rewardClaimedDate),
    bestScore: storedState.bestScore,
    runs: storedState.runs,
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
