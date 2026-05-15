import { NextResponse } from "next/server";
import { resetQuickSdkPassword } from "@/lib/quicksdk";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      phone?: string;
      code?: string;
      newPassword?: string;
    };

    const phone = body.phone?.trim() ?? "";
    const code = body.code?.trim() ?? "";
    const newPassword = body.newPassword?.trim() ?? "";

    if (!phone || !code || !newPassword) {
      return NextResponse.json({ error: "请输入手机号、验证码和新密码。" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "新密码至少需要 8 位。" }, { status: 400 });
    }

    const data = await resetQuickSdkPassword({
      phone,
      code,
      newPassword,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "找回密码失败。",
      },
      { status: 500 }
    );
  }
}
