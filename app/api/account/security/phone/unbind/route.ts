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
    await unbindQuickSdkPhone({ userId: uid, phone, code });

    const metadata = compactAuthMetadata({
      ...(user.user_metadata ?? {}),
      mobile: "",
      bound_phone: "",
      phone_bound: false,
      mobile_bound: false,
      mobile_unbound_at: new Date().toISOString(),
    });

    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: metadata,
    });

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "手机号解绑失败。" },
      { status: 502 }
    );
  }
}
