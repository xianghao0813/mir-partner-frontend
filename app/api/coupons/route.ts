import { NextResponse } from "next/server";
import { getCouponStatus, shouldKeepArchivedCoupon, type UserCouponRecord } from "@/lib/coupons";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  const now = new Date();
  const cleanupBefore = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  await supabaseAdmin
    .from("user_coupons")
    .delete()
    .eq("user_id", user.id)
    .or(`used_at.lt.${cleanupBefore},and(used_at.is.null,expires_at.lt.${cleanupBefore})`);

  const { data, error } = await supabaseAdmin
    .from("user_coupons")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({
        unused: [],
        expired: [],
        used: [],
        message: "优惠券数据表尚未初始化。",
      });
    }

    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const result = {
    unused: [] as ReturnType<typeof serializeCoupon>[],
    expired: [] as ReturnType<typeof serializeCoupon>[],
    used: [] as ReturnType<typeof serializeCoupon>[],
  };

  for (const coupon of (data ?? []) as UserCouponRecord[]) {
    const status = getCouponStatus(coupon, now);
    if (status !== "unused" && !shouldKeepArchivedCoupon(coupon, now)) {
      continue;
    }

    result[status].push(serializeCoupon(coupon, status));
  }

  return NextResponse.json(result);
}

function serializeCoupon(coupon: UserCouponRecord, status: "unused" | "expired" | "used") {
  return {
    id: coupon.id,
    code: coupon.coupon_code,
    title: coupon.title,
    description: coupon.description ?? "",
    discountType: coupon.discount_type,
    discountValue: Number(coupon.discount_value),
    minAmount: Number(coupon.min_amount),
    applicablePackageIds: coupon.applicable_package_ids ?? [],
    startsAt: coupon.starts_at,
    expiresAt: coupon.expires_at,
    usedAt: coupon.used_at,
    usedOrderNo: coupon.used_order_no,
    status,
  };
}

function isMissingTableError(error: { code?: string; message?: string }) {
  return error.code === "42P01" || (error.message ?? "").includes("does not exist");
}
