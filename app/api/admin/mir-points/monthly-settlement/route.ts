import { NextResponse } from "next/server";
import { settleMonthlyMirPoints } from "@/lib/mirPoints";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const secret = process.env.MIR_POINTS_CRON_SECRET?.trim();
  const requestSecret = request.headers.get("x-cron-secret")?.trim() ?? "";

  if (secret && requestSecret !== secret) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const results = [];

  for (const user of data.users) {
    const settlement = settleMonthlyMirPoints(user.user_metadata);

    if (settlement.skipped) {
      results.push({
        userId: user.id,
        skipped: true,
      });
      continue;
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: settlement.metadata,
    });

    results.push({
      userId: user.id,
      skipped: false,
      beforePoints: settlement.beforePoints,
      afterPoints: settlement.afterPoints,
      deductedPoints: settlement.deductedPoints,
      beforeTier: settlement.beforeTier.label,
      afterTier: settlement.afterTier.label,
      error: updateError?.message,
    });
  }

  return NextResponse.json({
    success: true,
    count: results.length,
    results,
  });
}
