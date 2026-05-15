import { NextRequest, NextResponse } from "next/server";
import { compactAuthMetadata } from "@/lib/authMetadata";
import { getCloudCoinPackage } from "@/lib/cloudCoinPackages";
import { applyCouponDiscount, expireCouponCheckoutSessions, getCouponStatus, isPackageApplicable, type UserCouponRecord } from "@/lib/coupons";
import { changeQuickSdkPlatformCoins, normalizeQuickSdkCallbackPayload } from "@/lib/quicksdk";
import { awardMirPoints } from "@/lib/mirPoints";
import { recordRiskEvent } from "@/lib/riskControl";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { insertPointTransaction } from "@/lib/userLedgers";
import { appendWalletTransaction, readCloudCoins, readWalletTransactions } from "@/lib/wallet";

export async function POST(request: NextRequest) {
  const rawPayload = await readCallbackPayload(request);
  const normalized = normalizeQuickSdkCallbackPayload(rawPayload);
  const payload = normalized.payload as Record<string, unknown> | null;
  console.info("[QuickSDK callback]", {
    encrypted: normalized.encrypted,
    signValid: normalized.signValid,
    cpOrderNo:
      readString(payload?.cpOrderNo) ||
      readString(payload?.orderNo) ||
      readString(payload?.cp_order_no) ||
      "",
    status: readString(payload?.status) || readString(payload?.orderStatus) || readString(payload?.payStatus),
    amount: readNumber(payload?.amount) || readNumber(payload?.money) || readNumber(payload?.realAmount),
  });

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

  const parsedExtras = parseExtras(extrasParams);
  const context = await resolveCallbackContext(parsedExtras, cpOrderNo);
  const extras = context.extras;
  if (!extras?.couponId) {
    await expireCouponCheckoutSessions(supabaseAdmin);
  }
  const userId = context.userId;
  const coins = context.coins;
  const payMethod: "wechat" | "alipay" = extras?.payMethod === "alipay" ? "alipay" : "wechat";

  if (!userId || !cpOrderNo || !isSuccessStatus(orderStatus) || coins <= 0) {
    console.error("[QuickSDK callback ignored]", {
      cpOrderNo,
      orderStatus,
      paidAmount,
      userId,
      coins,
      extras,
      payload,
    });
    return new NextResponse("SUCCESS");
  }

  if (!normalized.signValid) {
    console.error("[QuickSDK callback invalid sign]", {
      cpOrderNo,
      rawPayload,
      payload,
    });
    await recordRiskEvent({
      userId,
      eventType: "invalid_payment_callback_signature",
      severity: "critical",
      score: 100,
      source: "quicksdk_callback",
      request,
      autoFreeze: true,
      details: { cpOrderNo, payload },
    });
    return new NextResponse("SUCCESS");
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
    await recordRiskEvent({
      userId,
      eventType: "payment_amount_mismatch",
      severity: "critical",
      score: 100,
      source: "quicksdk_callback",
      request,
      autoFreeze: true,
      details: {
        cpOrderNo,
        paidAmount,
        expectedAmount,
        extras,
        payload,
      },
    });

    return new NextResponse("SUCCESS");
  }

  if (orderVerification.alreadyPaid) {
    return new NextResponse("SUCCESS");
  }

  if (extras?.couponId) {
    const { data: usedCoupon, error: couponUseError } = await supabaseAdmin
      .from("user_coupons")
      .update({
        used_at: new Date().toISOString(),
        used_order_no: cpOrderNo,
      })
      .eq("id", extras.couponId)
      .eq("user_id", userId)
      .or(`used_at.is.null,used_order_no.eq.${cpOrderNo}`)
      .select("id")
      .maybeSingle();

    if (couponUseError || !usedCoupon) {
      console.error("[QuickSDK callback coupon claim failed]", {
        couponId: extras.couponId,
        userId,
        cpOrderNo,
        error: couponUseError?.message,
      });
      return new NextResponse("SUCCESS");
    }
  }

  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data.user) {
    return new NextResponse("SUCCESS");
  }

  const user = data.user;
  const transactionId = `sdk-order-${cpOrderNo}`;
  const { data: existingDbTransaction, error: existingDbTransactionError } = await supabaseAdmin
    .from("wallet_transactions")
    .select("id,status")
    .eq("transaction_key", transactionId)
    .maybeSingle();

  if (existingDbTransactionError) {
    console.error("[QuickSDK callback wallet transaction lookup failed]", {
      cpOrderNo,
      error: existingDbTransactionError.message,
    });
    return new NextResponse("SUCCESS");
  }

  if (existingDbTransaction?.status === "processing") {
    return new NextResponse("SUCCESS");
  }

  if (existingDbTransaction?.status === "success") {
    return new NextResponse("SUCCESS");
  }

  const sdkUid = readString(user.user_metadata?.quicksdk_uid);
  if (!sdkUid) {
    return NextResponse.json({
      success: false,
      message: "missing_quicksdk_uid",
    });
  }

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

  const claimResult = existingDbTransaction
    ? await supabaseAdmin
        .from("wallet_transactions")
        .update({
          amount: transaction.amount,
          coins: transaction.coins,
          description: transaction.desc,
          pay_method: transaction.payMethod || null,
          status: "processing",
        })
        .eq("transaction_key", transaction.id)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle()
    : await supabaseAdmin
        .from("wallet_transactions")
        .insert({
          user_id: userId,
          transaction_key: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
          coins: transaction.coins,
          description: transaction.desc,
          pay_method: transaction.payMethod || null,
          status: "processing",
          occurred_at: new Date().toISOString(),
        })
        .select("id")
        .maybeSingle();
  const claimedTransaction = claimResult.data;
  const claimTransactionError = claimResult.error;

  if (claimTransactionError || !claimedTransaction) {
    if (claimTransactionError?.code !== "23505") {
      console.error("[QuickSDK callback wallet transaction claim failed]", {
        cpOrderNo,
        error: claimTransactionError?.message,
      });
    }
    return new NextResponse("SUCCESS");
  }

  let nextSdkAmount = 0;
  try {
    nextSdkAmount = await changeQuickSdkPlatformCoins({
      userId: sdkUid,
      amount: String(coins),
      remark: `MIR Partner recharge ${cpOrderNo}`,
    });
  } catch (sdkError) {
    await supabaseAdmin
      .from("wallet_transactions")
      .update({ status: "failed" })
      .eq("transaction_key", transaction.id)
      .eq("user_id", userId);
    console.error("[QuickSDK callback coin issue failed]", {
      cpOrderNo,
      error: sdkError instanceof Error ? sdkError.message : "unknown",
    });
    return new NextResponse("SUCCESS");
  }

  const fallbackAmount = readCloudCoins(user.user_metadata) + coins;
  const nextCoins = Math.max(0, Math.floor(nextSdkAmount || fallbackAmount));
  await supabaseAdmin
    .from("wallet_transactions")
    .update({ status: "success" })
    .eq("transaction_key", transaction.id)
    .eq("user_id", userId);

  await markPaymentOrderPaid({
    paymentOrderId: orderVerification.paymentOrderId,
    cpOrderNo,
    userId,
    packageId: Math.floor(Number(extras?.packageId ?? 0)),
    coins,
    paidAmount,
    payMethod,
    payload,
  });

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

  return new NextResponse("SUCCESS");
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

async function resolveCallbackContext(extras: ReturnType<typeof parseExtras>, cpOrderNo: string) {
  const packageId = Math.floor(Number(extras?.packageId ?? 0));
  const packageItem = packageId > 0 ? getCloudCoinPackage(packageId) : null;

  if (extras?.userId && Number(extras.coins ?? 0) > 0) {
    return {
      userId: extras.userId,
      coins: Math.max(0, Math.floor(Number(extras.coins))),
      extras,
    };
  }

  if (!cpOrderNo) {
    return {
      userId: extras?.userId ?? "",
      coins: Math.max(0, Math.floor(Number(extras?.coins ?? packageItem?.coins ?? 0))),
      extras,
    };
  }

  const { data: paymentOrder } = await supabaseAdmin
    .from("payment_orders")
    .select("user_id,package_id,coins,pay_method")
    .eq("cp_order_no", cpOrderNo)
    .maybeSingle();

  if (paymentOrder) {
    const source = paymentOrder as Record<string, unknown>;
    const orderPackageId = Math.floor(readNumber(source.package_id));
    const orderPackage = getCloudCoinPackage(orderPackageId);
    const resolvedExtras = {
      ...(extras ?? {}),
      userId: readString(source.user_id),
      packageId: orderPackageId,
      coins: Math.floor(readNumber(source.coins) || orderPackage?.coins || 0),
      payMethod: readString(source.pay_method) === "alipay" ? "alipay" as const : "wechat" as const,
    };

    return {
      userId: resolvedExtras.userId ?? "",
      coins: Math.max(0, Math.floor(Number(resolvedExtras.coins ?? 0))),
      extras: resolvedExtras,
    };
  }

  const { data: couponSession } = await supabaseAdmin
    .from("coupon_checkout_sessions")
    .select("session_token,user_id,coupon_id,package_id")
    .eq("cp_order_no", cpOrderNo)
    .maybeSingle();

  if (couponSession) {
    const source = couponSession as Record<string, unknown>;
    const sessionPackageId = Math.floor(readNumber(source.package_id));
    const sessionPackage = getCloudCoinPackage(sessionPackageId);
    const resolvedExtras = {
      ...(extras ?? {}),
      userId: readString(source.user_id),
      packageId: sessionPackageId,
      coins: sessionPackage?.coins ?? 0,
      couponId: readString(source.coupon_id),
      couponSessionToken: readString(source.session_token),
      payMethod: extras?.payMethod ?? "wechat" as const,
    };

    return {
      userId: resolvedExtras.userId ?? "",
      coins: Math.max(0, Math.floor(Number(resolvedExtras.coins ?? 0))),
      extras: resolvedExtras,
    };
  }

  return {
    userId: extras?.userId ?? "",
    coins: Math.max(0, Math.floor(Number(extras?.coins ?? packageItem?.coins ?? 0))),
    extras,
  };
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
  let sessionCpOrderNo = "";
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
    sessionCpOrderNo = readString(source.cp_order_no);
    const sessionStatus = readString(source.status);
    if (sessionStatus !== "consumed" || sessionCpOrderNo !== cpOrderNo) {
      return 0;
    }
  }

  const couponOrderMatches =
    couponRecord.used_order_no === cpOrderNo ||
    (!!sessionCpOrderNo && couponRecord.used_order_no === sessionCpOrderNo);
  const couponStatus = getCouponStatus(couponRecord);

  if (couponStatus !== "unused" && (couponStatus !== "used" || !couponOrderMatches)) {
    console.error("[QuickSDK callback coupon order mismatch]", {
      couponId,
      userId,
      cpOrderNo,
      sessionCpOrderNo,
      couponOrderNo: couponRecord.used_order_no,
      status: couponStatus,
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
    const packageId = Math.floor(Number(extras?.packageId ?? 0));
    const selectedPackage = getCloudCoinPackage(packageId);
    const extrasUserId = readString(extras?.userId);
    const extrasCoins = Math.floor(Number(extras?.coins ?? 0));
    if (selectedPackage && extrasUserId === userId && extrasCoins === selectedPackage.coins) {
      console.warn("[QuickSDK callback payment order fallback]", {
        cpOrderNo,
        userId,
        packageId,
        coins: extrasCoins,
        expectedAmount: selectedPackage.amount,
      });
      return {
        expectedAmount: readNumber(selectedPackage.amount),
        paymentOrderId: "",
        alreadyPaid: false,
      };
    }

    console.error("[QuickSDK callback payment order lookup failed]", {
      cpOrderNo,
      userId,
      error: error?.message,
      extras,
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

  if (
    (orderStatus !== "pending" && orderStatus !== "cancelled" && orderStatus !== "paid") ||
    !Number.isFinite(expiresAt) ||
    orderUserId !== userId ||
    orderPackageId !== extrasPackageId ||
    orderCoins !== extrasCoins
  ) {
    console.error("[QuickSDK callback payment order mismatch]", {
      cpOrderNo,
      orderUserId,
      userId,
      orderStatus,
      expired: expiresAt <= Date.now(),
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

async function markPaymentOrderPaid({
  paymentOrderId,
  cpOrderNo,
  userId,
  packageId,
  coins,
  paidAmount,
  payMethod,
  payload,
}: {
  paymentOrderId: string;
  cpOrderNo: string;
  userId: string;
  packageId: number;
  coins: number;
  paidAmount: number;
  payMethod: "wechat" | "alipay";
  payload: Record<string, unknown> | null;
}) {
  const nowIso = new Date().toISOString();
  const paidOrder = {
    status: "paid",
    paid_amount: paidAmount,
    paid_at: nowIso,
    raw_callback: payload ?? {},
    updated_at: nowIso,
  };

  if (paymentOrderId) {
    const { error } = await supabaseAdmin
      .from("payment_orders")
      .update(paidOrder)
      .eq("id", paymentOrderId);

    if (error) {
      console.error("[QuickSDK callback payment order update failed]", {
        cpOrderNo,
        paymentOrderId,
        error: error.message,
      });
    }
    return;
  }

  const normalizedPackageId = Math.max(0, Math.floor(packageId));
  const normalizedCoins = Math.max(0, Math.floor(coins));
  if (!normalizedPackageId || !normalizedCoins || paidAmount <= 0) {
    return;
  }

  const { error } = await supabaseAdmin
    .from("payment_orders")
    .upsert(
      {
        cp_order_no: cpOrderNo,
        user_id: userId,
        package_id: normalizedPackageId,
        coins: normalizedCoins,
        expected_amount: paidAmount,
        pay_method: payMethod,
        expires_at: nowIso,
        ...paidOrder,
      },
      { onConflict: "cp_order_no" }
    );

  if (error) {
    console.error("[QuickSDK callback payment order upsert failed]", {
      cpOrderNo,
      error: error.message,
    });
  }
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
