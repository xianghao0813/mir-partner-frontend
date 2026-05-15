import { NextRequest, NextResponse } from "next/server";
import { getCloudCoinPackage } from "@/lib/cloudCoinPackages";
import { requireRealNameVerified } from "@/lib/accountSecurity";
import { createQuickSdkPayUrl, getQuickSdkPublicBaseUrl } from "@/lib/quicksdk";
import { detectRapidPaymentAttempts, recordRiskEvent } from "@/lib/riskControl";
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

    if (!(await requireRealNameVerified(user))) {
      return NextResponse.json({ message: "请先完成实名认证后再进行充值。" }, { status: 403 });
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
      await recordRiskEvent({
        userId: user.id,
        eventType: "invalid_payment_package",
        severity: "medium",
        score: 20,
        source: "payment_order",
        request,
        details: { packageId: body?.packageId ?? null },
      });
      return NextResponse.json({ message: "无效的充值档位。" }, { status: 400 });
    }

    const rapidCheck = await detectRapidPaymentAttempts({
      userId: user.id,
      request,
      source: "payment_order",
    });

    if (rapidCheck.blocked) {
      return NextResponse.json(
        { message: "请求过于频繁，请稍后再试。如账号被冻结，请联系客户中心。" },
        { status: 429 }
      );
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
    const cpOrderNo = buildOrderNo(user.id, selectedPackage.id);
    const successUrl = new URL(`/payment/result?status=success&order=${encodeURIComponent(cpOrderNo)}`, publicBaseUrl).toString();
    const cancelUrl = new URL(`/payment/result?status=cancel&order=${encodeURIComponent(cpOrderNo)}`, publicBaseUrl).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

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
