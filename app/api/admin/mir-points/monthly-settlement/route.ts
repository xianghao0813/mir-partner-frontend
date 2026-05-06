import { NextResponse } from "next/server";
import { compactAuthMetadata } from "@/lib/authMetadata";
import { settleMonthlyMirPoints } from "@/lib/mirPoints";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { grantTierCoupons } from "@/lib/tierCoupons";
import { insertPointTransaction } from "@/lib/userLedgers";

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

    let nextMetadata = settlement.metadata;
    let couponGrant = null;

    try {
      couponGrant = await grantTierCoupons({
        supabaseAdmin,
        userId: user.id,
        metadata: nextMetadata,
        targetTierId: settlement.afterTier.id,
        reason: "monthly_settlement",
      });
      nextMetadata = couponGrant.metadata;
    } catch (couponError) {
      console.error("[monthly settlement tier coupons]", {
        userId: user.id,
        error: couponError instanceof Error ? couponError.message : couponError,
      });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: compactAuthMetadata(nextMetadata),
    });

    if (!updateError && settlement.deductedPoints > 0) {
      await insertPointTransaction(user.id, {
        id: `monthly-settlement-${settlement.metadata.mir_monthly_settled_key}-${user.id}`,
        title: "月度星级结算",
        description: "未完成升星，按当前星级规则扣减积分",
        points: -settlement.deductedPoints,
        createdAt: new Date().toISOString(),
        source: "monthly_settlement",
      });
    }

    results.push({
      userId: user.id,
      skipped: false,
      beforePoints: settlement.beforePoints,
      afterPoints: settlement.afterPoints,
      deductedPoints: settlement.deductedPoints,
      beforeTier: settlement.beforeTier.label,
      afterTier: settlement.afterTier.label,
      couponsIssued: couponGrant?.couponsIssued ?? 0,
      error: updateError?.message,
    });
  }

  return NextResponse.json({
    success: true,
    count: results.length,
    results,
  });
}
