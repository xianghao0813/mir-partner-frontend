import { NextRequest, NextResponse } from "next/server";
import { compactAuthMetadata } from "@/lib/authMetadata";
import { readAttendanceSummaryFromDb, applyAttendanceActionInDb } from "@/lib/attendanceDb";
import { applyMirPointDelta, readMirPoints } from "@/lib/mirPoints";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { insertPointTransaction, readPointTransactionsFromDb } from "@/lib/userLedgers";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    summary: await readAttendanceSummaryFromDb(user.id, user.user_metadata),
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    type?: "checkin" | "makeup";
    date?: string;
  } | null;
  const ledgerTransactions = await readPointTransactionsFromDb(user.id);
  const ledgerTotal = ledgerTransactions.reduce((sum, entry) => sum + entry.points, 0);
  const baseMetadata =
    ledgerTotal > readMirPoints(user.user_metadata)
      ? {
          ...(user.user_metadata ?? {}),
          mir_points: ledgerTotal,
        }
      : user.user_metadata;
  const currentPoints = readMirPoints(baseMetadata);
  const action =
    body?.type === "makeup" && body.date
      ? { type: "makeup" as const, date: body.date, currentPoints }
      : { type: "checkin" as const };
  let result: Awaited<ReturnType<typeof applyAttendanceActionInDb>>;
  try {
    result = await applyAttendanceActionInDb({
      userId: user.id,
      metadata: baseMetadata,
      action,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to process attendance." },
      { status: 500 }
    );
  }

  if (!result.ok || !result.award) {
    return NextResponse.json(
      {
        message: result.message,
        code: result.code,
        summary: result.summary,
      },
      { status: result.code === "insufficient_points" ? 402 : 409 }
    );
  }

  const pointAward = applyMirPointDelta({
    metadata: result.metadata,
    points: result.award.totalAwarded,
    source: result.award.type === "makeup" ? "attendance_makeup" : "daily_attendance",
    referenceId: `${result.award.type}-${result.award.date}`,
    title: result.award.type === "makeup" ? "补签积分调整" : "每日签到积分",
    description: buildAwardDescription(result.award),
  });

  const metadata = compactAuthMetadata({
    ...result.metadata,
    ...pointAward.metadata,
  });

  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: metadata,
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const pointTransactions = Array.isArray(pointAward.metadata.mir_point_transactions)
    ? pointAward.metadata.mir_point_transactions
    : [];
  const latestPointTransaction = pointTransactions[0];

  if (latestPointTransaction && typeof latestPointTransaction === "object") {
    const source = latestPointTransaction as Record<string, unknown>;
    await insertPointTransaction(user.id, {
      id: readString(source.id),
      title: readString(source.title) || "每日签到积分",
      description: readString(source.description) || "每日签到活动奖励",
      points: readNumber(source.points),
      createdAt: readString(source.createdAt) || new Date().toISOString(),
      source: readString(source.source) || "daily_attendance",
    });
  }

  return NextResponse.json({
    ok: true,
    award: result.award,
    summary: result.summary,
    points: pointAward.afterPoints,
    pointTransaction: latestPointTransaction ?? null,
  });
}

function buildAwardDescription(award: {
  basePoints: number;
  makeupCost: number;
  sevenDayBonus: number;
  twentyFiveDayBonus: number;
  checkedCount: number;
  currentStreak: number;
  type: "checkin" | "makeup";
}) {
  const parts = award.type === "makeup" ? [`补签消耗 -${award.makeupCost}`] : [`每日签到 +${award.basePoints}`];
  if (award.sevenDayBonus > 0) {
    parts.push(`连续 ${award.currentStreak} 天奖励 +${award.sevenDayBonus}`);
  }
  if (award.twentyFiveDayBonus > 0) {
    parts.push(`连续 ${award.currentStreak} 天奖励 +${award.twentyFiveDayBonus}`);
  }
  parts.push(`本月已签到 ${award.checkedCount} 天`);
  return parts.join("，");
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
