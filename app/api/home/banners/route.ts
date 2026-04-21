import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("banners")
      .select("id, title, image_url, link_url, game_slug, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json(
        { message: "배너를 불러오지 못했습니다.", error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      banners: data ?? [],
    });
  } catch {
    return NextResponse.json(
      { message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}