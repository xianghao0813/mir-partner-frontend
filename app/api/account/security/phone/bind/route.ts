import { NextResponse } from "next/server";
import { compactAuthMetadata } from "@/lib/authMetadata";
import { awardMirPoints } from "@/lib/mirPoints";
import { bindQuickSdkPhone } from "@/lib/quicksdk";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { insertPointTransaction } from "@/lib/userLedgers";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { phone?: string; code?: string } | null;
  const phone = body?.phone?.trim() ?? "";
  const code = body?.code?.trim() ?? "";
  const uid = String(user.user_metadata?.quicksdk_uid ?? "").trim();

  if (!uid) {
    return NextResponse.json({ message: "当前账号未绑定 SDK UID。" }, { status: 400 });
  }

  if (!phone || !code) {
    return NextResponse.json({ message: "请输入手机号和验证码。" }, { status: 400 });
  }

  try {
    await bindQuickSdkPhone({ uid, phone, code });

    const alreadyAwarded = user.user_metadata?.mobile_bind_point_awarded === true;
    const pointAward = alreadyAwarded
      ? null
      : awardMirPoints({
          metadata: user.user_metadata,
          points: 1000,
          source: "phone_bind",
          referenceId: `phone-bind-${user.id}`,
          title: "手机绑定奖励",
          description: "完成手机号绑定，奖励 1000 MIR 积分。",
        });

    const nextMetadata = compactAuthMetadata({
      ...(pointAward?.metadata ?? user.user_metadata ?? {}),
      mobile: phone,
      bound_phone: phone,
      phone_bound: true,
      mobile_bound: true,
      mobile_bound_at: new Date().toISOString(),
      mobile_bind_point_awarded: true,
    });

    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: nextMetadata,
    });

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    if (pointAward) {
      const latest = readLatestPointTransaction(pointAward.metadata);
      if (latest) {
        await insertPointTransaction(user.id, latest);
      }
    }

    return NextResponse.json({
      success: true,
      pointsAwarded: alreadyAwarded ? 0 : 1000,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "手机号绑定失败。" },
      { status: 502 }
    );
  }
}

function readLatestPointTransaction(metadata: Record<string, unknown> | undefined) {
  const transactions = Array.isArray(metadata?.mir_point_transactions)
    ? metadata.mir_point_transactions
    : [];
  const latest = transactions[0];

  if (!latest || typeof latest !== "object") {
    return null;
  }

  const source = latest as Record<string, unknown>;
  return {
    id: readString(source.id),
    title: readString(source.title) || "MIR 积分",
    description: readString(source.description) || "-",
    points: readNumber(source.points),
    createdAt: readString(source.createdAt) || new Date().toISOString(),
    source: readString(source.source) || "phone_bind",
  };
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.floor(parsed);
    }
  }

  return 0;
}
