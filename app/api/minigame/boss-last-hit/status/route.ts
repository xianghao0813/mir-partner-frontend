import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readMirPoints } from "@/lib/mirPoints";
import { readPointTransactionsFromDb } from "@/lib/userLedgers";
import {
  BOSS_LAST_HIT_COOKIE,
  buildBossLastHitPublicState,
  getRewardClaimDateInShanghai,
  normalizeDailyRunnerState,
  parseBossLastHitState,
} from "@/lib/bossLastHit";
import { readBossLastHitDailyState } from "@/lib/bossLastHitDb";

export async function GET() {
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
  const ledgerTransactions = await readPointTransactionsFromDb(user.id);
  const ledgerPoints = ledgerTransactions.reduce((sum, entry) => sum + entry.points, 0);
  const points = Math.max(readMirPoints(user.user_metadata), ledgerPoints);
  const gameState = parseBossLastHitState(cookieStore.get(BOSS_LAST_HIT_COOKIE)?.value);
  const syncedGameState = gameState
      ? {
          ...normalizeDailyRunnerState(
        {
          ...gameState,
          active: false,
        },
        rewardClaimedDate
      ),
          bestScore: Math.max(gameState.bestScore, dailyState.bestScore),
          dailyBestScore: Math.max(gameState.dailyBestScore, dailyState.dailyBestScore),
          dailyRunCount: Math.max(gameState.dailyRunCount, dailyState.dailyRunCount),
          runs: gameState.runs.length > 0 ? gameState.runs : dailyState.runs,
        }
    : null;

  return NextResponse.json({
    points,
    rewardClaimedToday: rewardClaimedDate === today,
    rewardClaimedDate,
    game: syncedGameState ? buildBossLastHitPublicState(syncedGameState) : null,
  });
}
