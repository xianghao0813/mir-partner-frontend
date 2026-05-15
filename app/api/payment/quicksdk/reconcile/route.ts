import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCloudCoinPackage } from "@/lib/cloudCoinPackages";
import {
  changeQuickSdkPlatformCoins,
  getQuickSdkUserOrders,
  getQuickSdkWalletAmount,
} from "@/lib/quicksdk";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { cpOrderNo?: string; token?: string } | null;
  const cpOrderNo = typeof body?.cpOrderNo === "string" ? body.cpOrderNo.trim() : "";
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!cpOrderNo) {
    return NextResponse.json({ message: "缺少订单号。" }, { status: 400 });
  }

  const { data: paymentOrder, error: orderError } = await supabaseAdmin
    .from("payment_orders")
    .select("id,user_id,package_id,coins,expected_amount,pay_method,status")
    .eq("cp_order_no", cpOrderNo)
    .maybeSingle();

  if (orderError || !paymentOrder) {
    return NextResponse.json({ message: orderError?.message ?? "订单不存在。" }, { status: 404 });
  }

  const source = paymentOrder as Record<string, unknown>;
  const orderUserId = readString(source.user_id);
  const packageId = readNumber(source.package_id);
  const packageItem = getCloudCoinPackage(packageId);
  const expectedAmount = readNumber(source.expected_amount);
  const expectedCoins = readNumber(source.coins) || packageItem?.coins || 0;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tokenValid = verifyReconcileToken({
    token,
    cpOrderNo,
    userId: orderUserId,
    amount: expectedAmount,
    coins: expectedCoins,
  });

  if (user && user.id !== orderUserId) {
    return NextResponse.json({ message: "订单不属于当前账号。" }, { status: 403 });
  }

  if (!user && !tokenValid) {
    return NextResponse.json({ message: "订单验证失败。" }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(orderUserId);
  if (userError || !userData.user) {
    return NextResponse.json({ message: userError?.message ?? "账号不存在。" }, { status: 404 });
  }

  const sdkUid = readString(userData.user.user_metadata?.quicksdk_uid);
  if (!sdkUid) {
    return NextResponse.json({ message: "当前账号缺少 QuickSDK UID。" }, { status: 400 });
  }

  const paidOrder = (await getQuickSdkUserOrders({ userId: sdkUid, payStatus: "1" }))
    .find((item) => (item.productOrderNo || item.orderNo) === cpOrderNo);

  if (!paidOrder) {
    return NextResponse.json({ ok: false, status: "waiting_payment" }, { status: 202 });
  }

  const paidAmount = paidOrder.dealAmount || paidOrder.amount;
  if (
    paidOrder.payStatus !== 1 ||
    expectedAmount <= 0 ||
    expectedCoins <= 0 ||
    Math.abs(paidAmount - expectedAmount) > 0.01
  ) {
    return NextResponse.json({ message: "订单金额或状态不匹配。" }, { status: 409 });
  }

  const transactionKey = `sdk-order-${cpOrderNo}`;
  const { data: existingTransaction } = await supabaseAdmin
    .from("wallet_transactions")
    .select("id,status")
    .eq("transaction_key", transactionKey)
    .eq("user_id", orderUserId)
    .maybeSingle();

  if (existingTransaction?.status === "success") {
    return NextResponse.json({ ok: true, status: "already_paid" });
  }

  const nowIso = new Date().toISOString();
  const claimResult = existingTransaction
    ? await supabaseAdmin
        .from("wallet_transactions")
        .update({
          type: "recharge",
          amount: paidAmount,
          coins: expectedCoins,
          description: "官网云币充值",
          pay_method: readString(source.pay_method) || null,
          status: "processing",
        })
        .eq("transaction_key", transactionKey)
        .eq("user_id", orderUserId)
        .select("id")
        .maybeSingle()
    : await supabaseAdmin
        .from("wallet_transactions")
        .insert({
          user_id: orderUserId,
          transaction_key: transactionKey,
          type: "recharge",
          amount: paidAmount,
          coins: expectedCoins,
          description: "官网云币充值",
          pay_method: readString(source.pay_method) || null,
          status: "processing",
          occurred_at: new Date((paidOrder.payTime ?? paidOrder.createTime ?? Date.now() / 1000) * 1000).toISOString(),
        })
        .select("id")
        .maybeSingle();

  if (claimResult.error) {
    return NextResponse.json({ message: claimResult.error.message }, { status: 500 });
  }

  if (!claimResult.data) {
    return NextResponse.json({ ok: true, status: "already_processing" });
  }

  await supabaseAdmin
    .from("payment_orders")
    .update({ status: "failed", updated_at: nowIso })
    .eq("cp_order_no", cpOrderNo)
    .eq("user_id", orderUserId)
    .neq("status", "paid");

  try {
    const nextSdkAmount = await changeQuickSdkPlatformCoins({
      userId: sdkUid,
      amount: String(expectedCoins),
      remark: `MIR Partner reconcile ${cpOrderNo}`,
    });
    const nextCoins = Math.max(0, Math.floor(nextSdkAmount || await getQuickSdkWalletAmount({ userId: sdkUid })));

    await supabaseAdmin
      .from("wallet_transactions")
      .update({ status: "success" })
      .eq("transaction_key", transactionKey)
      .eq("user_id", orderUserId);

    await supabaseAdmin
      .from("payment_orders")
      .update({
        status: "paid",
        paid_amount: paidAmount,
        paid_at: nowIso,
        updated_at: nowIso,
        raw_callback: { reconciledByPaymentResult: true, cpOrderNo, coins: expectedCoins },
      })
      .eq("cp_order_no", cpOrderNo)
      .eq("user_id", orderUserId);

    await supabaseAdmin.auth.admin.updateUserById(orderUserId, {
      user_metadata: {
        ...userData.user.user_metadata,
        cloud_coins: nextCoins,
        wallet_last_order_no: cpOrderNo,
      },
    });

    return NextResponse.json({ ok: true, status: "paid", cloudCoins: nextCoins });
  } catch (error) {
    await supabaseAdmin
      .from("wallet_transactions")
      .update({ status: "failed" })
      .eq("transaction_key", transactionKey)
      .eq("user_id", orderUserId);

    await supabaseAdmin
      .from("payment_orders")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("cp_order_no", cpOrderNo)
      .eq("user_id", orderUserId);

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "云币到账失败。" },
      { status: 500 }
    );
  }
}

function verifyReconcileToken({
  token,
  cpOrderNo,
  userId,
  amount,
  coins,
}: {
  token: string;
  cpOrderNo: string;
  userId: string;
  amount: number;
  coins: number;
}) {
  if (!token || !cpOrderNo || !userId || amount <= 0 || coins <= 0) {
    return false;
  }

  const secret = process.env.QUICKSDK_LOCAL_AUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${cpOrderNo}:${userId}:${amount.toFixed(2)}:${coins}`, "utf8")
    .digest("hex");
  return safeEqualHex(token, expected);
}

function safeEqualHex(left: string, right: string) {
  if (!/^[a-f0-9]+$/i.test(left) || !/^[a-f0-9]+$/i.test(right) || left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

function readString(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}
