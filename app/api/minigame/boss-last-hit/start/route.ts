import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  BOSS_LAST_HIT_COOKIE,
  buildBossLastHitPublicState,
  createInitialBossLastHitState,
  getTodayRewardClaimed,
} from "@/lib/bossLastHit";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const rewardClaimedDate = getTodayRewardClaimed(user.user_metadata);
  const gameState = createInitialBossLastHitState(rewardClaimedDate);
  const response = NextResponse.json({
    ok: true,
    game: buildBossLastHitPublicState(gameState),
  });

  const cookieStore = await cookies();
  cookieStore.set(BOSS_LAST_HIT_COOKIE, JSON.stringify(gameState), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 6,
  });

  return response;
}
