import { NextResponse } from "next/server";
import { sendQuickSdkPhoneCode } from "@/lib/quicksdk";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "\u8bf7\u5148\u767b\u5f55\u3002" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { phone?: string; purpose?: "bind" | "unbind" } | null;
  const purpose = body?.purpose === "unbind" ? "unbind" : "bind";
  const phone = body?.phone?.trim() || String(user.user_metadata?.mobile ?? "").trim();
  const uid = String(user.user_metadata?.quicksdk_uid ?? "").trim();
  const quickSdkUsername = String(user.user_metadata?.quicksdk_username ?? "").trim();
  const quickSdkPurpose = purpose === "bind" && isSamePhone(phone, quickSdkUsername) ? "login" : purpose;

  if (!uid) {
    return NextResponse.json({ message: "\u5f53\u524d\u8d26\u53f7\u672a\u7ed1\u5b9a SDK UID\u3002" }, { status: 400 });
  }

  if (!phone) {
    return NextResponse.json({ message: "\u8bf7\u8f93\u5165\u624b\u673a\u53f7\u3002" }, { status: 400 });
  }

  try {
    console.log("[QuickSDK phone send-code] request", {
      purpose,
      quickSdkPurpose,
      uid,
      phone: phone.replace(/(\d{3})\d{4}(\d+)/, "$1****$2"),
    });
    await sendQuickSdkPhoneCode({ phone, uid, purpose: quickSdkPurpose });
    console.log("[QuickSDK phone send-code] success", { purpose, uid });
    return NextResponse.json({ success: true, verificationType: quickSdkPurpose });
  } catch (error) {
    console.error("[QuickSDK phone send-code] failed", {
      purpose,
      uid,
      message: error instanceof Error ? error.message : String(error),
    });

    if (purpose === "bind" && quickSdkPurpose !== "login" && isAlreadyBoundPhoneError(error)) {
      await sendQuickSdkPhoneCode({ phone, uid, purpose: "login" });
      console.log("[QuickSDK phone send-code] fallback login success", { purpose, uid });
      return NextResponse.json({ success: true, verificationType: "login" });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "\u9a8c\u8bc1\u7801\u53d1\u9001\u5931\u8d25\u3002" },
      { status: 502 }
    );
  }
}

function isSamePhone(left: string, right: string) {
  return normalizePhone(left) !== "" && normalizePhone(left) === normalizePhone(right);
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function isAlreadyBoundPhoneError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  return (
    message.includes("\u5df2\u7ed1\u5b9a") ||
    message.includes("\u5df2\u7ecf\u7ed1\u5b9a") ||
    message.includes("\u5df2\u5b58\u5728") ||
    message.includes("\u5df2\u88ab\u4f7f\u7528") ||
    message.includes("\u5df2\u88ab\u7ed1\u5b9a") ||
    message.includes("\u624b\u673a\u53f7\u5df2") ||
    message.includes("\u624b\u673a\u5df2") ||
    normalized.includes("already") ||
    normalized.includes("exist") ||
    normalized.includes("used")
  );
}
