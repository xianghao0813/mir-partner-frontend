import { NextResponse } from "next/server";
import { sendQuickSdkPhoneCode } from "@/lib/quicksdk";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      phone?: string;
      purpose?: "login" | "register" | "reset-password";
    };

    const phone = body.phone?.trim() ?? "";
    const purpose =
      body.purpose === "login" || body.purpose === "reset-password" ? body.purpose : "register";

    if (!phone) {
      return NextResponse.json({ error: "请输入手机号。" }, { status: 400 });
    }

    const data = await sendQuickSdkPhoneCode({
      phone,
      purpose,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "验证码发送失败。",
      },
      { status: 500 }
    );
  }
}
