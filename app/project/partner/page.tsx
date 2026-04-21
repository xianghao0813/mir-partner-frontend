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
    title: "MIR 파트너 프로그램",
    description:
      "MIR Partner는 유저, 커뮤니티, 운영팀을 하나의 성장 구조로 연결하는 프로그램입니다.\n참여자는 단순 소비자가 아니라 생태계에 기여하고 성과를 축적하는 파트너로 확장됩니다.",
    points: [
      "가입 이후 바로 프로그램 구조와 보상 흐름을 확인할 수 있습니다.",
      "활동 이력과 참여 성과가 누적되도록 설계되어 있습니다.",
      "개인 참여에서 팀 확장까지 자연스럽게 이어지는 구조를 제공합니다.",
    ],
  },
  {
    id: "points",
    eyebrow: "POINT SYSTEM",
    title: "포인트 기반 성장 구조",
    description:
      "포인트는 프로그램 내 활동 성과를 측정하는 핵심 지표입니다.\n공지 확인, 이벤트 참여, 게임 활동, 커뮤니티 기여 같은 행동을 기준으로 축적되며, 이후 등급과 권한의 기준이 됩니다.",
    stats: [
      { label: "핵심 지표", value: "포인트" },
      { label: "기본 흐름", value: "4단계" },
      { label: "집계 주기", value: "매월" },
    ],
    points: [
      "포인트가 높을수록 상위 권한과 추가 혜택을 받을 수 있습니다.",
      "월 단위 평가를 통해 승급과 유지 기준이 명확하게 적용됩니다.",
      "단기 이벤트보다 장기 활동을 유도하는 구조에 가깝습니다.",
    ],
  },
  {
    id: "team",
    eyebrow: "TEAM GROWTH",
    title: "팀 단위 확장",
    description:
      "개인 단위 참여에 그치지 않고 추천과 협업을 통해 팀을 확장할 수 있습니다.\n팀 활동은 파트너의 장기 성장을 강화하는 핵심 축으로 설계되어 있습니다.",
    stats: [
      { label: "권장 팀 규모", value: "최대 50" },
      { label: "관계 깊이", value: "3단계" },
      { label: "보조 기여율", value: "10%" },
    ],
    points: [
      "하위 팀원의 활동이 전체 성장 지표에 기여할 수 있습니다.",
      "추천 구조는 과도한 확장이 아니라 지속 가능한 운영을 전제로 합니다.",
      "팀 관리와 개인 활동이 분리되지 않도록 하나의 흐름으로 묶여 있습니다.",
    ],
  },
  {
    id: "rules",
    eyebrow: "RULES & STABILITY",
    title: "투명한 운영 기준",
    description:
      "프로그램은 명확한 기준과 공개 가능한 운영 원칙 위에서 움직입니다.\n지표 산정, 승급 기준, 제한 정책이 구조적으로 정리되어 있어 운영 안정성을 확보하는 데 초점을 둡니다.",
    points: [
      "활동 기준과 등급 조건이 문서화되어 혼선을 줄입니다.",
      "비정상 활동은 제재 기준에 따라 단계적으로 처리됩니다.",
      "변경 사항은 공지 영역을 통해 추적할 수 있도록 연결됩니다.",
    ],
    stats: [
      { label: "운영 주기", value: "월 단위" },
      { label: "승급 처리", value: "정기 반영" },
      { label: "정책 적용", value: "일관성 유지" },
    ],
  },
  {
    id: "benefits",
    eyebrow: "BENEFITS & UPGRADE",
    title: "참여자에서 핵심 파트너로",
    description:
      "등급이 올라갈수록 개인 링크, 운영 지원, 공동 기획 기회 등 실질적 혜택이 늘어납니다.\n프로그램은 단순한 보상보다는 장기적으로 함께 일할 수 있는 협업 채널을 만드는 데 목적이 있습니다.",
    points: [
      "전용 안내 링크와 운영 가이드를 제공합니다.",
      "이벤트 참여와 공동 기획 기회가 단계적으로 열립니다.",
      "공지와 프로그램 문서를 통해 최신 정책을 바로 확인할 수 있습니다.",
      "우수 참여자는 별도 협업 제안 대상으로 확장될 수 있습니다.",
    ],
    cta: true,
  },
];

export default function PartnerPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let isAnimating = false;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (isAnimating) return;

      const direction = e.deltaY > 0 ? 1 : -1;
      const nextIndex = Math.min(
        sections.length - 1,
        Math.max(0, currentIndex + direction)
      );

      if (nextIndex === currentIndex) return;

      isAnimating = true;
      setCurrentIndex(nextIndex);

      el.scrollTo({
        top: nextIndex * window.innerHeight,
        behavior: "smooth",
      });

      setTimeout(() => {
        isAnimating = false;
      }, 750);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnimating) return;
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;

      const direction = e.key === "ArrowDown" ? 1 : -1;
      const nextIndex = Math.min(
        sections.length - 1,
        Math.max(0, currentIndex + direction)
      );

      if (nextIndex === currentIndex) return;

      isAnimating = true;
      setCurrentIndex(nextIndex);

      el.scrollTo({
        top: nextIndex * window.innerHeight,
        behavior: "smooth",
      });

      setTimeout(() => {
        isAnimating = false;
      }, 750);
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      el.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentIndex]);

  function goToSection(index: number) {
    const el = containerRef.current;
    if (!el) return;

    setCurrentIndex(index);
    el.scrollTo({
      top: index * window.innerHeight,
      behavior: "smooth",
    });
  }

  return (
    <div
      ref={containerRef}
      className="hide-scrollbar"
      style={{
        height: "calc(100vh - 81px)",
        overflowY: "auto",
        scrollBehavior: "smooth",
        margin: "-40px",
        width: "calc(100% + 80px)",
        backgroundColor: "#050507",
      }}
    >
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
          style={{
            minHeight: "calc(100vh - 81px)",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            background:
              "radial-gradient(circle at top, rgba(124,58,237,0.18) 0%, rgba(12,12,18,1) 35%, rgba(5,5,7,1) 100%)",
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
                    파트너 참여하기
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
                    최신 공지 보기
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
                    핵심 가치
                  </div>

                  <div style={{ display: "grid", gap: "14px" }}>
                    {[
                      "누구나 이해하기 쉬운 구조",
                      "성과가 누적되는 운영 방식",
                      "장기 참여를 전제로 한 설계",
                      "공지와 정책이 바로 연결되는 흐름",
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
              <span>SCROLL</span>
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
