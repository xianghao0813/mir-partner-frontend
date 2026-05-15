import { NextResponse } from "next/server";
import { fetchAdminPublicApi } from "@/lib/adminPublicApi";

export async function GET() {
  try {
    const json = await fetchAdminPublicApi<{
      banners: Array<{
        id: number;
        title: string | null;
        image_url: string;
        link_url: string | null;
        game_slug: string | null;
        sort_order: number;
      }>;
    }>("/api/public/banners");

    return NextResponse.json({
      banners: json.banners ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}
