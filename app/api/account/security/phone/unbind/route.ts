import { NextResponse } from "next/server";
import { compactAuthMetadata } from "@/lib/authMetadata";
import { unbindQuickSdkPhone } from "@/lib/quicksdk";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { code?: string } | null;
  const code = body?.code?.trim() ?? "";
  const uid = String(user.user_metadata?.quicksdk_uid ?? "").trim();
  const phone = String(user.user_metadata?.mobile ?? user.user_metadata?.bound_phone ?? "").trim();

  if (!uid) {
    return NextResponse.json({ message: "当前账号未绑定 SDK UID。" }, { status: 400 });
  }

  if (!phone) {
    return NextResponse.json({ message: "当前账号未绑定手机号。" }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ message: "请输入验证码。" }, { status: 400 });
  }

  try {
    console.log("[QuickSDK phone unbind] request", {
      uid,
      phone: phone ? phone.replace(/(\d{3})\d{4}(\d+)/, "$1****$2") : "",
    });
    await unbindQuickSdkPhone({ uid, code });
    console.log("[QuickSDK phone unbind] success", { uid });

    return await markPhoneUnbound(user.id, user.user_metadata);
  } catch (error) {
    console.error("[QuickSDK phone unbind] failed", {
      uid,
      message: error instanceof Error ? error.message : String(error),
    });

    if (isAlreadyUnboundPhoneError(error)) {
      return await markPhoneUnbound(user.id, user.user_metadata, true);
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "手机号解绑失败。" },
      { status: 502 }
    );
  }
}

async function markPhoneUnbound(
  userId: string,
  metadata: Record<string, unknown> | undefined,
  alreadyUnbound = false
) {
  const nextMetadata = compactAuthMetadata({
    ...(metadata ?? {}),
    mobile: "",
    bound_phone: "",
    phone_bound: false,
    mobile_bound: false,
    mobile_unbound_at: new Date().toISOString(),
  });

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: nextMetadata,
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, alreadyUnbound });
}

function isAlreadyUnboundPhoneError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("40024");
}
