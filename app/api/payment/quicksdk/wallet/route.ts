import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildWalletSummary, reconcileQuickSdkRechargePoints } from "@/lib/wallet";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  const reconciledMetadata = await reconcileQuickSdkRechargePoints(user);

  return NextResponse.json(
    await buildWalletSummary({
      ...user,
      user_metadata: reconciledMetadata,
    })
  );
}
