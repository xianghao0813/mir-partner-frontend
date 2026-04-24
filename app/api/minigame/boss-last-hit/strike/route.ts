import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  BOSS_LAST_HIT_COOKIE,
  buildBossLastHitPublicState,
  parseBossLastHitState,
  resolveBossLastHitStrike,
} from "@/lib/bossLastHit";

export async function POST(request: Request) {
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

  const nextState = resolveBossLastHitStrike(state, {
    score: body.score,
    distance: body.distance,
    obstaclesCleared: body.obstaclesCleared,
    durationMs: body.durationMs,
  });
  const response = NextResponse.json({
    ok: true,
    game: buildBossLastHitPublicState(nextState),
  });
  response.cookies.set(BOSS_LAST_HIT_COOKIE, JSON.stringify(nextState), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 6,
  });

  return response;
}
