import { NextResponse } from "next/server";
import { loginQuickSdkAccount } from "@/lib/quicksdk";
import { signInQuickSdkUser, verifyAndSignInQuickSdkUser } from "@/lib/quicksdkAuth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };

    const username = body.username?.trim() ?? "";
    const password = body.password?.trim() ?? "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "请输入账号和密码。" },
        { status: 400 }
      );
    }

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
        mobile: result.mobile,
        bindingSource: "sdk_login",
      });
    } else {
      await signInQuickSdkUser({
        uid: result.uid,
        username: result.username,
        timeLeft: result.timeLeft ?? null,
        mobile: result.mobile,
        bindingSource: "sdk_login",
      });
    }

    return NextResponse.json({
      success: true,
      profileUrl: "/profile",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "登录失败。",
      },
      { status: 500 }
    );
  }
}
