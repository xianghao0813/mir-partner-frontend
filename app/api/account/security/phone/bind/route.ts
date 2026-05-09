import { NextResponse } from "next/server";
import { compactAuthMetadata } from "@/lib/authMetadata";
import { awardMirPoints } from "@/lib/mirPoints";
import { bindQuickSdkPhone, loginQuickSdkByPhone } from "@/lib/quicksdk";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { insertPointTransaction } from "@/lib/userLedgers";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "\u8bf7\u5148\u767b\u5f55\u3002" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { phone?: string; code?: string } | null;
  const phone = body?.phone?.trim() ?? "";
  const code = body?.code?.trim() ?? "";
  const uid = String(user.user_metadata?.quicksdk_uid ?? "").trim();

  if (!uid) {
    return NextResponse.json({ message: "\u5f53\u524d\u8d26\u53f7\u672a\u7ed1\u5b9a SDK UID\u3002" }, { status: 400 });
  }

  if (!phone || !code) {
    return NextResponse.json({ message: "\u8bf7\u8f93\u5165\u624b\u673a\u53f7\u548c\u9a8c\u8bc1\u7801\u3002" }, { status: 400 });
  }

  try {
    const quickSdkUsername = String(user.user_metadata?.quicksdk_username ?? "").trim();
    if (isSamePhone(phone, quickSdkUsername)) {
      const account = await loginQuickSdkByPhone({ phone, code });
      if (account.uid === uid) {
        return await markPhoneBound(user.id, user.user_metadata, phone);
      }
    }

    await bindQuickSdkPhone({ uid, phone, code });
    return await markPhoneBound(user.id, user.user_metadata, phone);
  } catch (error) {
    const quickSdkUsername = String(user.user_metadata?.quicksdk_username ?? "").trim();
    if (isAlreadyBoundPhoneError(error) && isSamePhone(phone, quickSdkUsername)) {
      return await markPhoneBound(user.id, user.user_metadata, phone);
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "\u624b\u673a\u53f7\u7ed1\u5b9a\u5931\u8d25\u3002" },
      { status: 502 }
    );
  }
}

async function markPhoneBound(
  userId: string,
  metadata: Record<string, unknown> | undefined,
  phone: string
) {
  const alreadyAwarded = metadata?.mobile_bind_point_awarded === true;
  const pointAward = alreadyAwarded
    ? null
    : awardMirPoints({
        metadata,
        points: 1000,
        source: "phone_bind",
        referenceId: `phone-bind-${userId}`,
        title: "\u624b\u673a\u7ed1\u5b9a\u5956\u52b1",
        description: "\u5b8c\u6210\u624b\u673a\u53f7\u7ed1\u5b9a\uff0c\u5956\u52b1 1000 MIR \u79ef\u5206\u3002",
      });

  const nextMetadata = compactAuthMetadata({
    ...(pointAward?.metadata ?? metadata ?? {}),
    mobile: phone,
    bound_phone: phone,
    phone_bound: true,
    mobile_bound: true,
    mobile_bound_at: new Date().toISOString(),
    mobile_bind_point_awarded: true,
  });

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: nextMetadata,
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  if (pointAward) {
    const latest = readLatestPointTransaction(pointAward.metadata);
    if (latest) {
      await insertPointTransaction(userId, latest);
    }
  }

  return NextResponse.json({
    success: true,
    pointsAwarded: alreadyAwarded ? 0 : 1000,
  });
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

function isSamePhone(left: string, right: string) {
  return normalizePhone(left) !== "" && normalizePhone(left) === normalizePhone(right);
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
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
    title: readString(source.title) || "MIR \u79ef\u5206",
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
