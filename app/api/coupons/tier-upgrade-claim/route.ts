import { NextResponse } from "next/server";
import { compactAuthMetadata } from "@/lib/authMetadata";
import { requireRealNameVerified } from "@/lib/accountSecurity";
import { readMirPoints } from "@/lib/mirPoints";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getGrantedTierCouponIdFromDb, getTierCouponClaimState, grantTierCoupons } from "@/lib/tierCoupons";
import { readPointTransactionsFromDb } from "@/lib/userLedgers";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  if (!(await requireRealNameVerified(user))) {
    return NextResponse.json({ message: "请先完成实名认证后再领取优惠券。" }, { status: 403 });
  }

  const ledgerTransactions = await readPointTransactionsFromDb(user.id);
  const ledgerPoints = ledgerTransactions.reduce((sum, entry) => sum + entry.points, 0);
  const metadata =
    ledgerPoints > readMirPoints(user.user_metadata)
      ? {
          ...(user.user_metadata ?? {}),
          mir_points: ledgerPoints,
        }
      : user.user_metadata;
  const points = readMirPoints(metadata);
  const dbGrantedTierId = await getGrantedTierCouponIdFromDb({
    supabaseAdmin,
    userId: user.id,
  });
  const metadataClaimState = getTierCouponClaimState(metadata, points);
  const claimMetadata = {
    ...(metadata ?? {}),
    mir_coupon_grant_month_key: metadataClaimState.monthKey,
    mir_coupon_grant_tier_id: Math.max(dbGrantedTierId, metadataClaimState.grantedTierId),
  };
  const claimState = getTierCouponClaimState(claimMetadata, points);

  if (!claimState.claimable) {
    return NextResponse.json(
      { message: "当前没有可领取的星级优惠券。" },
      { status: 400 }
    );
  }

  const grant = await grantTierCoupons({
    supabaseAdmin,
    userId: user.id,
    metadata: claimMetadata,
    targetTierId: claimState.currentTierId,
    reason: "tier_upgrade_claim",
  });

  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: compactAuthMetadata(grant.metadata),
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    couponsIssued: grant.couponsIssued,
    fromTierId: grant.fromTierId,
    toTierId: grant.toTierId,
  });
}
