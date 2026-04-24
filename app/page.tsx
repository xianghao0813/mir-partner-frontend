"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type NoticeCategory = "latest" | "events" | "updates";

type HomeBanner = {
  id: number;
  title: string | null;
  image_url: string;
  link_url: string | null;
  game_slug: string | null;
  sort_order: number;
};

type FeaturedNews = {
  id: number;
  title: string;
  description: string;
  author: string;
  views: number;
  gameSlug: string | null;
  label: string | null;
  category: NoticeCategory;
  createdAt: string;
};

const gameLabelMap: Record<string, string> = {
  mir4: "MIR4",
  mirm: "MIR M",
  "night-crows": "Night Crows",
  "legend-of-ymir": "Legend of YMIR",
};

const postLabelMap: Record<string, string> = {
  notice: "公告",
  event: "活动",
  update: "更新",
};

const showcasePosters = [
  {
    title: "MIR4",
    subtitle: "Global Action MMORPG",
    image: "/banners/mir4-main.jpg",
  },
  {
    title: "MIR M",
    subtitle: "Legacy Reforged For Mobile",
    image: "/games/mir-m.jpg",
  },
  {
    title: "Night Crows",
    subtitle: "Dark Medieval Massive War",
    image: "/games/night-crows.jpg",
  },
  {
    title: "Legend of YMIR",
    subtitle: "Next Mythic Universe",
    image: "/games/ymir.jpg",
  },
  {
    title: "Night Crows Event",
    subtitle: "Live Operation Momentum",
    image: "/banners/nightcrows-event.jpg",
  },
];

export default function Home() {
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [newsPosts, setNewsPosts] = useState<FeaturedNews[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHomeData() {
      try {
        setLoading(true);

        const [bannerRes, newsRes] = await Promise.all([
          fetch("/api/home/banners"),
          fetch("/api/home/featured-news"),
        ]);

        if (!bannerRes.ok || !newsRes.ok) {
          throw new Error("Failed to fetch home data");
        }

        const bannerJson = await bannerRes.json();
        const newsJson = await newsRes.json();

        setBanners(bannerJson.banners ?? []);
        setNewsPosts(newsJson.posts ?? []);
      } catch (error) {
        console.error(error);
        setBanners([]);
        setNewsPosts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchHomeData();
  }, []);

  return (
    <>
      <div className="main-bg" />
      <div className="main-overlay" />

      <main
        className="hide-scrollbar home-main"
        style={{
          height: "calc(100vh - 81px)",
          overflowY: "auto",
          scrollSnapType: "y mandatory",
          scrollBehavior: "smooth",
          background:
            "linear-gradient(180deg, rgba(5,6,12,0.18) 0%, rgba(5,6,12,0.7) 62%, rgba(5,6,12,0.96) 100%), url('/home-cinematic-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          color: "white",
          margin: "-40px",
          width: "calc(100% + 80px)",
        }}
      >
        <section className="home-hero-section" style={heroSectionStyle}>
          <div className="home-hero-glow" style={heroGlowStyle} />

          <img
            className="home-hero-logo"
            src="/company-logo.png"
            alt="MIR Partner"
            style={{
              width: "min(70vw, 520px)",
              marginBottom: "28px",
              position: "relative",
              zIndex: 1,
              animation: "fadeUp 1s ease-out",
            }}
          />

          <h1 className="home-hero-title" style={heroTitleStyle}>WE DARE TO BREAK RULES</h1>

          <p className="home-hero-subtitle" style={heroSubtitleStyle}>
            MIR Partner 是连接游戏、社区与合作价值的内容平台。你可以在这里集中查看核心项目、品牌方向与最新动态。
          </p>

          <ScrollCue />
        </section>

        <section className="home-showcase-section" style={showcaseSectionStyle}>
          <div style={showcaseOverlayStyle} />

          <div className="home-showcase-background" style={showcaseBackgroundStyle}>
            <div style={showcaseTrackStyle}>
              {[...showcasePosters, ...showcasePosters].map((poster, index) => (
                <PosterCard key={`top-${poster.title}-${index}`} poster={poster} tall={index % 2 === 0} />
              ))}
            </div>

            <div style={showcaseTrackReverseStyle}>
              {[...showcasePosters.slice().reverse(), ...showcasePosters.slice().reverse()].map((poster, index) => (
                <PosterCard key={`bottom-${poster.title}-${index}`} poster={poster} tall={index % 2 !== 0} />
              ))}
            </div>
          </div>

          <div className="home-showcase-panel" style={showcasePanelStyle}>
            <div style={eyebrowStyle}>Our Games, Our Direction</div>
            <div style={showcaseMiniTitleStyle}>游戏矩阵驱动长期增长</div>
            <h2 className="home-showcase-title" style={showcaseTitleStyle}>GREAT GAMES BUILD LONG-TERM WORLDS</h2>
            <p className="home-showcase-text" style={showcaseTextStyle}>
              自研与核心发行游戏共同构成公司的增长引擎，我们围绕 IP 生命周期、全球运营能力与用户社群价值持续扩张业务边界。
            </p>
          </div>

          <ScrollCue accent="#c4b5fd" />
        </section>

        <section className="home-news-section" style={newsSectionStyle}>
          <div className="home-news-shell" style={newsShellStyle}>
            <div style={{ textAlign: "center", marginBottom: "10px" }}>
              <div style={eyebrowStyle}>Latest Updates</div>
              <h2 className="home-news-title" style={newsTitleStyle}>最新消息</h2>
              <p className="home-news-subtitle" style={newsSubtitleStyle}>快速查看重点横幅与最新公告，保持和平台动态同步。</p>
            </div>

            <div
              style={{
                overflow: "hidden",
                width: "100%",
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: "max-content",
                  gap: "20px",
                  animation: banners.length > 1 ? "bannerMarquee 24s linear infinite" : "none",
                  padding: "0 20px",
                }}
              >
                {banners.length === 0 ? (
                  <div style={{ color: "#9ca3af", padding: "32px 0" }}>当前没有可显示的横幅。</div>
                ) : (
                  [...banners, ...banners].map((banner, index) => {
                    const image = (
                      <img
                        src={banner.image_url}
                        alt={banner.title || `横幅 ${index + 1}`}
                        className="home-banner-image"
                        style={bannerImageStyle}
                      />
                    );

                    if (!banner.link_url) {
                      return <div key={`${banner.id}-${index}`}>{image}</div>;
                    }

                    return (
                      <a
                        key={`${banner.id}-${index}`}
                        href={banner.link_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: "block" }}
                      >
                        {image}
                      </a>
                    );
                  })
                )}
              </div>
            </div>

            <div className="home-news-grid" style={newsGridStyle}>
              {loading ? (
                <div style={{ color: "#aaa", textAlign: "center", gridColumn: "1 / -1" }}>加载中...</div>
              ) : newsPosts.length === 0 ? (
                <div style={{ color: "#aaa", textAlign: "center", gridColumn: "1 / -1" }}>暂无可显示的重要公告。</div>
              ) : (
                newsPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/notices/${post.category}/${post.id}`}
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <div className="home-news-card" style={newsCardStyle}>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                          marginBottom: "14px",
                        }}
                      >
                        <div style={pillPrimaryStyle}>
                          {post.gameSlug ? gameLabelMap[post.gameSlug] ?? post.gameSlug : "通用"}
                        </div>
                        <div style={pillSecondaryStyle}>
                          {post.label ? postLabelMap[post.label] ?? post.label : "公告"}
                        </div>
                      </div>

                      <h3 style={newsCardTitleStyle}>{post.title}</h3>

                      <p style={newsCardTextStyle}>{truncate(post.description, 120)}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </section>

        <style>{`
          @keyframes scrollDot {
            0% {
              transform: translateY(0);
              opacity: 0.2;
            }
            100% {
              transform: translateY(12px);
              opacity: 0;
            }
          }

          @keyframes arrowBounce {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(6px);
            }
          }

          @keyframes fadeUp {
            from {
              opacity: 0;
              transform: translateY(24px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes bannerMarquee {
            from {
              transform: translateX(0);
            }
            to {
              transform: translateX(-50%);
            }
          }

          @keyframes showcaseMarquee {
            from {
              transform: translateX(0);
            }
            to {
              transform: translateX(-50%);
            }
          }

          @keyframes showcaseMarqueeReverse {
            from {
              transform: translateX(-50%);
            }
            to {
              transform: translateX(0);
            }
          }
        `}</style>
      </main>
    </>
  );
}

function PosterCard({
  poster,
  tall,
}: {
  poster: { title: string; subtitle: string; image: string };
  tall: boolean;
}) {
  return (
    <div
      className={`home-poster-card ${tall ? "is-tall" : "is-short"}`}
      style={{
        position: "relative",
        width: "clamp(150px, 16vw, 240px)",
        height: tall ? "410px" : "338px",
        borderRadius: "26px",
        overflow: "hidden",
        transform: `translateY(${tall ? "0px" : "40px"})`,
        boxShadow: "0 28px 60px rgba(0,0,0,0.45)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <img
        src={poster.image}
        alt={poster.title}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          filter: "saturate(1.08) contrast(1.06)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(8,8,12,0.08) 0%, rgba(8,8,12,0.72) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "18px",
          right: "18px",
          bottom: "18px",
          zIndex: 1,
        }}
      >
        <div style={{ fontSize: "clamp(20px, 2vw, 30px)", fontWeight: 800 }}>{poster.title}</div>
        <div
          style={{
            marginTop: "6px",
            color: "#d8b4fe",
            fontSize: "11px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {poster.subtitle}
        </div>
      </div>
    </div>
  );
}

function ScrollCue({ accent = "#a855f7" }: { accent?: string }) {
  return (
    <div
      className="home-scroll-cue"
      style={{
        position: "absolute",
        bottom: "84px",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        zIndex: 3,
      }}
    >
      <span style={{ fontSize: "12px", color: accent, letterSpacing: "2px" }}>SCROLL DOWN</span>
      <div
        style={{
          width: "4px",
          height: "10px",
          background: accent,
          borderRadius: "10px",
          animation: "scrollDot 1.5s infinite",
          boxShadow: `0 0 10px ${accent}`,
        }}
      />
      <div
        style={{
          fontSize: "18px",
          color: accent,
          animation: "arrowBounce 1.5s infinite",
          textShadow: `0 0 10px ${accent}`,
        }}
      >
        ↓
      </div>
    </div>
  );
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trimEnd()}...`;
}

const heroSectionStyle: React.CSSProperties = {
  height: "calc(100vh - 81px)",
  scrollSnapAlign: "start",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  position: "relative",
  overflow: "hidden",
  padding: "40px 20px",
};

const heroGlowStyle: React.CSSProperties = {
  position: "absolute",
  width: "520px",
  height: "520px",
  background:
    "radial-gradient(circle, rgba(124,58,237,0.35) 0%, rgba(124,58,237,0.08) 40%, rgba(0,0,0,0) 75%)",
  filter: "blur(24px)",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  pointerEvents: "none",
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "clamp(42px, 7vw, 88px)",
  fontWeight: 800,
  lineHeight: 1.1,
  letterSpacing: "-0.03em",
  background: "linear-gradient(90deg, #ffffff, #c084fc 55%, #8b5cf6)",
  WebkitBackgroundClip: "text",
  color: "transparent",
  textShadow: "0 0 24px rgba(139,92,246,0.18)",
  position: "relative",
  zIndex: 1,
  animation: "fadeUp 1.4s ease-out",
};

const heroSubtitleStyle: React.CSSProperties = {
  marginTop: "18px",
  marginBottom: 0,
  color: "#b8b8b8",
  fontSize: "clamp(15px, 2vw, 20px)",
  lineHeight: 1.7,
  maxWidth: "900px",
  position: "relative",
  zIndex: 1,
  animation: "fadeUp 1.8s ease-out",
};

const showcaseSectionStyle: React.CSSProperties = {
  height: "calc(100vh - 81px)",
  scrollSnapAlign: "start",
  position: "relative",
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "40px 24px",
};

const showcaseOverlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "linear-gradient(180deg, rgba(4,4,8,0.32) 0%, rgba(4,4,8,0.72) 38%, rgba(4,4,8,0.9) 100%)",
  zIndex: 1,
};

const showcaseBackgroundStyle: React.CSSProperties = {
  position: "absolute",
  inset: "8% 4%",
  display: "grid",
  gap: "24px",
  transform: "perspective(1800px) rotateX(9deg) rotateY(-5deg)",
  opacity: 0.52,
  zIndex: 0,
};

const showcaseTrackStyle: React.CSSProperties = {
  display: "flex",
  gap: "20px",
  width: "max-content",
  animation: "showcaseMarquee 32s linear infinite",
};

const showcaseTrackReverseStyle: React.CSSProperties = {
  display: "flex",
  gap: "20px",
  width: "max-content",
  justifySelf: "end",
  animation: "showcaseMarqueeReverse 40s linear infinite",
};

const showcasePanelStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 2,
  textAlign: "center",
  maxWidth: "940px",
  padding: "42px 36px",
  borderRadius: "36px",
  background: "rgba(8,10,18,0.62)",
  border: "1px solid rgba(255,255,255,0.12)",
  backdropFilter: "blur(18px)",
  boxShadow: "0 24px 80px rgba(0,0,0,0.42)",
};

const eyebrowStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: "8px 14px",
  borderRadius: "999px",
  background: "rgba(168,85,247,0.16)",
  border: "1px solid rgba(192,132,252,0.24)",
  color: "#d8b4fe",
  fontSize: "12px",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const showcaseMiniTitleStyle: React.CSSProperties = {
  marginTop: "18px",
  color: "#f5d0fe",
  fontSize: "clamp(12px, 1.4vw, 14px)",
  letterSpacing: "0.24em",
  textTransform: "uppercase",
};

const showcaseTitleStyle: React.CSSProperties = {
  margin: "18px 0 16px",
  fontSize: "clamp(34px, 5.8vw, 74px)",
  lineHeight: 1.04,
  letterSpacing: "-0.04em",
  fontWeight: 800,
  background: "linear-gradient(90deg, #ffffff 0%, #ddd6fe 45%, #a78bfa 100%)",
  WebkitBackgroundClip: "text",
  color: "transparent",
};

const showcaseTextStyle: React.CSSProperties = {
  margin: "0 auto",
  maxWidth: "760px",
  color: "#d1d5db",
  fontSize: "clamp(15px, 2vw, 19px)",
  lineHeight: 1.8,
};

const newsSectionStyle: React.CSSProperties = {
  minHeight: "calc(100vh - 81px)",
  scrollSnapAlign: "start",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "40px 24px 56px",
};

const newsShellStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "1360px",
  borderRadius: "36px",
  padding: "28px",
  background: "rgba(9,12,22,0.72)",
  border: "1px solid rgba(168,85,247,0.16)",
  boxShadow: "0 30px 80px rgba(0,0,0,0.28)",
  display: "grid",
  gap: "30px",
};

const newsTitleStyle: React.CSSProperties = {
  fontSize: "42px",
  margin: "16px 0 12px",
  background: "linear-gradient(90deg, #a855f7, #6366f1)",
  WebkitBackgroundClip: "text",
  color: "transparent",
};

const newsSubtitleStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: "18px",
  margin: 0,
};

const bannerImageStyle: React.CSSProperties = {
  width: "min(680px, 80vw)",
  height: "300px",
  objectFit: "cover",
  borderRadius: "22px",
  border: "1px solid rgba(124,58,237,0.22)",
  boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
  display: "block",
};

const newsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 320px))",
  justifyContent: "center",
  gap: "20px",
  width: "100%",
};

const newsCardStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(18,22,36,0.96) 0%, rgba(11,13,22,0.96) 100%)",
  border: "1px solid rgba(124,58,237,0.18)",
  borderRadius: "20px",
  padding: "20px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.28)",
  height: "100%",
};

const newsCardTitleStyle: React.CSSProperties = {
  fontSize: "20px",
  marginTop: 0,
  marginBottom: "12px",
  lineHeight: 1.35,
  color: "white",
};

const newsCardTextStyle: React.CSSProperties = {
  color: "#b5b5b5",
  fontSize: "15px",
  lineHeight: 1.6,
  margin: 0,
};

const pillPrimaryStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: "999px",
  backgroundColor: "rgba(124,58,237,0.18)",
  color: "#c4b5fd",
  fontSize: "13px",
};

const pillSecondaryStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: "999px",
  backgroundColor: "rgba(255,255,255,0.08)",
  color: "#e5e7eb",
  fontSize: "13px",
};
