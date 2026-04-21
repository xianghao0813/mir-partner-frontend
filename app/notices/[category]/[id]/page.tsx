"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type NoticeDetail = {
  id: number;
  title: string;
  content: string;
  author: string;
  views: number;
  createdAt: string;
  thumbnailUrl?: string | null;
  category: string;
};

const categoryLabelMap: Record<string, string> = {
  latest: "最新消息",
  events: "活动",
  updates: "更新",
};

export default function NoticeDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const category = params.category as string;

  const [post, setPost] = useState<NoticeDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPost() {
      try {
        setLoading(true);

        const res = await fetch(`/api/notices/${id}`);

        if (!res.ok) {
          throw new Error("Failed to fetch post");
        }

        const json = (await res.json()) as NoticeDetail;
        setPost(json);
      } catch (error) {
        console.error(error);
        setPost(null);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchPost();
    }
  }, [id]);

  const resolvedCategory = post?.category ?? category;

  return (
    <main
      className="hide-scrollbar"
      style={{
        height: "calc(100vh - 81px)",
        overflowY: "auto",
        background:
          "radial-gradient(circle at top, rgba(124,58,237,0.12) 0%, rgba(10,10,14,1) 32%, rgba(6,6,10,1) 100%)",
        color: "white",
        margin: "-40px",
        width: "calc(100% + 80px)",
        padding: "48px 0 80px",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "0 28px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "24px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <div
              style={{
                color: "#c084fc",
                fontSize: "14px",
                marginBottom: "8px",
                fontWeight: 700,
              }}
            >
              {categoryLabelMap[resolvedCategory] ?? "新闻"}
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: "42px",
                fontWeight: 800,
                background: "linear-gradient(90deg, #ffffff, #c084fc 55%, #8b5cf6)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              新闻详情
            </h1>
          </div>

          <Link
            href={`/notices/${resolvedCategory}`}
            style={{
              textDecoration: "none",
              color: "white",
              padding: "10px 18px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              fontWeight: 700,
            }}
          >
            返回列表
          </Link>
        </div>

        <div
          style={{
            background: "rgba(16,16,24,0.78)",
            border: "1px solid rgba(124,58,237,0.18)",
            borderRadius: "26px",
            padding: "34px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.28)",
            backdropFilter: "blur(14px)",
          }}
        >
          {loading ? (
            <div style={stateStyle}>加载中...</div>
          ) : !post ? (
            <div style={stateStyle}>找不到该文章。</div>
          ) : (
            <>
              <h2
                style={{
                  fontSize: "38px",
                  marginTop: 0,
                  marginBottom: "18px",
                  lineHeight: 1.3,
                }}
              >
                {post.title}
              </h2>

              <div
                style={{
                  display: "flex",
                  gap: "18px",
                  flexWrap: "wrap",
                  color: "#9ca3af",
                  fontSize: "15px",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  paddingBottom: "18px",
                  marginBottom: "28px",
                }}
              >
                <span>作者 {post.author}</span>
                <span>浏览 {post.views.toLocaleString()}</span>
                <span>{post.createdAt}</span>
              </div>

              {post.thumbnailUrl && (
                <div style={{ marginBottom: "28px" }}>
                  <img
                    src={post.thumbnailUrl}
                    alt={post.title}
                    style={{
                      width: "100%",
                      borderRadius: "20px",
                      display: "block",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  />
                </div>
              )}

              <div
                style={{
                  color: "#e5e7eb",
                  lineHeight: 1.9,
                  fontSize: "17px",
                  whiteSpace: "pre-wrap",
                }}
              >
                {post.content}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

const stateStyle: React.CSSProperties = {
  padding: "80px 20px",
  textAlign: "center",
  color: "#8d8d98",
};
