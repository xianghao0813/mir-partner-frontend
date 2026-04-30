import { NextRequest, NextResponse } from "next/server";
import { CLOUD_COIN_PACKAGES } from "@/lib/cloudCoinPackages";
import {
  applyCouponDiscount,
  expireCouponCheckoutSessions,
  formatMoney,
  getCouponStatus,
  isPackageApplicable,
  type CouponCheckoutSessionRecord,
  type UserCouponRecord,
} from "@/lib/coupons";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  await expireCouponCheckoutSessions(supabaseAdmin);

  const { token } = await context.params;
  const { data: session, error } = await supabaseAdmin
    .from("coupon_checkout_sessions")
    .select("*")
    .eq("session_token", token)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  if (!session) {
    return NextResponse.json({ message: "优惠券使用链接不存在或已失效。" }, { status: 404 });
  }

  const checkoutSession = session as CouponCheckoutSessionRecord;
  if (checkoutSession.status !== "open" || new Date(checkoutSession.expires_at).getTime() <= Date.now()) {
    await supabaseAdmin
      .from("coupon_checkout_sessions")
      .update({ status: "expired" })
      .eq("id", checkoutSession.id)
      .eq("status", "open");

    return NextResponse.json({ message: "优惠券使用链接已失效。" }, { status: 410 });
  }

  const { data: coupon, error: couponError } = await supabaseAdmin
    .from("user_coupons")
    .select("*")
    .eq("id", checkoutSession.coupon_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (couponError) {
    return NextResponse.json({ message: couponError.message }, { status: 500 });
  }

  if (!coupon || getCouponStatus(coupon as UserCouponRecord) !== "unused") {
    return NextResponse.json({ message: "该优惠券当前不可使用。" }, { status: 400 });
  }

  const couponRecord = coupon as UserCouponRecord;
  const packages = CLOUD_COIN_PACKAGES
    .filter((item) => isPackageApplicable(couponRecord, item))
    .map((item) => {
      const originalAmount = Number(item.amount);
      const finalAmount = applyCouponDiscount(originalAmount, couponRecord);
      return {
        id: item.id,
        coins: item.coins,
        subject: item.subject,
        originalAmount: formatMoney(originalAmount),
        finalAmount: formatMoney(finalAmount),
        discountAmount: formatMoney(originalAmount - finalAmount),
      };
    });

  return NextResponse.json({
    session: {
      token,
      expiresAt: checkoutSession.expires_at,
    },
    coupon: {
      id: couponRecord.id,
      code: couponRecord.coupon_code,
      title: couponRecord.title,
      description: couponRecord.description ?? "",
      discountType: couponRecord.discount_type,
      discountValue: Number(couponRecord.discount_value),
      minAmount: Number(couponRecord.min_amount),
      expiresAt: couponRecord.expires_at,
    },
    packages,
  });
}
