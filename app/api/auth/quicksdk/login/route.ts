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

    let result;
    try {
      result = await loginQuickSdkAccount({
        username,
        password,
      });
    } catch (error) {
      console.error("[QuickSDK login: sdk-auth]", { username, error });
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "账号或密码验证失败。",
          stage: "sdk-auth",
        },
        { status: 401 }
      );
    }

    try {
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
    } catch (error) {
      console.error("[QuickSDK login: local-session]", {
        username,
        uid: result.uid,
        error,
      });
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "登录状态创建失败。",
          stage: "local-session",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profileUrl: "/profile",
    });
  } catch (error) {
    console.error("[QuickSDK login]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "登录失败。",
      },
      { status: 500 }
    );
  }
}
