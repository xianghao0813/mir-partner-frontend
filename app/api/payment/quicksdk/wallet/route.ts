import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildWalletSummary } from "@/lib/wallet";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  return NextResponse.json(buildWalletSummary(user));
}
