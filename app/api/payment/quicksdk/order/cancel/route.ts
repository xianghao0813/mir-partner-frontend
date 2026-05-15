import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: true });
  }

  const body = (await request.json().catch(() => null)) as { cpOrderNo?: string } | null;
  const cpOrderNo = typeof body?.cpOrderNo === "string" ? body.cpOrderNo.trim() : "";

  if (!cpOrderNo) {
    return NextResponse.json({ success: true });
  }

  await supabaseAdmin
    .from("payment_orders")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("cp_order_no", cpOrderNo)
    .eq("user_id", user.id)
    .eq("status", "pending");

  return NextResponse.json({ success: true });
}
