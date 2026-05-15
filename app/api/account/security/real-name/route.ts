import { NextResponse } from "next/server";
import { compactAuthMetadata } from "@/lib/authMetadata";
import { verifyQuickSdkRealName } from "@/lib/quicksdk";
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

  const body = (await request.json().catch(() => null)) as { realName?: string; idCard?: string } | null;
  const realName = body?.realName?.trim() ?? "";
  const idCard = body?.idCard?.trim() ?? "";
  const uid = String(user.user_metadata?.quicksdk_uid ?? "").trim();

  if (!uid) {
    return NextResponse.json({ message: "当前账号未绑定 SDK UID。" }, { status: 400 });
  }

  if (!realName || !idCard) {
    return NextResponse.json({ message: "请输入真实姓名和证件号码。" }, { status: 400 });
  }

  try {
    const verified = await verifyQuickSdkRealName({ userId: uid, realName, idCard });
    if (!verified) {
      return NextResponse.json({ message: "实名认证未通过，请确认信息后重试。" }, { status: 400 });
    }

    const metadata = compactAuthMetadata({
      ...(user.user_metadata ?? {}),
      real_name_verified: true,
      real_name_verified_at: new Date().toISOString(),
      real_name_mask: maskRealName(realName),
      id_card_last4: idCard.slice(-4),
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
      { message: error instanceof Error ? error.message : "实名认证失败。" },
      { status: 502 }
    );
  }
}

function maskRealName(value: string) {
  if (value.length <= 1) {
    return value;
  }

  return `${value[0]}${"*".repeat(Math.max(1, value.length - 1))}`;
}
