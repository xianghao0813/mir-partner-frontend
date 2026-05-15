import { NextResponse } from "next/server";
import { fetchAdminPublicApi } from "@/lib/adminPublicApi";

export async function GET() {
  try {
    const json = await fetchAdminPublicApi<{
      items: Array<{
        id: number;
        title: string;
        content: string;
        author: string;
        views: number;
        publishedAt: string;
        gameSlug: string | null;
        label: string | null;
        category: string;
      }>;
    }>("/api/public/news", {
      featured: 1,
      limit: 4,
    });

    const posts =
      json.items?.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.content,
        author: item.author,
        views: item.views,
        gameSlug: item.gameSlug,
        label: item.label,
        category: item.category ?? "latest",
        createdAt: formatDate(item.publishedAt),
      })) ?? [];

    return NextResponse.json({ posts });
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
