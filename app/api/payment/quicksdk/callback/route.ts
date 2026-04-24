import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { appendWalletTransaction, readCloudCoins, readWalletTransactions } from "@/lib/wallet";

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  let payload: Record<string, unknown> | null = null;

  if (contentType.includes("application/json")) {
    payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  } else if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await request.formData().catch(() => null);
    payload = formData ? Object.fromEntries(formData.entries()) : null;
  } else {
    const text = await request.text().catch(() => "");
    payload = text ? { raw: text } : null;
  }

  console.log("[QuickSDK callback]", payload);

  const cpOrderNo = readString(payload?.cpOrderNo) || readString(payload?.orderNo) || readString(payload?.cp_order_no);
  const extrasParams = readString(payload?.extrasParams) || readString(payload?.extras_params);
  const orderStatus = readString(payload?.status) || readString(payload?.orderStatus) || readString(payload?.payStatus);
  const paidAmount = readNumber(payload?.amount) || readNumber(payload?.money) || readNumber(payload?.realAmount);

  const extras = parseExtras(extrasParams);
  const userId = extras?.userId ?? "";
  const coins = Number(extras?.coins ?? 0);
  const payMethod: "wechat" | "alipay" = extras?.payMethod === "alipay" ? "alipay" : "wechat";

  if (!userId || !cpOrderNo || !isSuccessStatus(orderStatus)) {
    return NextResponse.json({
      success: true,
      message: "ignored",
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
  const existingTransactions = readWalletTransactions(user.user_metadata);

  if (existingTransactions.some((item) => item.id === cpOrderNo)) {
    return NextResponse.json({
      success: true,
      message: "duplicate",
    });
  }

  const nextCoins = readCloudCoins(user.user_metadata) + Math.max(0, coins);
  const transaction = {
    id: cpOrderNo,
    type: "recharge" as const,
    amount: paidAmount || coins,
    coins: Math.max(0, coins),
    desc: "云币充值",
    date: new Date().toISOString().slice(0, 10),
    payMethod,
    status: "success" as const,
  };

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...user.user_metadata,
      cloud_coins: nextCoins,
      wallet_last_order_no: cpOrderNo,
      wallet_transactions: appendWalletTransaction(user.user_metadata, transaction),
    },
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

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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
      coins?: number;
      payMethod?: "wechat" | "alipay";
    };
  } catch {
    return null;
  }
}

function isSuccessStatus(value: string) {
  const normalized = value.toLowerCase();
  return normalized === "" || normalized === "1" || normalized === "true" || normalized === "success" || normalized === "paid";
}
