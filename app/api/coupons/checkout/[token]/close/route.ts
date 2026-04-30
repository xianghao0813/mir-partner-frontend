import { NextRequest, NextResponse } from "next/server";
import { expireCouponCheckoutSessions } from "@/lib/coupons";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: true });
  }

  await expireCouponCheckoutSessions(supabaseAdmin);

  const { token } = await context.params;
  await supabaseAdmin
    .from("coupon_checkout_sessions")
    .update({ status: "closed" })
    .eq("session_token", token)
    .eq("user_id", user.id)
    .eq("status", "open");

  return NextResponse.json({ success: true });
}
