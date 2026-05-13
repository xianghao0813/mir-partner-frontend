import { NextResponse } from "next/server";
import {
  expireCouponCheckoutSessions,
  expireCouponGiftTransfers,
  getCouponStatus,
  shouldKeepArchivedCoupon,
  type CouponGiftTransferRecord,
  type UserCouponRecord,
} from "@/lib/coupons";
import { compactAuthMetadata } from "@/lib/authMetadata";
import { requireRealNameVerified } from "@/lib/accountSecurity";
import { getCurrentTier, readMirPoints } from "@/lib/mirPoints";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getGrantedTierCouponId, getGrantedTierCouponIdFromDb, grantTierCoupons } from "@/lib/tierCoupons";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  if (!(await requireRealNameVerified(user))) {
    return NextResponse.json({ message: "请先完成实名认证后再查看或领取优惠券。" }, { status: 403 });
  }

  await expireCouponCheckoutSessions(supabaseAdmin);
  await expireCouponGiftTransfers(supabaseAdmin);
  await ensureMonthlyTierCoupons(user.id, user.user_metadata);

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

  const couponIds = ((data ?? []) as UserCouponRecord[]).map((coupon) => coupon.id);
  const pendingTransfersByCouponId = new Map<string, CouponGiftTransferRecord>();
  const claimedTransferCouponIds = new Set<string>();
  if (couponIds.length > 0) {
    const { data: transfers } = await supabaseAdmin
      .from("coupon_gift_transfers")
      .select("*")
      .in("coupon_id", couponIds)
      .in("status", ["pending", "claimed"]);

    for (const transfer of (transfers ?? []) as CouponGiftTransferRecord[]) {
      if (transfer.status === "pending") {
        pendingTransfersByCouponId.set(transfer.coupon_id, transfer);
      } else if (transfer.status === "claimed") {
        claimedTransferCouponIds.add(transfer.coupon_id);
      }
    }
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

    result[status].push(serializeCoupon(coupon, status, pendingTransfersByCouponId.get(coupon.id), claimedTransferCouponIds.has(coupon.id)));
  }

  const { data: sentClaimedTransfers } = await supabaseAdmin
    .from("coupon_gift_transfers")
    .select("*")
    .eq("from_user_id", user.id)
    .eq("status", "claimed")
    .gte("claimed_at", cleanupBefore);

  const sentTransfers = ((sentClaimedTransfers ?? []) as CouponGiftTransferRecord[])
    .filter((transfer) => !claimedTransferCouponIds.has(transfer.coupon_id));
  const sentCouponIds = [...new Set(sentTransfers.map((transfer) => transfer.coupon_id))];

  if (sentCouponIds.length > 0) {
    const { data: sentCoupons } = await supabaseAdmin
      .from("user_coupons")
      .select("*")
      .in("id", sentCouponIds);
    const sentTransferByCouponId = new Map(sentTransfers.map((transfer) => [transfer.coupon_id, transfer]));

    for (const coupon of (sentCoupons ?? []) as UserCouponRecord[]) {
      result.used.push(serializeCoupon(coupon, "used", undefined, true, sentTransferByCouponId.get(coupon.id)));
    }
  }

  return NextResponse.json(result);
}

async function ensureMonthlyTierCoupons(userId: string, metadata: Record<string, unknown> | undefined) {
  const dbGrantedTierId = await getGrantedTierCouponIdFromDb({ supabaseAdmin, userId });
  if (Math.max(getGrantedTierCouponId(metadata), dbGrantedTierId) > 0) {
    return;
  }

  const currentTier = getCurrentTier(readMirPoints(metadata));
  const grant = await grantTierCoupons({
    supabaseAdmin,
    userId,
    metadata,
    targetTierId: currentTier.id,
    reason: "initial_monthly",
  });

  if (!grant.granted) {
    return;
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: compactAuthMetadata(grant.metadata),
  });

  if (error) {
    console.error("[coupon initial monthly grant metadata update]", error);
  }
}

async function ensureTestPaymentCoupon(userId: string) {
  const couponCode = "TEST-2YUAN-1YUAN";
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("user_coupons")
    .select("id")
    .eq("user_id", userId)
    .eq("coupon_code", couponCode)
    .maybeSingle();

  if (existingError || existing) {
    if (existingError) {
      console.error("[test coupon lookup]", existingError);
    }
    return;
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const { error } = await supabaseAdmin.from("user_coupons").insert({
    user_id: userId,
    coupon_code: couponCode,
    title: "2元测试支付券",
    description: "购买 2 云币测试商品时立减 1 元。",
    discount_type: "amount",
    discount_value: 1,
    min_amount: 2,
    applicable_package_ids: [1],
    starts_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    console.error("[test coupon grant]", error);
  }
}

function serializeCoupon(
  coupon: UserCouponRecord,
  status: "unused" | "expired" | "used",
  pendingTransfer?: CouponGiftTransferRecord,
  giftClaimed = false,
  claimedTransfer?: CouponGiftTransferRecord
) {
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
    usedAt: coupon.used_at ?? claimedTransfer?.claimed_at ?? null,
    usedOrderNo: coupon.used_order_no,
    giftTransfer: pendingTransfer
      ? {
          id: pendingTransfer.id,
          status: pendingTransfer.status,
          giftUrl: buildGiftUrl(pendingTransfer.transfer_token),
          expiresAt: pendingTransfer.expires_at,
        }
      : null,
    giftClaimed,
    status,
  };
}

function buildGiftUrl(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "";
  return `${baseUrl}/coupon/gift/${token}`;
}

function isMissingTableError(error: { code?: string; message?: string }) {
  return error.code === "42P01" || (error.message ?? "").includes("does not exist");
}
