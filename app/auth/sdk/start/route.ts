import { NextResponse } from "next/server";
import { createQuickSdkOauthUrl, getQuickSdkPublicBaseUrl } from "@/lib/quicksdk";

export async function GET(request: Request) {
  try {
    const currentUrl = new URL(request.url);
    const publicBaseUrl = getQuickSdkPublicBaseUrl(currentUrl.origin);
    const successUrl = `${publicBaseUrl}/auth/sdk/callback`;
    const cancelUrl = `${publicBaseUrl}/login?cancelled=1`;
    const loginUrl = await createQuickSdkOauthUrl({
      successUrl,
      cancelUrl,
    });

    return NextResponse.redirect(loginUrl);
  } catch (error) {
    const currentUrl = new URL(request.url);
    currentUrl.pathname = "/login";
    currentUrl.searchParams.set(
      "error",
      error instanceof Error ? error.message : "QuickSDK login is not configured."
    );
    return NextResponse.redirect(currentUrl);
  }
}
