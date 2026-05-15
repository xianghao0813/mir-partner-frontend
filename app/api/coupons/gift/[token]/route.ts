import { NextRequest, NextResponse } from "next/server";
import {
  expireCouponGiftTransfers,
  getCouponStatus,
  getShanghaiMonthRange,
  type CouponGiftTransferRecord,
  type UserCouponRecord,
} from "@/lib/coupons";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MONTHLY_RECEIVE_LIMIT = 5;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  await expireCouponGiftTransfers(supabaseAdmin);

  const transfer = await safeFindPendingTransfer((await context.params).token);
  if (!transfer) {
    return NextResponse.json({ message: "赠送链接无效或已过期。" }, { status: 404 });
  }

  const { data: coupon, error } = await supabaseAdmin
    .from("user_coupons")
    .select("*")
    .eq("id", transfer.coupon_id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  if (!coupon || getCouponStatus(coupon as UserCouponRecord) !== "unused") {
    return NextResponse.json({ message: "该优惠券当前不可领取。" }, { status: 400 });
  }

  const couponRecord = coupon as UserCouponRecord;
  return NextResponse.json({
    coupon: {
      title: couponRecord.title,
      description: couponRecord.description ?? "",
      discountType: couponRecord.discount_type,
      discountValue: Number(couponRecord.discount_value),
      minAmount: Number(couponRecord.min_amount),
      expiresAt: couponRecord.expires_at,
    },
    transfer: {
      expiresAt: transfer.expires_at,
    },
  });
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "请先登录后领取优惠券。" }, { status: 401 });
  }

  await expireCouponGiftTransfers(supabaseAdmin);

  const transfer = await safeFindPendingTransfer((await context.params).token);
  if (!transfer) {
    return NextResponse.json({ message: "赠送链接无效或已过期。" }, { status: 404 });
  }

  if (transfer.from_user_id === user.id) {
    return NextResponse.json({ message: "不能领取自己赠送的优惠券。" }, { status: 400 });
  }

  const { startIso, endIso } = getShanghaiMonthRange();
  const { count, error: countError } = await supabaseAdmin
    .from("coupon_gift_transfers")
    .select("id", { count: "exact", head: true })
    .eq("to_user_id", user.id)
    .eq("status", "claimed")
    .gte("claimed_at", startIso)
    .lt("claimed_at", endIso);

  if (countError) {
    return NextResponse.json({ message: countError.message }, { status: 500 });
  }

  if ((count ?? 0) >= MONTHLY_RECEIVE_LIMIT) {
    return NextResponse.json({ message: "本月最多可领取 5 张他人赠送的优惠券。" }, { status: 429 });
  }

  const { data: coupon, error: couponError } = await supabaseAdmin
    .from("user_coupons")
    .select("*")
    .eq("id", transfer.coupon_id)
    .eq("user_id", transfer.from_user_id)
    .maybeSingle();

  if (couponError) {
    return NextResponse.json({ message: couponError.message }, { status: 500 });
  }

  if (!coupon || getCouponStatus(coupon as UserCouponRecord) !== "unused") {
    return NextResponse.json({ message: "该优惠券当前不可领取。" }, { status: 400 });
  }

  const { data: claimedTransfer, error: claimError } = await supabaseAdmin
    .from("coupon_gift_transfers")
    .update({ status: "claimed", to_user_id: user.id, claimed_at: new Date().toISOString() })
    .eq("id", transfer.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (claimError || !claimedTransfer) {
    return NextResponse.json({ message: claimError?.message ?? "该优惠券已被领取或链接已失效。" }, { status: 409 });
  }

  const { data: updatedCoupon, error: updateCouponError } = await supabaseAdmin
    .from("user_coupons")
    .update({ user_id: user.id })
    .eq("id", transfer.coupon_id)
    .eq("user_id", transfer.from_user_id)
    .is("used_at", null)
    .select("id")
    .maybeSingle();

  if (updateCouponError || !updatedCoupon) {
    await supabaseAdmin
      .from("coupon_gift_transfers")
      .update({ status: "pending", to_user_id: null, claimed_at: null })
      .eq("id", transfer.id)
      .eq("status", "claimed");
    return NextResponse.json({ message: updateCouponError?.message ?? "该优惠券已被使用或已不属于赠送人。" }, { status: 409 });
  }

  return NextResponse.json({ success: true, message: "优惠券已领取到你的钱包。" });
}

async function safeFindPendingTransfer(token: string): Promise<CouponGiftTransferRecord | null> {
  try {
    return await findPendingTransfer(token);
  } catch (error) {
    if (isMissingTableError(error)) {
      return null;
    }
    throw error;
  }
}

async function findPendingTransfer(token: string): Promise<CouponGiftTransferRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("coupon_gift_transfers")
    .select("*")
    .eq("transfer_token", token)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as CouponGiftTransferRecord | null;
}

function isMissingTableError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "42P01";
}
