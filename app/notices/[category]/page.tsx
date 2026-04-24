"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type NoticeCategory = "latest" | "events" | "updates";

type NoticePost = {
  id: number;
  category: NoticeCategory;
  title: string;
  content: string;
  author: string;
  views: number;
  createdAt: string;
};

type NoticeApiResponse = {
  posts: NoticePost[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

const categoryLabelMap: Record<NoticeCategory, string> = {
  latest: "最新消息",
  events: "活动",
  updates: "更新",
};

export default function NoticeCategoryPage() {
  const params = useParams();
  const category = (params.category as NoticeCategory) || "latest";

  const [searchType, setSearchType] = useState<"title_content" | "author">(
    "title_content"
  );
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState<NoticePost[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPage(1);
    setKeyword("");
    setAppliedKeyword("");
  }, [category]);

  useEffect(() => {
    async function fetchPosts() {
      try {
        setLoading(true);

        const query = new URLSearchParams({
          category,
          page: String(page),
          searchType,
          keyword: appliedKeyword,
        });

        const res = await fetch(`/api/notices?${query.toString()}`);

        if (!res.ok) {
          throw new Error("Failed to fetch notices");
        }

        const json = (await res.json()) as NoticeApiResponse;
        setPosts(json.posts ?? []);
        setTotalPages(json.pagination?.totalPages ?? 1);
      } catch (error) {
        console.error(error);
        setPosts([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, [appliedKeyword, category, page, searchType]);

  function handleSearch() {
    setPage(1);
    setAppliedKeyword(keyword.trim());
  }

  return (
    <main
      className="hide-scrollbar"
      style={{
        height: "calc(100vh - 81px)",
        overflowY: "auto",
        overflowX: "hidden",
        position: "relative",
        backgroundColor: "#07070a",
        backgroundImage:
          "linear-gradient(180deg, rgba(5,5,8,0.42) 0%, rgba(8,8,12,0.52) 100%), url('/login-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        color: "white",
        margin: "-40px",
        width: "calc(100% + 80px)",
        padding: "48px 0 80px",
      }}
    >
      <div className="auth-bg" style={{ position: "fixed" }} />
      <div className="auth-overlay" style={{ position: "fixed" }} />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "1240px",
          margin: "0 auto",
          padding: "0 28px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "34px" }}>
          <h1
            style={{
              fontSize: "46px",
              margin: 0,
              fontWeight: 800,
              background: "linear-gradient(90deg, #ffffff, #c084fc 55%, #8b5cf6)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            新闻中心
          </h1>
          <div
            style={{
              marginTop: "10px",
              letterSpacing: "0.45em",
              color: "#b7a9d8",
              fontSize: "18px",
            }}
          >
            NEWS BOARD
          </div>
          <div
            style={{
              width: "88px",
              height: "3px",
              margin: "18px auto 0",
              borderRadius: "999px",
              background: "linear-gradient(90deg, #7c3aed, #c084fc)",
              boxShadow: "0 0 18px rgba(124,58,237,0.35)",
            }}
          />
        </div>

        <div
          style={{
            background: "rgba(16,16,24,0.58)",
            border: "1px solid rgba(124,58,237,0.18)",
            borderRadius: "26px",
            padding: "28px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.28)",
            backdropFilter: "blur(14px)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "14px",
              justifyContent: "center",
              marginBottom: "26px",
              flexWrap: "wrap",
            }}
          >
            {(Object.keys(categoryLabelMap) as NoticeCategory[]).map((item) => (
              <Link
                key={item}
                href={`/notices/${item}`}
                style={{
                  textDecoration: "none",
                  padding: "10px 20px",
                  borderRadius: "999px",
                  background:
                    category === item
                      ? "linear-gradient(90deg, #7c3aed, #a855f7)"
                      : "rgba(255,255,255,0.04)",
                  color: "white",
                  fontWeight: 700,
                  border:
                    category === item
                      ? "1px solid rgba(192,132,252,0.45)"
                      : "1px solid rgba(255,255,255,0.08)",
                  boxShadow:
                    category === item
                      ? "0 0 18px rgba(124,58,237,0.24)"
                      : "none",
                }}
              >
                {categoryLabelMap[item]}
              </Link>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              marginBottom: "24px",
              background: "rgba(8,8,12,0.58)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "14px",
              minHeight: "58px",
              overflow: "hidden",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "stretch",
                background: "rgba(255,255,255,0.02)",
                borderRight: "1px solid rgba(255,255,255,0.08)",
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => setSearchType("title_content")}
                style={{
                  minWidth: "120px",
                  border: "none",
                  padding: "0 16px",
                  background:
                    searchType === "title_content"
                      ? "linear-gradient(180deg, #8b2df7, #6d28d9)"
                      : "transparent",
                  color: "white",
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                标题 + 内容
              </button>

              <button
                onClick={() => setSearchType("author")}
                style={{
                  minWidth: "88px",
                  border: "none",
                  padding: "0 16px",
                  background:
                    searchType === "author"
                      ? "linear-gradient(180deg, #8b2df7, #6d28d9)"
                      : "transparent",
                  color: "white",
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                作者
              </button>
            </div>

            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={
                searchType === "author"
                  ? "请输入作者名称"
                  : "请输入标题或内容"
              }
              style={{
                flex: 1,
                minWidth: "240px",
                border: "none",
                background: "transparent",
                color: "white",
                padding: "0 16px",
                fontSize: "16px",
                outline: "none",
                userSelect: "text",
                caretColor: "white",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
            />

            <button
              onClick={handleSearch}
              style={{
                width: "84px",
                border: "none",
                background: "transparent",
                color: "#d8c5ff",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              搜索
            </button>
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            {loading ? (
              <div style={emptyStateStyle}>加载中...</div>
            ) : posts.length === 0 ? (
              <div style={emptyStateStyle}>没有搜索结果。</div>
            ) : (
              posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/notices/${post.category}/${post.id}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "16px",
                    padding: "22px 24px",
                    borderRadius: "18px",
                    textDecoration: "none",
                    color: "#f3f4f6",
                    background:
                      "linear-gradient(180deg, rgba(22,22,30,0.98) 0%, rgba(14,14,20,0.98) 100%)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    boxShadow: "0 8px 18px rgba(0,0,0,0.18)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "18px",
                      alignItems: "flex-start",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        background: "linear-gradient(180deg, #8b5cf6, #7c3aed)",
                        borderRadius: "4px",
                        marginTop: "4px",
                        flexShrink: 0,
                        boxShadow: "0 0 12px rgba(124,58,237,0.28)",
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: 700,
                          marginBottom: "8px",
                          color: "#ffffff",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {post.title}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: "14px",
                          color: "#9ca3af",
                          fontSize: "14px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span>作者 {post.author}</span>
                        <span>浏览 {post.views.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      color: "#a78bfa",
                      fontSize: "15px",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {post.createdAt}
                  </div>
                </Link>
              ))
            )}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "10px",
              marginTop: "30px",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              style={pageButtonStyle(page === 1)}
            >
              上一页
            </button>

            {Array.from({ length: totalPages }).map((_, index) => {
              const pageNumber = index + 1;
              const isActive = pageNumber === page;

              return (
                <button
                  key={pageNumber}
                  onClick={() => setPage(pageNumber)}
                  style={{
                    ...pageButtonStyle(false),
                    background: isActive
                      ? "linear-gradient(90deg, #7c3aed, #a855f7)"
                      : "rgba(255,255,255,0.04)",
                    color: "white",
                    border: isActive
                      ? "1px solid rgba(192,132,252,0.45)"
                      : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: isActive
                      ? "0 0 14px rgba(124,58,237,0.22)"
                      : "none",
                  }}
                >
                  {pageNumber}
                </button>
              );
            })}

            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              style={pageButtonStyle(page === totalPages)}
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function pageButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    minWidth: "46px",
    height: "42px",
    padding: "0 14px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.08)",
    background: disabled ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.04)",
    color: disabled ? "#6b7280" : "white",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700,
  };
}

const emptyStateStyle: React.CSSProperties = {
  padding: "50px 20px",
  textAlign: "center",
  color: "#8d8d98",
  background: "rgba(255,255,255,0.02)",
  borderRadius: "18px",
  border: "1px solid rgba(255,255,255,0.05)",
};
