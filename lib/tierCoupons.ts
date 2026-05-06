import type { SupabaseClient, UserMetadata } from "@supabase/supabase-js";
import { getCurrentTier, getShanghaiMonthKey, MIR_PARTNER_TIERS } from "@/lib/mirPoints";

export type TierCouponBenefit = {
  key: "coupon-100-8" | "coupon-300-28";
  title: string;
  description: string;
  minAmount: number;
  discountValue: number;
  applicablePackageIds: number[];
  count: number;
};

export type TierCouponGrantResult = {
  granted: boolean;
  monthKey: string;
  fromTierId: number;
  toTierId: number;
  couponsIssued: number;
  metadata: UserMetadata;
};

export function getTierCouponBenefits(tierId: number): TierCouponBenefit[] {
  const normalizedTierId = Math.max(1, Math.min(MIR_PARTNER_TIERS.length, Math.floor(tierId || 1)));
  const extraCount = (normalizedTierId - 1) * 2;

  return [
    {
      key: "coupon-100-8",
      title: "100元云币充值券",
      description: "购买 100 元云币商品时可立减 8 元。",
      minAmount: 100,
      discountValue: 8,
      applicablePackageIds: [1],
      count: 3 + extraCount,
    },
    {
      key: "coupon-300-28",
      title: "300元云币充值券",
      description: "购买 300 元云币商品时可立减 28 元。",
      minAmount: 300,
      discountValue: 28,
      applicablePackageIds: [2],
      count: 1 + extraCount,
    },
  ];
}

export function getTierCouponTotalCount(tierId: number) {
  return getTierCouponBenefits(tierId).reduce((sum, item) => sum + item.count, 0);
}

export function getGrantedTierCouponId(metadata: UserMetadata | undefined, monthKey = getShanghaiMonthKey()) {
  if (readString(metadata?.mir_coupon_grant_month_key) !== monthKey) {
    return 0;
  }

  return readNumber(metadata?.mir_coupon_grant_tier_id);
}

export async function grantTierCoupons({
  supabaseAdmin,
  userId,
  metadata,
  targetTierId,
  reason,
  now = new Date(),
}: {
  supabaseAdmin: SupabaseClient;
  userId: string;
  metadata: UserMetadata | undefined;
  targetTierId: number;
  reason: "monthly_settlement" | "tier_upgrade_claim";
  now?: Date;
}): Promise<TierCouponGrantResult> {
  const monthKey = getShanghaiMonthKey(now);
  const fromTierId = getGrantedTierCouponId(metadata, monthKey);
  const toTierId = Math.max(1, Math.min(MIR_PARTNER_TIERS.length, Math.floor(targetTierId || 1)));

  if (toTierId <= fromTierId) {
    return {
      granted: false,
      monthKey,
      fromTierId,
      toTierId,
      couponsIssued: 0,
      metadata: metadata ?? {},
    };
  }

  const fromBenefits = getTierCouponBenefits(fromTierId || 1);
  const toBenefits = getTierCouponBenefits(toTierId);
  const startsAt = now.toISOString();
  const expiresAt = getNextShanghaiMonthStart(now).toISOString();
  const rows = toBenefits.flatMap((targetBenefit) => {
    const previousCount = fromTierId > 0
      ? fromBenefits.find((item) => item.key === targetBenefit.key)?.count ?? 0
      : 0;
    const diffCount = Math.max(0, targetBenefit.count - previousCount);

    return Array.from({ length: diffCount }, (_, index) => ({
      user_id: userId,
      coupon_code: buildCouponCode(monthKey, toTierId, targetBenefit.key, index),
      title: targetBenefit.title,
      description: `${targetBenefit.description} ${reason === "monthly_settlement" ? "每月星级权益自动发放。" : "星级晋升追加发放。"}`,
      discount_type: "amount",
      discount_value: targetBenefit.discountValue,
      min_amount: targetBenefit.minAmount,
      applicable_package_ids: targetBenefit.applicablePackageIds,
      starts_at: startsAt,
      expires_at: expiresAt,
    }));
  });

  if (rows.length > 0) {
    const { error } = await supabaseAdmin.from("user_coupons").insert(rows);
    if (error) {
      throw new Error(`tier coupon grant failed: ${error.message}`);
    }
  }

  return {
    granted: rows.length > 0,
    monthKey,
    fromTierId,
    toTierId,
    couponsIssued: rows.length,
    metadata: {
      ...(metadata ?? {}),
      mir_coupon_grant_month_key: monthKey,
      mir_coupon_grant_tier_id: toTierId,
      mir_coupon_grant_count: (readNumber(metadata?.mir_coupon_grant_count) || 0) + rows.length,
      mir_coupon_grant_last_reason: reason,
      mir_coupon_grant_last_at: now.toISOString(),
    },
  };
}

export function getTierCouponClaimState(metadata: UserMetadata | undefined, points: number, now = new Date()) {
  const monthKey = getShanghaiMonthKey(now);
  const currentTier = getCurrentTier(points);
  const grantedTierId = getGrantedTierCouponId(metadata, monthKey);
  const pending = Math.max(0, getTierCouponTotalCount(currentTier.id) - (grantedTierId > 0 ? getTierCouponTotalCount(grantedTierId) : 0));

  return {
    monthKey,
    currentTierId: currentTier.id,
    grantedTierId,
    pendingCount: currentTier.id > grantedTierId ? pending : 0,
    claimable: currentTier.id > grantedTierId && grantedTierId > 0,
  };
}

function buildCouponCode(monthKey: string, tierId: number, key: string, index: number) {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MIR-${monthKey.replace("-", "")}-T${tierId}-${key.replace("coupon-", "")}-${index + 1}-${suffix}`;
}

function getNextShanghaiMonthStart(now: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
  });
  const [year, month] = formatter.format(now).split("-").map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  return new Date(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+08:00`);
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.floor(parsed);
    }
  }
  return 0;
}
