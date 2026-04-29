import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { compactAuthMetadata } from "@/lib/authMetadata";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { awardMirPoints } from "@/lib/mirPoints";
import { insertPointTransaction } from "@/lib/userLedgers";
import {
  BOSS_LAST_HIT_COOKIE,
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

  if (!gameState || gameState.dailyBestScore <= 0) {
    return NextResponse.json({ message: "今日暂无可领取的最高成绩。" }, { status: 400 });
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

  const awardedPoints = gameState.dailyBestScore;
  const pointAward = awardMirPoints({
    metadata: user.user_metadata,
    points: awardedPoints,
    source: "boss_last_hit",
  });
  const nextPoints = pointAward.afterPoints;
  const receipt = createBossLastHitRewardReceipt({
    userId: user.id,
    claimedDate: today,
    awardedPoints,
  });

  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: compactAuthMetadata({
      ...pointAward.metadata,
      boss_last_hit_reward_date: today,
      boss_last_hit_reward_receipt: receipt,
    }),
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
  const latestPointTransaction = pointTransactions[0];

  if (latestPointTransaction && typeof latestPointTransaction === "object") {
    const source = latestPointTransaction as Record<string, unknown>;
    await insertPointTransaction(user.id, {
      id: readString(source.id),
      title: readString(source.title) || "MIR 积分",
      description: readString(source.description) || readString(source.source) || "-",
      points: readNumber(source.points),
      createdAt: readString(source.createdAt) || new Date().toISOString(),
      source: readString(source.source) || "boss_last_hit",
    });
  }

  const response = NextResponse.json({
    ok: true,
    points: nextPoints,
    awardedPoints,
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

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.floor(parsed);
    }
  }

  return 0;
}
