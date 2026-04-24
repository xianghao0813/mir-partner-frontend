import { NextResponse } from "next/server";
import { createQuickSdkOauthUrl, resolvePublicOrigin } from "@/lib/quicksdk";

export async function GET(request: Request) {
  try {
    const publicBaseUrl = resolvePublicOrigin(request.url, request.headers);
    const successUrl = `${publicBaseUrl}/auth/sdk/callback`;
    const cancelUrl = `${publicBaseUrl}/login?cancelled=1`;
    const loginUrl = await createQuickSdkOauthUrl({
      successUrl,
      cancelUrl,
    });

    return NextResponse.redirect(loginUrl);
  } catch (error) {
    const errorUrl = new URL("/login", resolvePublicOrigin(request.url, request.headers));
    errorUrl.searchParams.set(
      "error",
      error instanceof Error ? error.message : "网页登录未配置。"
    );
    return NextResponse.redirect(errorUrl);
  }
}
