import { NextResponse } from "next/server";
import { maskPhone, readAccountSecurity } from "@/lib/accountSecurity";
import { compactAuthMetadata } from "@/lib/authMetadata";
import { setQuickSdkWalletPassword } from "@/lib/quicksdk";
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

  const security = readAccountSecurity(user.user_metadata);
  const phone = resolveWalletPasswordPhone(user.user_metadata);

  return NextResponse.json({
    paymentPasswordSet: readBoolean(user.user_metadata?.wallet_payment_password_set),
    maskedPhone: security.maskedPhone || maskPhone(phone),
    phoneBound: Boolean(phone) || security.phoneBound,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { code?: string; paypass?: string; confirmPaypass?: string }
    | null;
  const code = body?.code?.trim() ?? "";
  const paypass = body?.paypass?.trim() ?? "";
  const confirmPaypass = body?.confirmPaypass?.trim() ?? "";
  const uid = readString(user.user_metadata?.quicksdk_uid);
  const phone = resolveWalletPasswordPhone(user.user_metadata);

  if (!uid) {
    return NextResponse.json({ message: "当前账号未绑定 SDK UID。" }, { status: 400 });
  }

  if (!phone) {
    return NextResponse.json({ message: "请先绑定手机号后再设置支付密码。" }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ message: "请输入短信验证码。" }, { status: 400 });
  }

  if (!/^\d{6}$/.test(paypass)) {
    return NextResponse.json({ message: "支付密码必须是 6 位数字。" }, { status: 400 });
  }

  if (paypass !== confirmPaypass) {
    return NextResponse.json({ message: "两次输入的支付密码不一致。" }, { status: 400 });
  }

  try {
    const success = await setQuickSdkWalletPassword({
      userId: uid,
      phone,
      code,
      paypass,
    });

    if (!success) {
      return NextResponse.json({ message: "支付密码设置失败，请稍后再试。" }, { status: 502 });
    }

    const metadata = compactAuthMetadata({
      ...(user.user_metadata ?? {}),
      wallet_payment_password_set: true,
      wallet_payment_password_set_at: new Date().toISOString(),
    });

    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: metadata,
    });

    if (error) {
      console.error("[wallet payment password metadata]", error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[QuickSDK wallet payment password]", {
      uid,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { message: getWalletPasswordErrorMessage(error) },
      { status: 502 }
    );
  }
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function resolveWalletPasswordPhone(metadata: Record<string, unknown> | undefined) {
  const security = readAccountSecurity(metadata);
  const account = readString(metadata?.quicksdk_username) || readString(metadata?.username);
  const accountDigits = account.replace(/\D/g, "");

  if (security.phone) {
    return security.phone;
  }

  return /^1\d{10}$/.test(accountDigits) ? accountDigits : "";
}

function readBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
  }

  return false;
}

function getWalletPasswordErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const normalized = message.toLowerCase();

  if (normalized.includes("code") || normalized.includes("验证码")) {
    return "验证码不正确或已过期，请重新获取后再试。";
  }

  if (normalized.includes("phone") || normalized.includes("mobile") || normalized.includes("手机")) {
    return "手机号验证失败，请确认账号已绑定手机号。";
  }

  if (normalized.includes("timeout") || normalized.includes("fetch") || normalized.includes("network")) {
    return "暂时无法连接支付密码服务，请稍后再试。";
  }

  return message && message !== "QuickSDK request failed"
    ? message
    : "支付密码设置失败，请稍后再试或联系客服。";
}
