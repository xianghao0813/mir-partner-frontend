import { NextResponse } from "next/server";
import { loginQuickSdkAccount, registerQuickSdkAccount } from "@/lib/quicksdk";
import { signInQuickSdkUser, verifyAndSignInQuickSdkUser } from "@/lib/quicksdkAuth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
      phone?: string;
      code?: string;
    };

    const username = body.username?.trim() ?? "";
    const password = body.password?.trim() ?? "";
    const phone = body.phone?.trim() ?? "";
    const code = body.code?.trim() ?? "";

    if (!username || !password || !phone || !code) {
      return NextResponse.json(
        { error: "请输入账号、密码、手机号和验证码。" },
        { status: 400 }
      );
    }

    await registerQuickSdkAccount({
      username,
      password,
      phone,
      code,
    });

    const result = await loginQuickSdkAccount({
      username,
      password,
    });

    if (result.authToken) {
      await verifyAndSignInQuickSdkUser({
        uid: result.uid,
        username: result.username,
        authToken: result.authToken,
        timeLeft: result.timeLeft ?? null,
        mobile: result.mobile ?? phone,
        bindingSource: "web_signup",
      });
    } else {
      await signInQuickSdkUser({
        uid: result.uid,
        username: result.username,
        timeLeft: result.timeLeft ?? null,
        mobile: result.mobile ?? phone,
        bindingSource: "web_signup",
      });
    }

    return NextResponse.json({
      success: true,
      profileUrl: "/profile",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "注册失败。",
      },
      { status: 500 }
    );
  }
}
