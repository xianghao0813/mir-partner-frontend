"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Section = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  points?: string[];
  stats?: { label: string; value: string }[];
  cta?: boolean;
};

const sections: Section[] = [
  {
    id: "intro",
    eyebrow: "MIR PARTNER PROGRAM",
    title: "MIR 合伙人计划",
    description:
      "MIR Partner 是连接玩家、社区与运营团队的成长型合作计划。\n参与者不只是内容消费者，也可以通过持续贡献积累成果，逐步成长为生态中的长期合伙人。",
    points: [
      "加入后即可了解计划结构、成长路径与奖励流向。",
      "活动记录与参与成果会持续累计，形成可追踪的成长数据。",
      "从个人参与到团队扩展，提供连贯且清晰的发展路径。",
    ],
  },
  {
    id: "points",
    eyebrow: "POINT SYSTEM",
    title: "积分驱动的成长体系",
    description:
      "积分是衡量合伙人在计划内活动成果的核心指标。\n通过游戏充值、云币充值、活动参与、小游戏挑战与社区贡献等行为累计，并作为星级成长与权益开放的重要依据。",
    stats: [
      { label: "核心指标", value: "积分" },
      { label: "星级体系", value: "8级" },
      { label: "统计周期", value: "每月" },
    ],
    points: [
      "积分越高，可解锁的星级权限与专属权益越多。",
      "系统按月统计积分变化，并根据规则判断升级、维持或降级。",
      "该体系更重视长期参与，而不是单次短期活动。",
    ],
  },
  {
    id: "team",
    eyebrow: "TEAM GROWTH",
    title: "团队化扩展",
    description:
      "合伙人不仅可以以个人身份参与，也可以通过推荐与协作逐步扩展团队。\n团队活动会成为长期成长的重要支撑，帮助合伙人建立更稳定的参与基础。",
    stats: [
      { label: "建议团队规模", value: "最多 50" },
      { label: "关系层级", value: "3级" },
      { label: "辅助贡献率", value: "10%" },
    ],
    points: [
      "下级成员的活跃表现可为整体成长数据提供辅助贡献。",
      "推荐机制强调可持续运营，而不是无序扩张。",
      "团队管理与个人活动会整合在同一套成长流程中。",
    ],
  },
  {
    id: "rules",
    eyebrow: "RULES & STABILITY",
    title: "透明稳定的运营规则",
    description:
      "合伙人计划基于明确的指标与可公开说明的运营原则运行。\n积分统计、星级升级、月度结算与限制政策都会按照统一规则执行，确保整体运营稳定。",
    points: [
      "活动标准与星级条件会清晰展示，减少理解偏差。",
      "异常行为将按照规则进行识别与分级处理。",
      "规则调整会通过公告区域同步，方便用户追踪最新变化。",
    ],
    stats: [
      { label: "运营周期", value: "按月" },
      { label: "升级处理", value: "定期" },
      { label: "规则执行", value: "统一" },
    ],
  },
  {
    id: "benefits",
    eyebrow: "BENEFITS & UPGRADE",
    title: "从参与者成长为核心合伙人",
    description:
      "随着星级提升，合伙人可逐步获得更多专属权益、活动资格与运营支持。\n该计划的目标不只是发放奖励，而是建立可持续协作的长期合作通道。",
    points: [
      "提供专属说明入口与运营指引。",
      "活动参与资格与联合策划机会将按星级逐步开放。",
      "可通过公告与计划说明及时查看最新政策。",
      "表现优秀的合伙人有机会获得进一步合作邀请。",
    ],
    cta: true,
  },
];

export default function PartnerPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentIndexRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  function getSectionTop(index: number) {
    const el = containerRef.current;
    const section = el?.querySelector<HTMLElement>(`[data-section-index="${index}"]`);
    return section?.offsetTop ?? (el ? index * el.clientHeight : 0);
  }

  function scrollToSection(index: number, behavior: ScrollBehavior = "smooth") {
    const el = containerRef.current;
    if (!el) return;

    currentIndexRef.current = index;
    setCurrentIndex(index);
    el.scrollTo({
      top: getSectionTop(index),
      behavior,
    });
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (isAnimatingRef.current || Math.abs(e.deltaY) < 8) return;

      const direction = e.deltaY > 0 ? 1 : -1;
      const nextIndex = Math.min(
        sections.length - 1,
        Math.max(0, currentIndexRef.current + direction)
      );

      if (nextIndex === currentIndexRef.current) return;

      isAnimatingRef.current = true;
      scrollToSection(nextIndex);

      setTimeout(() => {
        isAnimatingRef.current = false;
        scrollToSection(currentIndexRef.current, "auto");
      }, 850);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnimatingRef.current) return;
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;

      const direction = e.key === "ArrowDown" ? 1 : -1;
      const nextIndex = Math.min(
        sections.length - 1,
        Math.max(0, currentIndexRef.current + direction)
      );

      if (nextIndex === currentIndexRef.current) return;

      isAnimatingRef.current = true;
      scrollToSection(nextIndex);

      setTimeout(() => {
        isAnimatingRef.current = false;
        scrollToSection(currentIndexRef.current, "auto");
      }, 850);
    };

    const handleResize = () => {
      scrollToSection(currentIndexRef.current, "auto");
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      el.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  function goToSection(index: number) {
    scrollToSection(index);
  }

  return (
    <div
      ref={containerRef}
      className="hide-scrollbar"
      style={{
        height: "calc(100vh - 81px)",
        overflowY: "auto",
        scrollBehavior: "smooth",
        scrollSnapType: "y mandatory",
        margin: "-40px",
        width: "calc(100% + 80px)",
        position: "relative",
        backgroundColor: "#07070a",
        backgroundImage:
          "linear-gradient(180deg, rgba(5,5,8,0.42) 0%, rgba(8,8,12,0.52) 100%), url('/login-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="auth-bg" style={{ position: "fixed" }} />
      <div className="auth-overlay" style={{ position: "fixed" }} />

      <div
        style={{
          position: "fixed",
          right: "28px",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {sections.map((section, index) => (
          <button
            key={section.id}
            onClick={() => goToSection(index)}
            aria-label={section.title}
            style={{
              width: currentIndex === index ? "28px" : "12px",
              height: "12px",
              borderRadius: "999px",
              border: "none",
              cursor: "pointer",
              transition: "0.3s",
              background:
                currentIndex === index
                  ? "linear-gradient(90deg, #7c3aed, #c084fc)"
                  : "rgba(255,255,255,0.18)",
              boxShadow:
                currentIndex === index
                  ? "0 0 18px rgba(124,58,237,0.45)"
                  : "none",
            }}
          />
        ))}
      </div>

      {sections.map((section, index) => (
        <section
          key={section.id}
          data-section-index={index}
          style={{
            height: "calc(100vh - 81px)",
            scrollSnapAlign: "start",
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            background:
              "radial-gradient(circle at top, rgba(124,58,237,0.12) 0%, rgba(12,12,18,0.18) 38%, rgba(5,5,7,0.12) 100%)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg, rgba(124,58,237,0.05) 0%, transparent 20%, transparent 80%, rgba(124,58,237,0.05) 100%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: "900px",
              height: "900px",
              borderRadius: "999px",
              background: "rgba(124,58,237,0.08)",
              filter: "blur(80px)",
              top: "-180px",
              left: "50%",
              transform: "translateX(-50%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
              backgroundSize: "80px 80px",
              opacity: 0.14,
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              width: "100%",
              maxWidth: "1320px",
              padding: "48px",
              boxSizing: "border-box",
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.9fr)",
              gap: "44px",
              alignItems: "center",
              color: "white",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-block",
                  marginBottom: "18px",
                  padding: "8px 14px",
                  borderRadius: "999px",
                  fontSize: "13px",
                  letterSpacing: "0.18em",
                  color: "#d8c5ff",
                  background: "rgba(124,58,237,0.12)",
                  border: "1px solid rgba(192,132,252,0.22)",
                }}
              >
                {section.eyebrow}
              </div>

              <h1
                style={{
                  fontSize: "58px",
                  lineHeight: 1.12,
                  margin: "0 0 20px",
                  fontWeight: 800,
                  background:
                    "linear-gradient(90deg, #ffffff 0%, #d8b4fe 45%, #8b5cf6 100%)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                {section.title}
              </h1>

              <p
                style={{
                  fontSize: "19px",
                  lineHeight: 1.9,
                  color: "#c8c8d2",
                  whiteSpace: "pre-line",
                  marginBottom: "26px",
                  maxWidth: "760px",
                }}
              >
                {section.description}
              </p>

              {section.points && (
                <div style={{ display: "grid", gap: "12px", maxWidth: "760px" }}>
                  {section.points.map((point, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        color: "#ececf1",
                        fontSize: "16px",
                      }}
                    >
                      <div
                        style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "999px",
                          background: "linear-gradient(90deg, #7c3aed, #c084fc)",
                          boxShadow: "0 0 12px rgba(124,58,237,0.5)",
                          flexShrink: 0,
                        }}
                      />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              )}

              {section.cta && (
                <div
                  style={{
                    display: "flex",
                    gap: "14px",
                    marginTop: "34px",
                    flexWrap: "wrap",
                  }}
                >
                  <Link
                    href="/signup"
                    style={{
                      textDecoration: "none",
                      padding: "14px 28px",
                      borderRadius: "14px",
                      background: "linear-gradient(90deg, #7c3aed, #a855f7)",
                      color: "white",
                      fontWeight: 800,
                      boxShadow: "0 0 20px rgba(124,58,237,0.28)",
                    }}
                  >
                    立即加入合伙人计划
                  </Link>

                  <Link
                    href="/notices/latest"
                    style={{
                      textDecoration: "none",
                      padding: "14px 28px",
                      borderRadius: "14px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "white",
                      fontWeight: 700,
                    }}
                  >
                    查看最新公告
                  </Link>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gap: "18px" }}>
              {section.stats ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "16px",
                  }}
                >
                  {section.stats.map((stat, i) => (
                    <div
                      key={i}
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(24,24,32,0.98) 0%, rgba(14,14,20,0.98) 100%)",
                        border: "1px solid rgba(124,58,237,0.2)",
                        borderRadius: "20px",
                        padding: "24px 18px",
                        boxShadow: "0 12px 26px rgba(0,0,0,0.25)",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "34px",
                          fontWeight: 800,
                          color: "#d8b4fe",
                          marginBottom: "8px",
                        }}
                      >
                        {stat.value}
                      </div>
                      <div style={{ fontSize: "14px", color: "#a8a8b7" }}>
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(24,24,32,0.98) 0%, rgba(14,14,20,0.98) 100%)",
                    border: "1px solid rgba(124,58,237,0.2)",
                    borderRadius: "28px",
                    padding: "34px",
                    boxShadow: "0 18px 30px rgba(0,0,0,0.28)",
                    minHeight: "320px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: "18px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "22px",
                      color: "#ffffff",
                      fontWeight: 800,
                    }}
                  >
                    核心价值
                  </div>

                  <div style={{ display: "grid", gap: "14px" }}>
                    {[
                      "清晰易懂的参与结构",
                      "成果持续累计的运营方式",
                      "面向长期参与的成长设计",
                      "公告与政策实时联动",
                    ].map((item) => (
                      <div
                        key={item}
                        style={{
                          padding: "14px 16px",
                          borderRadius: "16px",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.05)",
                          color: "#d8d8de",
                          fontSize: "15px",
                        }}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div
                style={{
                  background:
                    "linear-gradient(180deg, rgba(18,18,26,0.98) 0%, rgba(10,10,14,0.98) 100%)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "24px",
                  padding: "24px",
                  boxShadow: "0 12px 26px rgba(0,0,0,0.22)",
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    color: "#a78bfa",
                    letterSpacing: "0.16em",
                    marginBottom: "10px",
                  }}
                >
                  SECTION {String(index + 1).padStart(2, "0")}
                </div>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: 800,
                    color: "white",
                    marginBottom: "10px",
                  }}
                >
                  {section.title}
                </div>
                <div
                  style={{
                    color: "#aeb0bc",
                    lineHeight: 1.7,
                    fontSize: "15px",
                  }}
                >
                  {section.eyebrow}
                </div>
              </div>
            </div>
          </div>

          {index !== sections.length - 1 && (
            <div
              style={{
                position: "absolute",
                bottom: "28px",
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                color: "#bba7eb",
                fontSize: "12px",
                letterSpacing: "0.2em",
                opacity: 0.9,
              }}
            >
              <span>向下滚动</span>
              <div
                style={{
                  width: "2px",
                  height: "34px",
                  borderRadius: "999px",
                  background: "rgba(255,255,255,0.18)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "12px",
                    borderRadius: "999px",
                    background: "linear-gradient(180deg, #c084fc, #7c3aed)",
                    position: "absolute",
                    top: 0,
                    animation: "partnerScrollMove 1.6s ease-in-out infinite",
                  }}
                />
              </div>
            </div>
          )}
        </section>
      ))}

      <style jsx>{`
        @keyframes partnerScrollMove {
          0% {
            top: 0;
            opacity: 0.2;
          }
          50% {
            top: 11px;
            opacity: 1;
          }
          100% {
            top: 22px;
            opacity: 0.2;
          }
        }

        @media (max-width: 1024px) {
          section > div:last-child > div {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
