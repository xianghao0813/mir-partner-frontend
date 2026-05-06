import { NextResponse } from "next/server";
import { compactAuthMetadata } from "@/lib/authMetadata";
import { readMirPoints } from "@/lib/mirPoints";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getTierCouponClaimState, grantTierCoupons } from "@/lib/tierCoupons";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  const points = readMirPoints(user.user_metadata);
  const claimState = getTierCouponClaimState(user.user_metadata, points);

  if (!claimState.claimable) {
    return NextResponse.json(
      {
        message: claimState.grantedTierId <= 0
          ? "本月星级权益券尚未完成月度发放。"
          : "当前没有可领取的晋升追加优惠券。",
      },
      { status: 400 }
    );
  }

  const grant = await grantTierCoupons({
    supabaseAdmin,
    userId: user.id,
    metadata: user.user_metadata,
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
