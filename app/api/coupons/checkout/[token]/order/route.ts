import { NextRequest, NextResponse } from "next/server";
import { getCloudCoinPackage } from "@/lib/cloudCoinPackages";
import {
  applyCouponDiscount,
  expireCouponCheckoutSessions,
  formatMoney,
  getCouponStatus,
  isPackageApplicable,
  type CouponCheckoutSessionRecord,
  type UserCouponRecord,
} from "@/lib/coupons";
import { createQuickSdkPayUrl, getQuickSdkPublicBaseUrl } from "@/lib/quicksdk";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "请先登录。" }, { status: 401 });
    }

    await expireCouponCheckoutSessions(supabaseAdmin);

    const body = (await request.json().catch(() => null)) as
      | {
          packageId?: number;
          payMethod?: "wechat" | "alipay";
        }
      | null;

    const packageId = Number(body?.packageId ?? 0);
    const payMethod = body?.payMethod === "alipay" ? "alipay" : "wechat";
    const selectedPackage = getCloudCoinPackage(packageId);

    if (!selectedPackage) {
      return NextResponse.json({ message: "无效的充值档位。" }, { status: 400 });
    }

    const { token } = await context.params;
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("coupon_checkout_sessions")
      .select("*")
      .eq("session_token", token)
      .eq("user_id", user.id)
      .maybeSingle();

    if (sessionError) {
      return NextResponse.json({ message: sessionError.message }, { status: 500 });
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

    if (!coupon) {
      return NextResponse.json({ message: "优惠券不存在。" }, { status: 404 });
    }

    const couponRecord = coupon as UserCouponRecord;
    if (getCouponStatus(couponRecord) !== "unused") {
      return NextResponse.json({ message: "该优惠券已经使用或已过期。" }, { status: 400 });
    }

    if (!isPackageApplicable(couponRecord, selectedPackage)) {
      return NextResponse.json({ message: "该商品不符合优惠券使用条件。" }, { status: 400 });
    }

    const uid = String(user.user_metadata?.quicksdk_uid ?? "").trim();
    const username =
      String(user.user_metadata?.quicksdk_username ?? "").trim() ||
      user.email?.split("@")[0] ||
      "player";

    if (!uid) {
      return NextResponse.json({ message: "当前账号未绑定 SDK UID。" }, { status: 400 });
    }

    const originalAmount = Number(selectedPackage.amount);
    const finalAmount = applyCouponDiscount(originalAmount, couponRecord);
    const cpOrderNo = buildCouponOrderNo(user.id, selectedPackage.id);
    const requestUrl = new URL(request.url);
    const publicBaseUrl = getQuickSdkPublicBaseUrl(requestUrl.origin);
    const callbackUrl = new URL("/api/payment/quicksdk/callback", publicBaseUrl).toString();
    const successUrl = new URL("/profile/wallet?payment=success&coupon=used", publicBaseUrl).toString();
    const cancelUrl = new URL("/profile/wallet?payment=cancel&coupon=used", publicBaseUrl).toString();
    const extrasParams = Buffer.from(
      JSON.stringify({
        packageId: selectedPackage.id,
        coins: selectedPackage.coins,
        payMethod,
        userId: user.id,
        couponId: couponRecord.id,
        couponSessionToken: token,
        originalAmount: formatMoney(originalAmount),
        discountAmount: formatMoney(originalAmount - finalAmount),
      }),
      "utf8"
    ).toString("base64");

    const nowIso = new Date().toISOString();
    const { data: consumedSession, error: consumeError } = await supabaseAdmin
      .from("coupon_checkout_sessions")
      .update({
        status: "consumed",
        consumed_at: nowIso,
        cp_order_no: cpOrderNo,
        package_id: selectedPackage.id,
      })
      .eq("id", checkoutSession.id)
      .eq("status", "open")
      .select("id")
      .maybeSingle();

    if (consumeError) {
      return NextResponse.json({ message: consumeError.message }, { status: 500 });
    }

    if (!consumedSession) {
      return NextResponse.json({ message: "优惠券使用链接已被使用，请重新领取。" }, { status: 409 });
    }

    const { data: usedCoupon, error: couponUpdateError } = await supabaseAdmin
      .from("user_coupons")
      .update({
        used_at: nowIso,
        used_order_no: cpOrderNo,
      })
      .eq("id", couponRecord.id)
      .is("used_at", null)
      .select("id")
      .maybeSingle();

    if (couponUpdateError || !usedCoupon) {
      return NextResponse.json({ message: couponUpdateError?.message ?? "优惠券已经被使用。" }, { status: 409 });
    }

    const payUrl = await createQuickSdkPayUrl({
      amount: formatMoney(finalAmount),
      userId: uid,
      cpOrderNo,
      orderSubject: `${selectedPackage.subject} 优惠券`,
      goodsName: selectedPackage.subject,
      goodsId: selectedPackage.goodsId,
      roleId: uid,
      roleName: username,
      roleLevel: "1",
      serverId: "mir-partner",
      serverName: "MIR Partner",
      extrasParams,
      callbackUrl,
      successUrl,
      cancelUrl,
      theme: "default",
    });

    return NextResponse.json({
      payUrl,
      cpOrderNo,
      amount: formatMoney(finalAmount),
      originalAmount: selectedPackage.amount,
      discountAmount: formatMoney(originalAmount - finalAmount),
      coins: selectedPackage.coins,
    });
  } catch (error) {
    console.error("[Coupon order]", error);

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "创建优惠券支付链接失败。" },
      { status: 500 }
    );
  }
}

function buildCouponOrderNo(userId: string, packageId: number) {
  const stamp = Date.now();
  const compactUserId = userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10) || "user";
  return `cp${stamp}${packageId}${compactUserId}`.slice(0, 40);
}
