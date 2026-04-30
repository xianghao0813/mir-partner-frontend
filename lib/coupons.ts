import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CloudCoinPackage } from "@/lib/cloudCoinPackages";

export type CouponDiscountType = "amount" | "percent";
export type CouponStatus = "unused" | "expired" | "used";

export type UserCouponRecord = {
  id: string;
  user_id: string;
  coupon_code: string;
  title: string;
  description: string | null;
  discount_type: CouponDiscountType;
  discount_value: number;
  min_amount: number;
  applicable_package_ids: number[] | null;
  starts_at: string;
  expires_at: string;
  used_at: string | null;
  used_order_no: string | null;
  created_at: string;
};

export type CouponCheckoutSessionRecord = {
  id: string;
  session_token: string;
  user_id: string;
  coupon_id: string;
  status: "open" | "consumed" | "expired" | "closed";
  cp_order_no: string | null;
  package_id: number | null;
  opened_at: string;
  consumed_at: string | null;
  expires_at: string;
};

export function getCouponStatus(coupon: Pick<UserCouponRecord, "starts_at" | "expires_at" | "used_at">, now = new Date()): CouponStatus {
  if (coupon.used_at) {
    return "used";
  }

  const startsAt = new Date(coupon.starts_at);
  const expiresAt = new Date(coupon.expires_at);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(expiresAt.getTime())) {
    return "expired";
  }

  return startsAt <= now && now <= expiresAt ? "unused" : "expired";
}

export function shouldKeepArchivedCoupon(coupon: Pick<UserCouponRecord, "expires_at" | "used_at">, now = new Date()) {
  const baseDate = coupon.used_at ? new Date(coupon.used_at) : new Date(coupon.expires_at);
  if (Number.isNaN(baseDate.getTime())) {
    return false;
  }

  return now.getTime() - baseDate.getTime() <= 30 * 24 * 60 * 60 * 1000;
}

export function createCouponSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function getCouponSessionExpiry() {
  return new Date(Date.now() + 60 * 1000).toISOString();
}

export async function expireCouponCheckoutSessions(supabaseAdmin: SupabaseClient, now = new Date()) {
  const nowIso = now.toISOString();
  const { data } = await supabaseAdmin
    .from("coupon_checkout_sessions")
    .select("id,coupon_id,cp_order_no,status")
    .in("status", ["open", "consumed"])
    .lte("expires_at", nowIso);

  const expiredSessions = Array.isArray(data) ? data as Record<string, unknown>[] : [];

  await supabaseAdmin
    .from("coupon_checkout_sessions")
    .update({ status: "expired" })
    .in("status", ["open", "consumed"])
    .lte("expires_at", nowIso);

  await Promise.all(
    expiredSessions
      .filter((session) => typeof session.coupon_id === "string" && typeof session.cp_order_no === "string")
      .map((session) =>
        supabaseAdmin
          .from("user_coupons")
          .update({ used_at: null, used_order_no: null })
          .eq("id", session.coupon_id)
          .eq("used_order_no", session.cp_order_no)
      )
  );
}

export function isPackageApplicable(coupon: Pick<UserCouponRecord, "applicable_package_ids" | "min_amount">, item: CloudCoinPackage) {
  const amount = Number(item.amount);
  const packageIds = Array.isArray(coupon.applicable_package_ids) ? coupon.applicable_package_ids : [];
  if (packageIds.length > 0 && !packageIds.includes(item.id)) {
    return false;
  }

  return amount >= Number(coupon.min_amount || 0);
}

export function applyCouponDiscount(amount: number, coupon: Pick<UserCouponRecord, "discount_type" | "discount_value">) {
  const discountValue = Math.max(0, Number(coupon.discount_value || 0));
  const discount =
    coupon.discount_type === "percent"
      ? amount * Math.min(discountValue, 100) / 100
      : discountValue;
  return Math.max(0.01, roundMoney(amount - discount));
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function formatMoney(value: number) {
  return roundMoney(value).toFixed(2);
}
