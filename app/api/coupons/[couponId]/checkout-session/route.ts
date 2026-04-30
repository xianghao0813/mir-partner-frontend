import { NextRequest, NextResponse } from "next/server";
import {
  createCouponSessionToken,
  getCouponSessionExpiry,
  getCouponStatus,
  type UserCouponRecord,
} from "@/lib/coupons";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
    return NextResponse.json({ message: "该优惠券当前不可使用。" }, { status: 400 });
  }

  await supabaseAdmin
    .from("coupon_checkout_sessions")
    .update({ status: "closed" })
    .eq("user_id", user.id)
    .eq("coupon_id", couponId)
    .eq("status", "open");

  const sessionToken = createCouponSessionToken();
  const expiresAt = getCouponSessionExpiry();

  const { error: insertError } = await supabaseAdmin.from("coupon_checkout_sessions").insert({
    session_token: sessionToken,
    user_id: user.id,
    coupon_id: couponId,
    status: "open",
    expires_at: expiresAt,
  });

  if (insertError) {
    return NextResponse.json({ message: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    token: sessionToken,
    checkoutUrl: `/coupon/checkout/${sessionToken}`,
    expiresAt,
  });
}
