import { NextResponse } from "next/server";
import { sendQuickSdkPhoneCode } from "@/lib/quicksdk";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { phone?: string; purpose?: "bind" | "unbind" } | null;
  const purpose = body?.purpose === "unbind" ? "unbind" : "bind";
  const phone = body?.phone?.trim() || String(user.user_metadata?.mobile ?? "").trim();
  const uid = String(user.user_metadata?.quicksdk_uid ?? "").trim();

  if (!uid) {
    return NextResponse.json({ message: "当前账号未绑定 SDK UID。" }, { status: 400 });
  }

  if (!phone) {
    return NextResponse.json({ message: "请输入手机号。" }, { status: 400 });
  }

  try {
    await sendQuickSdkPhoneCode({ phone, uid, purpose });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "验证码发送失败。" },
      { status: 502 }
    );
  }
}
