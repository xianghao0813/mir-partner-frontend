import { NextRequest, NextResponse } from "next/server";
import { fetchAdminPublicApi } from "@/lib/adminPublicApi";

const PAGE_SIZE = 10;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const category = searchParams.get("category") ?? "latest";
    const page = Math.max(Number(searchParams.get("page") ?? "1"), 1);
    const keyword = (searchParams.get("keyword") ?? "").trim();
    const searchType = searchParams.get("searchType") ?? "title_content";

    const json = await fetchAdminPublicApi<{
      items: Array<{
        id: number;
        title: string;
        content: string;
        author: string;
        views: number;
        publishedAt: string;
        category: string;
      }>;
      pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
      };
    }>("/api/public/news", {
      category,
      page,
      keyword,
      searchType,
      limit: PAGE_SIZE,
    });

    const posts =
      json.items?.map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        author: item.author,
        views: item.views,
        createdAt: formatDate(item.publishedAt),
        category: item.category ?? category,
      })) ?? [];

    return NextResponse.json({
      posts,
      pagination: {
        page: json.pagination?.page ?? page,
        pageSize: json.pagination?.pageSize ?? PAGE_SIZE,
        total: json.pagination?.total ?? 0,
        totalPages: json.pagination?.totalPages ?? 1,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unexpected server error",
      },
      { status: 500 }
    );
  }
}

function formatDate(value: string) {
  const d = new Date(value);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}
