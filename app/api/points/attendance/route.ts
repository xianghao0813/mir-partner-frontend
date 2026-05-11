import { NextResponse } from "next/server";
import { compactAuthMetadata } from "@/lib/authMetadata";
import { buildAttendanceSummary, checkInAttendance } from "@/lib/attendance";
import { awardMirPoints, readMirPoints } from "@/lib/mirPoints";
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
    summary: buildAttendanceSummary(user.user_metadata),
  });
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const ledgerTransactions = await readPointTransactionsFromDb(user.id);
  const ledgerTotal = ledgerTransactions.reduce((sum, entry) => sum + entry.points, 0);
  const baseMetadata =
    ledgerTotal > readMirPoints(user.user_metadata)
      ? {
          ...(user.user_metadata ?? {}),
          mir_points: ledgerTotal,
        }
      : user.user_metadata;
  const result = checkInAttendance(baseMetadata);

  if (result.alreadyChecked || !result.award) {
    return NextResponse.json(
      {
        message: "今日已经出席。",
        summary: result.summary,
      },
      { status: 409 }
    );
  }

  const pointAward = awardMirPoints({
    metadata: result.metadata,
    points: result.award.totalAwarded,
    source: "daily_attendance",
    referenceId: `attendance-${result.award.date}`,
    title: "每日出席积分",
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
      title: readString(source.title) || "每日出席积分",
      description: readString(source.description) || "每日出席活动奖励",
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
  sevenDayBonus: number;
  thirtyDayBonus: number;
  totalDays: number;
}) {
  const parts = [`每日出席 +${award.basePoints}`];
  if (award.sevenDayBonus > 0) {
    parts.push(`累计 ${award.totalDays} 天 7日奖励 +${award.sevenDayBonus}`);
  }
  if (award.thirtyDayBonus > 0) {
    parts.push(`累计 ${award.totalDays} 天 30日奖励 +${award.thirtyDayBonus}`);
  }
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
