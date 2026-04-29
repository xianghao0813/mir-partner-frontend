import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  BOSS_LAST_HIT_COOKIE,
  buildBossLastHitPublicState,
  getTodayRewardClaimed,
  getRewardClaimDateInShanghai,
  mergeBossLastHitStateWithStoredRuns,
  normalizeDailyRunnerState,
  parseBossLastHitState,
  readMirPoints,
} from "@/lib/bossLastHit";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const today = getRewardClaimDateInShanghai();
  const rewardClaimedDate = getTodayRewardClaimed(user.user_metadata);
  const cookieStore = await cookies();
  const gameState = parseBossLastHitState(cookieStore.get(BOSS_LAST_HIT_COOKIE)?.value);
  const syncedGameState = gameState
      ? normalizeDailyRunnerState(mergeBossLastHitStateWithStoredRuns(
        {
          ...gameState,
          active: false,
        },
        user.user_metadata
      ), rewardClaimedDate)
    : null;

  return NextResponse.json({
    points: readMirPoints(user.user_metadata),
    rewardClaimedToday: rewardClaimedDate === today,
    rewardClaimedDate,
    game: syncedGameState ? buildBossLastHitPublicState(syncedGameState) : null,
  });
}
