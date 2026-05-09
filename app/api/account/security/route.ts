import { NextResponse } from "next/server";
import { refreshAccountSecurity } from "@/lib/accountSecurity";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  return NextResponse.json(await refreshAccountSecurity(user));
}
