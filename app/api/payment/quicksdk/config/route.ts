import { NextResponse } from "next/server";

const DEFAULT_H5_SDK_URL = "http://custom-sdkapi.gamewemade.com/static/lib/libSDK.js";

export async function GET() {
  const productCode = process.env.QUICKSDK_PRODUCT_CODE?.trim() ?? "";

  if (!productCode) {
    return NextResponse.json(
      { message: "QUICKSDK_PRODUCT_CODE is required." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    productCode,
    sdkUrl: process.env.QUICKSDK_H5_SDK_URL?.trim() || DEFAULT_H5_SDK_URL,
  });
}
