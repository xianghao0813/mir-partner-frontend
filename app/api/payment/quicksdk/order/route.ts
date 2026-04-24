import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createQuickSdkPayUrl, getQuickSdkPublicBaseUrl } from "@/lib/quicksdk";

type PackageDefinition = {
  id: number;
  coins: number;
  amount: string;
  subject: string;
  desc: string;
  goodsId: string;
};

const PACKAGE_MAP = new Map<number, PackageDefinition>([
  [1, { id: 1, coins: 100, amount: "100.00", subject: "100云币", desc: "购买100云币", goodsId: "cloud-coins-100" }],
  [2, { id: 2, coins: 300, amount: "300.00", subject: "300云币", desc: "购买300云币", goodsId: "cloud-coins-300" }],
  [3, { id: 3, coins: 500, amount: "500.00", subject: "500云币", desc: "购买500云币", goodsId: "cloud-coins-500" }],
  [4, { id: 4, coins: 1000, amount: "1000.00", subject: "1000云币", desc: "购买1000云币", goodsId: "cloud-coins-1000" }],
  [5, { id: 5, coins: 5000, amount: "5000.00", subject: "5000云币", desc: "购买5000云币", goodsId: "cloud-coins-5000" }],
  [6, { id: 6, coins: 10000, amount: "10000.00", subject: "10000云币", desc: "购买10000云币", goodsId: "cloud-coins-10000" }],
  [7, { id: 7, coins: 20000, amount: "20000.00", subject: "20000云币", desc: "购买20000云币", goodsId: "cloud-coins-20000" }],
  [8, { id: 8, coins: 30000, amount: "30000.00", subject: "30000云币", desc: "购买30000云币", goodsId: "cloud-coins-30000" }],
]);

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
    const selectedPackage = PACKAGE_MAP.get(packageId);

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
