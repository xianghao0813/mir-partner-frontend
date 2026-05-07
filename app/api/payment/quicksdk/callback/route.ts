import { NextRequest, NextResponse } from "next/server";
import { compactAuthMetadata } from "@/lib/authMetadata";
import { getCloudCoinPackage } from "@/lib/cloudCoinPackages";
import { applyCouponDiscount, expireCouponCheckoutSessions, getCouponStatus, isPackageApplicable, type UserCouponRecord } from "@/lib/coupons";
import { changeQuickSdkPlatformCoins, verifyQuickSdkCallbackSign } from "@/lib/quicksdk";
import { awardMirPoints } from "@/lib/mirPoints";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { insertPointTransaction, insertWalletTransaction } from "@/lib/userLedgers";
import { appendWalletTransaction, readCloudCoins, readWalletTransactions } from "@/lib/wallet";

export async function POST(request: NextRequest) {
  await expireCouponCheckoutSessions(supabaseAdmin);

  const payload = await readCallbackPayload(request);
  console.log("[QuickSDK callback]", payload);

  const cpOrderNo = readString(payload?.cpOrderNo) || readString(payload?.orderNo) || readString(payload?.cp_order_no);
  const extrasParams = readString(payload?.extrasParams) || readString(payload?.extras_params);
  const orderStatus = readString(payload?.status) || readString(payload?.orderStatus) || readString(payload?.payStatus);
  const paidAmount = readNumber(payload?.amount) || readNumber(payload?.money) || readNumber(payload?.realAmount);
  const productName =
    readString(payload?.productName) ||
    readString(payload?.goodsName) ||
    readString(payload?.orderSubject) ||
    readString(payload?.subject);
  const payTypeName = readString(payload?.payTypeName) || readString(payload?.pay_type_name);

  const extras = parseExtras(extrasParams);
  const userId = extras?.userId ?? "";
  const coins = Math.max(0, Number(extras?.coins ?? 0));
  const payMethod: "wechat" | "alipay" = extras?.payMethod === "alipay" ? "alipay" : "wechat";

  if (!userId || !cpOrderNo || !isSuccessStatus(orderStatus) || coins <= 0) {
    return NextResponse.json({
      success: true,
      message: "ignored",
    });
  }

  if (!verifyQuickSdkCallbackSign(payload)) {
    console.error("[QuickSDK callback invalid sign]", {
      cpOrderNo,
      payload,
    });
    return NextResponse.json({
      success: true,
      message: "invalid_sign",
    });
  }

  const orderVerification = await verifyCallbackOrder({
    extras,
    userId,
    cpOrderNo,
    paidAmount,
    payload,
  });
  const expectedAmount = orderVerification.expectedAmount;

  if (expectedAmount <= 0 || paidAmount <= 0 || !isSameMoney(paidAmount, expectedAmount)) {
    console.error("[QuickSDK callback amount mismatch]", {
      cpOrderNo,
      paidAmount,
      expectedAmount,
      extras,
      payload,
    });

    return NextResponse.json({
      success: true,
      message: "amount_mismatch",
    });
  }

  if (orderVerification.alreadyPaid) {
    return NextResponse.json({
      success: true,
      message: "duplicate",
    });
  }

  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data.user) {
    return NextResponse.json({
      success: true,
      message: "user_not_found",
    });
  }

  const user = data.user;
  const transactionId = `sdk-order-${cpOrderNo}`;
  const existingTransactions = readWalletTransactions(user.user_metadata);

  if (existingTransactions.some((item) => item.id === transactionId)) {
    return NextResponse.json({
      success: true,
      message: "duplicate",
    });
  }

  const sdkUid = readString(user.user_metadata?.quicksdk_uid);
  if (!sdkUid) {
    return NextResponse.json({
      success: false,
      message: "missing_quicksdk_uid",
    });
  }

  if (orderVerification.paymentOrderId) {
    const { data: claimedOrder, error: claimError } = await supabaseAdmin
      .from("payment_orders")
      .update({
        status: "paid",
        paid_amount: paidAmount,
        paid_at: new Date().toISOString(),
        raw_callback: payload ?? {},
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderVerification.paymentOrderId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (claimError || !claimedOrder) {
      console.error("[QuickSDK callback payment order claim failed]", {
        cpOrderNo,
        paymentOrderId: orderVerification.paymentOrderId,
        error: claimError?.message,
      });

      return NextResponse.json({
        success: true,
        message: "duplicate_or_order_claim_failed",
      });
    }
  }

  const nextSdkAmount = await changeQuickSdkPlatformCoins({
    userId: sdkUid,
    amount: String(coins),
    remark: `MIR Partner recharge ${cpOrderNo}`,
  });
  const fallbackAmount = readCloudCoins(user.user_metadata) + coins;
  const nextCoins = Math.max(0, Math.floor(nextSdkAmount || fallbackAmount));
  const transaction = {
    id: transactionId,
    type: "recharge" as const,
    amount: paidAmount || coins,
    coins,
    desc: "云币充值",
    date: new Date().toISOString().slice(0, 10),
    payMethod,
    status: "success" as const,
  };
  const shouldAwardPoints = !containsPlatformCoin(productName) && !containsPlatformCoin(payTypeName);
  const awardedMirPoints = shouldAwardPoints ? Math.floor((paidAmount || coins) * 100) : 0;
  const pointAward = awardMirPoints({
    metadata: user.user_metadata,
    points: awardedMirPoints,
    source: "wallet_recharge",
    referenceId: transactionId,
    title: "云币充值积分",
    description: `订单 ${cpOrderNo} 自动发放`,
  });
  await insertWalletTransaction(userId, transaction);
  const pointTransaction = readLatestPointTransaction(pointAward.metadata);
  if (pointTransaction) {
    await insertPointTransaction(userId, pointTransaction);
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: compactAuthMetadata({
      ...pointAward.metadata,
      cloud_coins: nextCoins,
      wallet_last_order_no: cpOrderNo,
      wallet_transactions: appendWalletTransaction(pointAward.metadata, transaction),
    }),
  });

  if (updateError) {
    return NextResponse.json({
      success: false,
      message: updateError.message,
    });
  }

  return NextResponse.json({
    success: true,
    message: "ok",
  });
}

async function readCallbackPayload(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await request.json().catch(() => null)) as Record<string, unknown> | null;
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await request.formData().catch(() => null);
    return formData ? Object.fromEntries(formData.entries()) : null;
  }

  const text = await request.text().catch(() => "");
  return text ? { raw: text } : null;
}

function readString(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function parseExtras(value: string) {
  if (!value) {
    return null;
  }

  try {
    const decoded = Buffer.from(value, "base64").toString("utf8");
    return JSON.parse(decoded) as {
      userId?: string;
      packageId?: number;
      coins?: number;
      payMethod?: "wechat" | "alipay";
      couponId?: string;
      couponSessionToken?: string;
      originalAmount?: string | number;
      discountAmount?: string | number;
      expectedAmount?: string | number;
    };
  } catch {
    return null;
  }
}

async function resolveExpectedPaidAmount(
  extras: ReturnType<typeof parseExtras>,
  userId: string,
  cpOrderNo: string
) {
  if (!extras) {
    return 0;
  }

  const packageId = Math.floor(Number(extras.packageId ?? 0));
  const selectedPackage = getCloudCoinPackage(packageId);
  if (!selectedPackage) {
    return 0;
  }

  const couponId = readString(extras.couponId);
  if (!couponId) {
    return readNumber(selectedPackage.amount);
  }

  const { data: coupon, error } = await supabaseAdmin
    .from("user_coupons")
    .select("*")
    .eq("id", couponId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !coupon) {
    console.error("[QuickSDK callback coupon lookup failed]", {
      couponId,
      userId,
      error: error?.message,
    });
    return 0;
  }

  const couponRecord = coupon as UserCouponRecord;
  const sessionToken = readString(extras.couponSessionToken);
  if (sessionToken) {
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("coupon_checkout_sessions")
      .select("id,session_token,user_id,coupon_id,status,cp_order_no,expires_at")
      .eq("session_token", sessionToken)
      .eq("user_id", userId)
      .eq("coupon_id", couponId)
      .maybeSingle();

    if (sessionError || !session) {
      console.error("[QuickSDK callback coupon session lookup failed]", {
        couponId,
        userId,
        sessionToken,
        error: sessionError?.message,
      });
      return 0;
    }

    const source = session as Record<string, unknown>;
    if (readString(source.status) !== "consumed") {
      return 0;
    }

    const expiresAt = new Date(readString(source.expires_at)).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      await expireCouponCheckoutSessions(supabaseAdmin);
      return 0;
    }
  }

  if (getCouponStatus(couponRecord) !== "used" || couponRecord.used_order_no !== cpOrderNo) {
    console.error("[QuickSDK callback coupon order mismatch]", {
      couponId,
      userId,
      cpOrderNo,
      couponOrderNo: couponRecord.used_order_no,
      status: getCouponStatus(couponRecord),
    });
    return 0;
  }

  return isPackageApplicable(couponRecord, selectedPackage)
    ? applyCouponDiscount(readNumber(selectedPackage.amount), couponRecord)
    : 0;
}

async function verifyCallbackOrder({
  extras,
  userId,
  cpOrderNo,
  paidAmount,
  payload,
}: {
  extras: ReturnType<typeof parseExtras>;
  userId: string;
  cpOrderNo: string;
  paidAmount: number;
  payload: Record<string, unknown> | null;
}) {
  const couponId = readString(extras?.couponId);

  if (couponId) {
    return {
      expectedAmount: await resolveExpectedPaidAmount(extras, userId, cpOrderNo),
      paymentOrderId: "",
      alreadyPaid: false,
    };
  }

  const { data: order, error } = await supabaseAdmin
    .from("payment_orders")
    .select("*")
    .eq("cp_order_no", cpOrderNo)
    .maybeSingle();

  if (error || !order) {
    console.error("[QuickSDK callback payment order lookup failed]", {
      cpOrderNo,
      userId,
      error: error?.message,
    });
    return {
      expectedAmount: 0,
      paymentOrderId: "",
      alreadyPaid: false,
    };
  }

  const source = order as Record<string, unknown>;
  const paymentOrderId = readString(source.id);
  const orderUserId = readString(source.user_id);
  const orderStatus = readString(source.status);
  const orderPackageId = Math.floor(readNumber(source.package_id));
  const orderCoins = Math.floor(readNumber(source.coins));
  const expectedAmount = readNumber(source.expected_amount);
  const expiresAt = new Date(readString(source.expires_at)).getTime();
  const extrasPackageId = Math.floor(Number(extras?.packageId ?? 0));
  const extrasCoins = Math.floor(Number(extras?.coins ?? 0));

  if (orderStatus === "paid") {
    return {
      expectedAmount,
      paymentOrderId,
      alreadyPaid: true,
    };
  }

  if (
    orderStatus !== "pending" ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= Date.now() ||
    orderUserId !== userId ||
    orderPackageId !== extrasPackageId ||
    orderCoins !== extrasCoins
  ) {
    console.error("[QuickSDK callback payment order mismatch]", {
      cpOrderNo,
      orderUserId,
      userId,
      orderStatus,
      orderPackageId,
      extrasPackageId,
      orderCoins,
      extrasCoins,
      paidAmount,
      expectedAmount,
      payload,
    });
    return {
      expectedAmount: 0,
      paymentOrderId: "",
      alreadyPaid: false,
    };
  }

  return {
    expectedAmount,
    paymentOrderId,
    alreadyPaid: false,
  };
}

function isSameMoney(actual: number, expected: number) {
  return Math.abs(roundMoney(actual) - roundMoney(expected)) <= 0.01;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function isSuccessStatus(value: string) {
  const normalized = value.toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "success" || normalized === "paid";
}

function containsPlatformCoin(value: string) {
  return value.includes("平台币");
}

function readLatestPointTransaction(metadata: Record<string, unknown> | undefined) {
  const transactions = Array.isArray(metadata?.mir_point_transactions)
    ? metadata.mir_point_transactions
    : [];
  const latest = transactions[0];

  if (!latest || typeof latest !== "object") {
    return null;
  }

  const source = latest as Record<string, unknown>;
  return {
    id: readString(source.id),
    title: readString(source.title) || "MIR 积分",
    description: readString(source.description) || readString(source.source) || "-",
    points: readNumber(source.points ?? source.amount ?? source.value),
    createdAt: readString(source.createdAt) || new Date().toISOString(),
    source: readString(source.source) || readString(source.type) || "point",
  };
}
