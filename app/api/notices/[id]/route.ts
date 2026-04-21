import { NextRequest, NextResponse } from "next/server";
import { fetchAdminPublicApi } from "@/lib/adminPublicApi";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const postId = Number(id);

    if (!Number.isFinite(postId)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }

    const data = await fetchAdminPublicApi<{
      id: number;
      title: string;
      content: string;
      author: string;
      views: number;
      publishedAt: string;
      thumbnailUrl: string | null;
      category: string;
    }>(`/api/public/news/${postId}`);

    return NextResponse.json({
      id: data.id,
      title: data.title,
      content: data.content,
      author: data.author,
      views: data.views ?? 0,
      createdAt: formatDate(data.publishedAt),
      thumbnailUrl: data.thumbnailUrl,
      category: data.category ?? "latest",
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
