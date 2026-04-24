import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { changeQuickSdkPassword } from "@/lib/quicksdk";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      oldPassword?: string;
      newPassword?: string;
    };

    const oldPassword = body.oldPassword?.trim() ?? "";
    const newPassword = body.newPassword?.trim() ?? "";

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { error: "请输入当前密码和新密码。" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "新密码至少需要 8 位。" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "请先登录。" }, { status: 401 });
    }

    const uid = readMetadataString(user.user_metadata?.quicksdk_uid);

    if (!uid) {
      return NextResponse.json(
        { error: "当前账号不是 QuickSDK 账号，无法使用 SDK 修改密码。" },
        { status: 400 }
      );
    }

    await changeQuickSdkPassword({
      userId: uid,
      oldPassword,
      newPassword,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "修改密码失败。",
      },
      { status: 500 }
    );
  }
}

function readMetadataString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
