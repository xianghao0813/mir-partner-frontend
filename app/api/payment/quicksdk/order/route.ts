import { NextRequest, NextResponse } from "next/server";
import { getCloudCoinPackage } from "@/lib/cloudCoinPackages";
import { createQuickSdkPayUrl, getQuickSdkPublicBaseUrl } from "@/lib/quicksdk";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "请先登录。" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
      | {
          packageId?: number;
          payMethod?: "wechat" | "alipay";
        }
      | null;

    const packageId = Number(body?.packageId ?? 0);
    const payMethod = body?.payMethod === "alipay" ? "alipay" : "wechat";
    const selectedPackage = getCloudCoinPackage(packageId);

    if (!selectedPackage) {
      return NextResponse.json({ message: "无效的充值档位。" }, { status: 400 });
    }

    const uid = String(user.user_metadata?.quicksdk_uid ?? "").trim();
    const username =
      String(user.user_metadata?.quicksdk_username ?? "").trim() ||
      user.email?.split("@")[0] ||
      "player";

    if (!uid) {
      return NextResponse.json({ message: "当前账号未绑定 SDK UID。" }, { status: 400 });
    }

    const requestUrl = new URL(request.url);
    const publicBaseUrl = getQuickSdkPublicBaseUrl(requestUrl.origin);
    const callbackUrl = new URL("/api/payment/quicksdk/callback", publicBaseUrl).toString();
    const successUrl = new URL("/profile/wallet?payment=success", publicBaseUrl).toString();
    const cancelUrl = new URL("/profile/wallet?payment=cancel", publicBaseUrl).toString();
    const cpOrderNo = buildOrderNo(user.id, selectedPackage.id);
    const expiresAt = new Date(Date.now() + 60 * 1000).toISOString();

    const { error: orderInsertError } = await supabaseAdmin.from("payment_orders").insert({
      cp_order_no: cpOrderNo,
      user_id: user.id,
      package_id: selectedPackage.id,
      coins: selectedPackage.coins,
      expected_amount: Number(selectedPackage.amount),
      pay_method: payMethod,
      status: "pending",
      expires_at: expiresAt,
    });

    if (orderInsertError) {
      return NextResponse.json(
        {
          message: orderInsertError.code === "42P01"
            ? "支付订单表尚未初始化，请先执行 payment_orders SQL。"
            : orderInsertError.message,
        },
        { status: 500 }
      );
    }

    const extrasParams = Buffer.from(
      JSON.stringify({
        packageId: selectedPackage.id,
        coins: selectedPackage.coins,
        payMethod,
        userId: user.id,
      }),
      "utf8"
    ).toString("base64");

    const payUrl = await createQuickSdkPayUrl({
      amount: selectedPackage.amount,
      userId: uid,
      cpOrderNo,
      orderSubject: selectedPackage.subject,
      goodsName: selectedPackage.subject,
      goodsId: selectedPackage.goodsId,
      roleId: uid,
      roleName: username,
      roleLevel: "1",
      serverId: "mir-partner",
      serverName: "MIR Partner",
      extrasParams,
      callbackUrl,
      successUrl,
      cancelUrl,
      theme: "default",
    });

    return NextResponse.json({
      payUrl,
      cpOrderNo,
      amount: selectedPackage.amount,
      coins: selectedPackage.coins,
      payMethod,
      expiresAt,
      message: "支付页面已生成。",
    });
  } catch (error) {
    console.error("[QuickSDK order]", error);

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "创建支付链接失败。",
      },
      { status: 500 }
    );
  }
}

function buildOrderNo(userId: string, packageId: number) {
  const stamp = Date.now();
  const compactUserId = userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) || "user";
  return `mp${stamp}${packageId}${compactUserId}`.slice(0, 40);
}
