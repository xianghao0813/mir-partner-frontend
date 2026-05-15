import { NextResponse } from "next/server";
import { resolvePublicOrigin } from "@/lib/quicksdk";
import { verifyAndSignInQuickSdkUser } from "@/lib/quicksdkAuth";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const publicOrigin = resolvePublicOrigin(request.url, request.headers);
  const uid = requestUrl.searchParams.get("uid")?.trim() ?? "";
  const username = requestUrl.searchParams.get("username")?.trim() ?? "";
  const authToken = requestUrl.searchParams.get("authToken")?.trim() ?? "";
  const timeLeft = requestUrl.searchParams.get("timeLeft")?.trim() ?? "";

  if (!uid || !authToken) {
    return redirectWithError(publicOrigin, "QuickSDK callback is missing uid or authToken.");
  }

  try {
    await verifyAndSignInQuickSdkUser({
      uid,
      username,
      authToken,
      timeLeft: timeLeft ? Number.parseInt(timeLeft, 10) : null,
    });

    return NextResponse.redirect(new URL("/profile", publicOrigin));
  } catch (error) {
    return redirectWithError(
      publicOrigin,
      error instanceof Error ? error.message : "QuickSDK login failed."
    );
  }
}

function redirectWithError(publicOrigin: string, message: string) {
  const errorUrl = new URL("/login", publicOrigin);
  errorUrl.searchParams.set("error", message);
  return NextResponse.redirect(errorUrl);
}
