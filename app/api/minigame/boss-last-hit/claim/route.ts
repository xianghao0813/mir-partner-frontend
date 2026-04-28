import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { awardMirPoints } from "@/lib/mirPoints";
import {
  BOSS_LAST_HIT_COOKIE,
  BOSS_LAST_HIT_REWARD_POINTS,
  buildBossLastHitPublicState,
  createBossLastHitRewardReceipt,
  getRewardClaimDateInShanghai,
  getTodayRewardClaimed,
  parseBossLastHitState,
  readMirPoints,
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
  const gameState = parseBossLastHitState(cookieStore.get(BOSS_LAST_HIT_COOKIE)?.value);

  if (!gameState?.finished || gameState.score < gameState.requiredScore) {
    return NextResponse.json({ message: "Daily mission not completed." }, { status: 400 });
  }

  const today = getRewardClaimDateInShanghai();
  const rewardClaimedDate = getTodayRewardClaimed(user.user_metadata);

  if (rewardClaimedDate === today) {
    return NextResponse.json(
      {
        message: "Reward already claimed today.",
        points: readMirPoints(user.user_metadata),
        rewardClaimedToday: true,
      },
      { status: 400 }
    );
  }

  const pointAward = awardMirPoints({
    metadata: user.user_metadata,
    points: BOSS_LAST_HIT_REWARD_POINTS,
    source: "boss_last_hit",
  });
  const nextPoints = pointAward.afterPoints;
  const receipt = createBossLastHitRewardReceipt({
    userId: user.id,
    claimedDate: today,
    awardedPoints: BOSS_LAST_HIT_REWARD_POINTS,
  });

  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...pointAward.metadata,
      boss_last_hit_reward_date: today,
      boss_last_hit_reward_receipt: receipt,
    },
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const nextGameState = {
    ...gameState,
    rewardClaimedDate: today,
  };
  const pointTransactions = Array.isArray(pointAward.metadata.mir_point_transactions)
    ? pointAward.metadata.mir_point_transactions
    : [];

  const response = NextResponse.json({
    ok: true,
    points: nextPoints,
    awardedPoints: BOSS_LAST_HIT_REWARD_POINTS,
    rewardClaimedToday: true,
    rewardClaimedDate: today,
    receipt,
    pointTransaction: pointTransactions[0] ?? null,
    game: buildBossLastHitPublicState(nextGameState),
  });
  response.cookies.set(BOSS_LAST_HIT_COOKIE, JSON.stringify(nextGameState), {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 6,
  });

  return response;
}
