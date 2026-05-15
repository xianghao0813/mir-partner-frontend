import { NextResponse } from "next/server";
import { maskPhone, readAccountSecurity } from "@/lib/accountSecurity";
import { sendQuickSdkPhoneCode } from "@/lib/quicksdk";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  const uid = readString(user.user_metadata?.quicksdk_uid);
  const security = readAccountSecurity(user.user_metadata);
  const phone = resolveWalletPasswordPhone(user.user_metadata);

  if (!uid) {
    return NextResponse.json({ message: "当前账号未绑定 SDK UID。" }, { status: 400 });
  }

  if (!phone) {
    return NextResponse.json({ message: "请先绑定手机号后再设置支付密码。" }, { status: 400 });
  }

  try {
    await sendQuickSdkPhoneCode({ phone, uid, purpose: "wallet-password" });
    return NextResponse.json({
      success: true,
      maskedPhone: security.maskedPhone || maskPhone(phone),
    });
  } catch (error) {
    console.error("[QuickSDK wallet password send-code]", {
      uid,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "验证码发送失败，请稍后再试。" },
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
