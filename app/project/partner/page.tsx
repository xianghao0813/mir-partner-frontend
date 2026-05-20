"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Section = {
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  visual: "growth" | "coupon" | "events";
  cta?: boolean;
};

const sections: Section[] = [
  {
    eyebrow: "OPEN GROWTH PROJECT",
    title: "面向所有玩家的长期成长计划",
    description:
      "这是一个更容易参与、更容易理解，也更适合长期陪伴玩家的成长项目。用户不需要研究复杂门槛或结算规则，只要持续参与官网活动、完成充值或游戏相关行为，就可以累积积分，逐步解锁更多优惠券、活动资格与专属权益。\n\n新版官网希望成为玩家与娱美德游戏长期连接的入口，让每一次参与都被记录，每一次成长都能转化为看得见的福利。",
    points: [
      "降低参与门槛，让普通玩家也能直接进入成长体系。",
      "通过积分获得优惠券、活动资格与更多充值折扣机会。",
      "长期沉淀用户成长记录，为后续更多娱美德游戏内容提供统一入口。",
    ],
    visual: "growth",
    cta: true,
  },
  {
    eyebrow: "POINT RULES",
    title: "积分规则与成长目标",
    description:
      "积分是新版体系的核心成长指标。用户可以通过本人充值、签到、活动、小游戏与后续成就任务获得积分；同时，补签、月度未达成保级要求等情况可能产生积分消耗或调整。\n\n积分的目标不是制造复杂计算，而是让用户清楚知道自己为什么成长、距离下一阶段还差多少，以及可以获得哪些实际优惠。",
    points: [
      "充值、签到、小游戏和活动奖励都会形成可追踪的积分记录。",
      "星级根据积分成长判断，并影响可领取的优惠券权益。",
      "补签会消耗积分；月度保级与调整规则会在页面和公告中明确展示。",
    ],
    visual: "coupon",
  },
  {
    eyebrow: "DAILY EVENTS",
    title: "签到、小游戏与全民参与活动",
    description:
      "新版官网会持续推出轻量活动，让用户即使不进行大额充值，也可以通过日常参与获得积分。每日签到、补签、连续签到奖励、小游戏挑战和限时活动，会让更多玩家以低门槛方式参与进来。\n\n这个项目不只面向少数高消费用户，也希望成为所有玩家都能参与、都能累积、都能获得回馈的全民型活动平台。",
    points: [
      "每日签到可获得积分，并用月历记录参与情况。",
      "小游戏提供额外积分奖励，让活动参与更轻松。",
      "未来可扩展节日活动、限时任务、游戏联动与品牌活动。",
    ],
    visual: "events",
    cta: true,
  },
];

export default function PartnerPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentIndexRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function loadSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (active) {
        setIsLoggedIn(Boolean(user));
      }
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user));
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const getSectionTop = (index: number) => {
      const section = el.querySelector<HTMLElement>(`[data-section-index="${index}"]`);
      return section?.offsetTop ?? index * el.clientHeight;
    };

    const scrollToSection = (index: number, behavior: ScrollBehavior = "smooth") => {
      currentIndexRef.current = index;
      setCurrentIndex(index);
      el.scrollTo({ top: getSectionTop(index), behavior });
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (isAnimatingRef.current || Math.abs(event.deltaY) < 8) return;

      const direction = event.deltaY > 0 ? 1 : -1;
      const nextIndex = Math.min(sections.length - 1, Math.max(0, currentIndexRef.current + direction));
      if (nextIndex === currentIndexRef.current) return;

      isAnimatingRef.current = true;
      scrollToSection(nextIndex);
      window.setTimeout(() => {
        isAnimatingRef.current = false;
        scrollToSection(currentIndexRef.current, "auto");
      }, 850);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isAnimatingRef.current || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) return;

      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = Math.min(sections.length - 1, Math.max(0, currentIndexRef.current + direction));
      if (nextIndex === currentIndexRef.current) return;

      isAnimatingRef.current = true;
      scrollToSection(nextIndex);
      window.setTimeout(() => {
        isAnimatingRef.current = false;
        scrollToSection(currentIndexRef.current, "auto");
      }, 850);
    };

    const handleScroll = () => {
      if (isAnimatingRef.current) return;
      const nextIndex = Math.round(el.scrollTop / Math.max(1, el.clientHeight));
      const bounded = Math.min(sections.length - 1, Math.max(0, nextIndex));
      currentIndexRef.current = bounded;
      setCurrentIndex(bounded);
    };

    const handleResize = () => {
      scrollToSection(currentIndexRef.current, "auto");
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("scroll", handleScroll);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  function goToSection(index: number) {
    const el = containerRef.current;
    if (!el) return;
    const section = el.querySelector<HTMLElement>(`[data-section-index="${index}"]`);
    currentIndexRef.current = index;
    setCurrentIndex(index);
    el.scrollTo({ top: section?.offsetTop ?? index * el.clientHeight, behavior: "smooth" });
  }

  return (
    <div ref={containerRef} className="partner-project-page hide-scrollbar" style={pageStyle}>
      <div className="auth-bg" style={{ position: "fixed" }} />
      <div className="auth-overlay" style={{ position: "fixed" }} />
      <div className="partner-project-light" />

      <div style={indicatorStyle}>
        {sections.map((section, index) => (
          <button
            key={section.title}
            type="button"
            onClick={() => goToSection(index)}
            aria-label={section.title}
            style={dotButtonStyle(currentIndex === index)}
          />
        ))}
      </div>

      {sections.map((section, index) => (
        <section key={section.title} data-section-index={index} style={sectionStyle}>
          <div style={contentGridStyle}>
            <div style={textColumnStyle}>
              <p style={eyebrowStyle}>{section.eyebrow}</p>
              <h1 style={titleStyle}>{section.title}</h1>
              <p style={descriptionStyle}>{section.description}</p>

              <div style={pointsStyle}>
                {section.points.map((point) => (
                  <div key={point} style={pointStyle}>
                    <span style={pointDotStyle} />
                    <span>{point}</span>
                  </div>
                ))}
              </div>

              {section.cta && (
                <div style={actionsStyle}>
                  <Link href={isLoggedIn ? "/profile" : "/signup"} style={primaryButtonStyle}>
                    {isLoggedIn ? "进入个人中心" : "立即参与"}
                  </Link>
                  <Link href="/profile/points-activity" style={secondaryButtonStyle}>
                    查看积分活动
                  </Link>
                </div>
              )}
            </div>

            <div style={visualShellStyle}>{renderVisual(section.visual)}</div>
          </div>

          {index < sections.length - 1 && (
            <div style={scrollHintStyle}>
              <span>向下滚动</span>
              <span style={scrollLineStyle}>
                <span style={scrollLineInnerStyle} />
              </span>
            </div>
          )}
        </section>
      ))}

      <style jsx global>{`
        .partner-project-light {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at 20% 24%, rgba(192, 132, 252, 0.22), transparent 26%),
            radial-gradient(circle at 82% 58%, rgba(34, 211, 238, 0.16), transparent 30%);
          animation: partnerLightMove 13s ease-in-out infinite alternate;
          z-index: 0;
        }

        .growth-visual,
        .coupon-visual,
        .events-visual {
          position: relative;
          width: min(440px, 100%);
          min-height: 380px;
          margin: 0 auto;
        }

        .growth-line {
          position: absolute;
          left: 42px;
          right: 24px;
          bottom: 95px;
          height: 190px;
        }

        .growth-line::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, transparent 0 18%, #22d3ee 18% 21%, transparent 21% 39%, #a78bfa 39% 42%, transparent 42% 62%, #facc15 62% 65%, transparent 65%);
          filter: drop-shadow(0 0 18px rgba(34, 211, 238, 0.55));
          animation: linePulse 2.8s ease-in-out infinite;
        }

        .growth-bar {
          position: absolute;
          bottom: 58px;
          width: 44px;
          border-radius: 14px 14px 6px 6px;
          background: linear-gradient(180deg, rgba(250, 204, 21, 0.92), rgba(124, 58, 237, 0.9));
          box-shadow: 0 18px 44px rgba(124, 58, 237, 0.28);
          animation: barRise 2.9s ease-in-out infinite;
        }

        .growth-bar.bar-one {
          left: 46px;
          height: 74px;
          animation-delay: 0s;
        }

        .growth-bar.bar-two {
          left: 122px;
          height: 118px;
          animation-delay: 0.18s;
        }

        .growth-bar.bar-three {
          left: 198px;
          height: 160px;
          animation-delay: 0.36s;
        }

        .growth-bar.bar-four {
          left: 274px;
          height: 218px;
          animation-delay: 0.54s;
        }

        .point-orb {
          position: absolute;
          display: grid;
          place-items: center;
          width: 74px;
          height: 74px;
          border-radius: 999px;
          color: #1e1038;
          font-weight: 950;
          background: radial-gradient(circle at 35% 30%, #fff7b8, #facc15 48%, #b45309);
          box-shadow: 0 0 34px rgba(250, 204, 21, 0.44);
          animation: orbFloat 4s ease-in-out infinite;
        }

        .point-orb.one {
          right: 16px;
          top: 18px;
        }

        .point-orb.two {
          left: 28px;
          top: 72px;
          width: 56px;
          height: 56px;
          animation-delay: 0.8s;
        }

        .coupon-track {
          position: absolute;
          left: 50%;
          top: 46px;
          width: 4px;
          height: 265px;
          transform: translateX(-50%);
          border-radius: 999px;
          background: linear-gradient(180deg, #7c3aed, #c084fc, #facc15);
          box-shadow: 0 0 26px rgba(192, 132, 252, 0.42);
        }

        .rank-star {
          position: absolute;
          left: 50%;
          display: grid;
          place-items: center;
          width: 72px;
          height: 72px;
          transform: translateX(-50%);
          border-radius: 24px;
          color: #fff8db;
          font-size: 28px;
          font-weight: 950;
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.92), rgba(192, 132, 252, 0.72));
          border: 1px solid rgba(255, 255, 255, 0.24);
          box-shadow: 0 18px 42px rgba(124, 58, 237, 0.34);
          animation: rankPop 3.4s ease-in-out infinite;
        }

        .rank-star.one {
          top: 42px;
        }

        .rank-star.two {
          top: 140px;
          animation-delay: 0.34s;
        }

        .rank-star.three {
          top: 238px;
          animation-delay: 0.68s;
        }

        .coupon-ticket {
          position: absolute;
          right: 18px;
          top: 128px;
          width: 168px;
          padding: 20px 18px;
          border-radius: 22px;
          color: #fff7ed;
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.96), rgba(124, 58, 237, 0.92));
          box-shadow: 0 22px 46px rgba(245, 158, 11, 0.22);
          animation: ticketFloat 3.8s ease-in-out infinite;
        }

        .coupon-ticket strong {
          display: block;
          font-size: 30px;
          margin-bottom: 8px;
        }

        .calendar-card {
          position: absolute;
          left: 10px;
          top: 38px;
          width: 235px;
          padding: 18px;
          border-radius: 26px;
          background: rgba(15, 23, 42, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 24px 54px rgba(0, 0, 0, 0.28);
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          margin-top: 18px;
        }

        .calendar-day {
          height: 34px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.08);
        }

        .calendar-day.checked {
          background: linear-gradient(135deg, #22d3ee, #a78bfa);
          box-shadow: 0 0 18px rgba(34, 211, 238, 0.32);
          animation: stampPop 2.8s ease-in-out infinite;
        }

        .mini-game {
          position: absolute;
          right: 22px;
          bottom: 58px;
          width: 190px;
          padding: 18px;
          border-radius: 26px;
          background: linear-gradient(145deg, rgba(88, 28, 135, 0.88), rgba(14, 116, 144, 0.82));
          border: 1px solid rgba(255, 255, 255, 0.16);
          box-shadow: 0 24px 54px rgba(0, 0, 0, 0.28);
          animation: gameFloat 4.2s ease-in-out infinite;
        }

        .game-target {
          width: 84px;
          height: 84px;
          margin: 12px auto;
          border-radius: 999px;
          background: radial-gradient(circle at 50% 50%, #facc15 0 18%, #a78bfa 18% 42%, rgba(34, 211, 238, 0.8) 42% 64%, rgba(255, 255, 255, 0.18) 64%);
          box-shadow: 0 0 28px rgba(34, 211, 238, 0.4);
          animation: targetPulse 1.8s ease-in-out infinite;
        }

        .score-chip {
          position: absolute;
          right: 120px;
          top: 52px;
          padding: 10px 16px;
          border-radius: 999px;
          color: #1e1b4b;
          font-weight: 950;
          background: #facc15;
          box-shadow: 0 0 28px rgba(250, 204, 21, 0.38);
          animation: scoreFly 2.8s ease-in-out infinite;
        }

        @keyframes partnerLightMove {
          from {
            transform: translate3d(-1%, -1%, 0);
          }
          to {
            transform: translate3d(2%, 2%, 0);
          }
        }

        @keyframes scrollHintMove {
          0% {
            transform: translateY(0);
            opacity: 0.25;
          }
          50% {
            transform: translateY(11px);
            opacity: 1;
          }
          100% {
            transform: translateY(22px);
            opacity: 0.25;
          }
        }

        @keyframes barRise {
          0%,
          100% {
            transform: scaleY(0.86);
            transform-origin: bottom;
          }
          50% {
            transform: scaleY(1.05);
            transform-origin: bottom;
          }
        }

        @keyframes linePulse {
          0%,
          100% {
            opacity: 0.54;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes orbFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-18px);
          }
        }

        @keyframes rankPop {
          0%,
          100% {
            transform: translateX(-50%) scale(0.94);
          }
          50% {
            transform: translateX(-50%) scale(1.08);
          }
        }

        @keyframes ticketFloat {
          0%,
          100% {
            transform: translateY(0) rotate(-4deg);
          }
          50% {
            transform: translateY(-14px) rotate(3deg);
          }
        }

        @keyframes stampPop {
          0%,
          70%,
          100% {
            transform: scale(1);
          }
          80% {
            transform: scale(1.18);
          }
        }

        @keyframes gameFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-16px);
          }
        }

        @keyframes targetPulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.08);
          }
        }

        @keyframes scoreFly {
          0%,
          100% {
            transform: translateY(0);
            opacity: 0.72;
          }
          50% {
            transform: translateY(-24px);
            opacity: 1;
          }
        }

        @media (max-width: 1040px) {
          .growth-visual,
          .coupon-visual,
          .events-visual {
            min-height: 300px;
            transform: scale(0.86);
            transform-origin: center;
          }
        }

        @media (max-width: 920px) {
          section > div {
            grid-template-columns: 1fr !important;
            padding: 32px 24px !important;
            gap: 20px !important;
          }

          h1 {
            font-size: 36px !important;
            white-space: normal !important;
          }
        }
      `}</style>
    </div>
  );
}

function renderVisual(type: Section["visual"]) {
  if (type === "growth") {
    return (
      <div className="growth-visual" aria-hidden="true">
        <div className="growth-line" />
        <div className="growth-bar bar-one" />
        <div className="growth-bar bar-two" />
        <div className="growth-bar bar-three" />
        <div className="growth-bar bar-four" />
        <div className="point-orb one">+P</div>
        <div className="point-orb two">UP</div>
      </div>
    );
  }

  if (type === "coupon") {
    return (
      <div className="coupon-visual" aria-hidden="true">
        <div className="coupon-track" />
        <div className="rank-star one">★1</div>
        <div className="rank-star two">★2</div>
        <div className="rank-star three">★3</div>
        <div className="coupon-ticket">
          <strong>券</strong>
          星级提升
          <br />
          优惠解锁
        </div>
      </div>
    );
  }

  return (
    <div className="events-visual" aria-hidden="true">
      <div className="calendar-card">
        <strong>签到月历</strong>
        <div className="calendar-grid">
          {Array.from({ length: 15 }).map((_, index) => (
            <span key={index} className={`calendar-day ${[1, 2, 4, 5, 8, 9, 13].includes(index) ? "checked" : ""}`} />
          ))}
        </div>
      </div>
      <div className="mini-game">
        <strong>小游戏挑战</strong>
        <div className="game-target" />
        <span>积分奖励</span>
      </div>
      <div className="score-chip">+100</div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  height: "calc(100vh - 81px)",
  overflowY: "auto",
  scrollSnapType: "y mandatory",
  scrollBehavior: "smooth",
  margin: "-40px",
  width: "calc(100% + 80px)",
  position: "relative",
  color: "#f8fafc",
  background: "#050508",
};

const indicatorStyle: React.CSSProperties = {
  position: "fixed",
  right: "28px",
  top: "50%",
  transform: "translateY(-50%)",
  zIndex: 30,
  display: "grid",
  gap: "12px",
};

const dotButtonStyle = (active: boolean): React.CSSProperties => ({
  width: active ? "30px" : "12px",
  height: "12px",
  borderRadius: "999px",
  border: "none",
  cursor: "pointer",
  background: active ? "linear-gradient(90deg, #7c3aed, #c084fc)" : "rgba(255,255,255,0.26)",
  boxShadow: active ? "0 0 18px rgba(124,58,237,0.5)" : "none",
  transition: "0.25s",
});

const sectionStyle: React.CSSProperties = {
  minHeight: "calc(100vh - 81px)",
  scrollSnapAlign: "start",
  position: "relative",
  zIndex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "radial-gradient(circle at top, rgba(124,58,237,0.13), rgba(7,7,12,0.08) 48%, rgba(4,4,8,0.28))",
};

const contentGridStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "1260px",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.12fr) minmax(360px, 0.88fr)",
  gap: "42px",
  alignItems: "center",
  padding: "56px",
  boxSizing: "border-box",
};

const textColumnStyle: React.CSSProperties = {
  maxWidth: "790px",
};

const eyebrowStyle: React.CSSProperties = {
  margin: "0 0 16px",
  color: "#d8b4fe",
  fontSize: "13px",
  letterSpacing: "0.18em",
  fontWeight: 900,
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 22px",
  fontSize: "50px",
  lineHeight: 1.12,
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const descriptionStyle: React.CSSProperties = {
  margin: "0 0 28px",
  color: "#d8d4e7",
  fontSize: "18px",
  lineHeight: 1.9,
  whiteSpace: "pre-line",
};

const pointsStyle: React.CSSProperties = {
  display: "grid",
  gap: "12px",
};

const pointStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  color: "#f2efff",
  fontSize: "16px",
  lineHeight: 1.65,
};

const pointDotStyle: React.CSSProperties = {
  width: "9px",
  height: "9px",
  borderRadius: "999px",
  marginTop: "8px",
  flexShrink: 0,
  background: "#c084fc",
  boxShadow: "0 0 12px rgba(192,132,252,0.55)",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "14px",
  marginTop: "30px",
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "14px 26px",
  borderRadius: "12px",
  textDecoration: "none",
  color: "white",
  background: "linear-gradient(90deg, #7c3aed, #a855f7)",
  fontWeight: 900,
  boxShadow: "0 14px 28px rgba(124,58,237,0.28)",
};

const secondaryButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.16)",
  boxShadow: "none",
};

const visualShellStyle: React.CSSProperties = {
  minHeight: "420px",
  display: "grid",
  placeItems: "center",
  position: "relative",
};

const scrollHintStyle: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  bottom: "24px",
  transform: "translateX(-50%)",
  display: "grid",
  justifyItems: "center",
  gap: "8px",
  color: "#c4b5fd",
  fontSize: "12px",
  letterSpacing: "0.18em",
};

const scrollLineStyle: React.CSSProperties = {
  width: "2px",
  height: "34px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.18)",
  overflow: "hidden",
};

const scrollLineInnerStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  height: "12px",
  borderRadius: "999px",
  background: "linear-gradient(180deg, #c084fc, #7c3aed)",
  animation: "scrollHintMove 1.6s ease-in-out infinite",
};
