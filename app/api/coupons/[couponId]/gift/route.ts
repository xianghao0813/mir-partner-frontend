import { NextRequest, NextResponse } from "next/server";
import {
  createCouponGiftToken,
  expireCouponGiftTransfers,
  getCouponGiftExpiry,
  getCouponStatus,
  type CouponGiftTransferRecord,
  type UserCouponRecord,
} from "@/lib/coupons";
import { buildMirPointSummary } from "@/lib/mirPoints";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MIN_GIFT_TIER_ID = 5;

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ couponId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  const tier = buildMirPointSummary(user.user_metadata).currentTier;
  if (tier.id < MIN_GIFT_TIER_ID) {
    return NextResponse.json({ message: "米尔四星及以上合伙人才可以赠送优惠券。" }, { status: 403 });
  }

  await expireCouponGiftTransfers(supabaseAdmin);

  const { couponId } = await context.params;
  const { data: coupon, error } = await supabaseAdmin
    .from("user_coupons")
    .select("*")
    .eq("id", couponId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  if (!coupon) {
    return NextResponse.json({ message: "优惠券不存在。" }, { status: 404 });
  }

  if (getCouponStatus(coupon as UserCouponRecord) !== "unused") {
    return NextResponse.json({ message: "已使用或已过期的优惠券不能赠送。" }, { status: 400 });
  }

  const { data: existingTransfers, error: transferError } = await supabaseAdmin
    .from("coupon_gift_transfers")
    .select("*")
    .eq("coupon_id", couponId)
    .in("status", ["pending", "claimed"]);

  if (transferError) {
    if (transferError.code === "42P01") {
      return NextResponse.json({ message: "优惠券赠送数据表尚未初始化。" }, { status: 500 });
    }
    return NextResponse.json({ message: transferError.message }, { status: 500 });
  }

  const transfers = (existingTransfers ?? []) as CouponGiftTransferRecord[];
  const pending = transfers.find((item) => item.status === "pending");
  if (pending) {
    return NextResponse.json({
      transferId: pending.id,
      giftUrl: buildGiftUrl(pending.transfer_token),
      expiresAt: pending.expires_at,
      message: "该优惠券已经处于赠送中。",
    });
  }

  if (transfers.some((item) => item.status === "claimed")) {
    return NextResponse.json({ message: "该优惠券已经成功赠送过，不能再次赠送。" }, { status: 400 });
  }

  const token = createCouponGiftToken();
  const expiresAt = getCouponGiftExpiry();
  const { data: transfer, error: insertError } = await supabaseAdmin
    .from("coupon_gift_transfers")
    .insert({
      coupon_id: couponId,
      from_user_id: user.id,
      transfer_token: token,
      status: "pending",
      expires_at: expiresAt,
    })
    .select("*")
    .single();

  if (insertError) {
    return NextResponse.json({ message: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    transferId: transfer.id,
    giftUrl: buildGiftUrl(token),
    expiresAt,
  });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ couponId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  await expireCouponGiftTransfers(supabaseAdmin);

  const { couponId } = await context.params;
  const { error } = await supabaseAdmin
    .from("coupon_gift_transfers")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("coupon_id", couponId)
    .eq("from_user_id", user.id)
    .eq("status", "pending");

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

function buildGiftUrl(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "";
  return `${baseUrl}/coupon/gift/${token}`;
}
