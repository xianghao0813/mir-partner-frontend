"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Section = {
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  stats: { label: string; value: string }[];
  cta?: boolean;
};

const sections: Section[] = [
  {
    eyebrow: "OPEN GROWTH PROJECT",
    title: "面向所有玩家的长期成长计划",
    description:
      "这是一个更容易参与、更容易理解，也更适合长期陪伴玩家的成长项目。用户不需要研究复杂门槛或结算规则，只要持续参与官网活动、完成充值或游戏相关行为，就可以累积积分，逐步解锁更多优惠券、活动资格与专属权益。\n\n新版官网希望成为玩家与游戏长期连接的入口，让每一次参与都被记录，每一次成长都能转化为看得见的福利。",
    stats: [
      { label: "参与门槛", value: "低" },
      { label: "核心方式", value: "积分" },
      { label: "长期目标", value: "陪伴" },
    ],
    points: [
      "不强调复杂关系或额外门槛，普通玩家也能直接参与。",
      "通过积分获得优惠券、活动资格与更多充值折扣机会。",
      "长期沉淀用户成长记录，为后续更多 Wemade 游戏内容提供统一入口。",
    ],
    cta: true,
  },
  {
    eyebrow: "POINT RULES",
    title: "积分规则与成长目标",
    description:
      "积分是新版体系的核心成长指标。用户可以通过本人充值、签到、活动、小游戏与后续成就任务获得积分；同时，补签、月度未达成保级要求等情况可能产生积分消耗或调整。\n\n积分的目标不是制造复杂计算，而是让用户清楚知道自己为什么成长、距离下一阶段还差多少，以及可以获得哪些实际优惠。",
    stats: [
      { label: "累计方式", value: "本人行为" },
      { label: "统计周期", value: "每月" },
      { label: "成长结果", value: "星级" },
    ],
    points: [
      "充值、签到、小游戏和活动奖励都会形成可追踪的积分记录。",
      "星级根据积分成长判断，并影响可领取的优惠券权益。",
      "补签会消耗积分；月度保级与调整规则会在页面和公告中明确展示。",
    ],
  },
  {
    eyebrow: "DAILY EVENTS",
    title: "签到、小游戏与全民参与活动",
    description:
      "新版官网会持续推出轻量活动，让用户即使不进行大额充值，也可以通过日常参与获得积分。每日签到、补签、连续签到奖励、小游戏挑战和限时活动，会让更多玩家以低门槛方式参与进来。\n\n这个项目不只面向少数高消费用户，也希望成为所有玩家都能参与、都能累积、都能获得回馈的全民型活动平台。",
    stats: [
      { label: "每日入口", value: "签到" },
      { label: "轻量玩法", value: "小游戏" },
      { label: "参与范围", value: "全员" },
    ],
    points: [
      "每日签到可获得积分，并用月历记录参与情况。",
      "小游戏提供额外积分奖励，让活动参与更轻松。",
      "未来可扩展节日活动、限时任务、游戏联动与品牌活动。",
    ],
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
    <div ref={containerRef} className="hide-scrollbar" style={pageStyle}>
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

            <div style={panelStyle}>
              <p style={panelEyebrowStyle}>SECTION {String(index + 1).padStart(2, "0")}</p>
              <h2 style={panelTitleStyle}>{section.title}</h2>
              <div style={statsStyle}>
                {section.stats.map((stat) => (
                  <div key={stat.label} style={statStyle}>
                    <strong style={statValueStyle}>{stat.value}</strong>
                    <span style={statLabelStyle}>{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
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

      <style jsx>{`
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

        @media (max-width: 920px) {
          section > div {
            grid-template-columns: 1fr !important;
            padding: 32px 24px !important;
            gap: 24px !important;
          }

          h1 {
            font-size: 36px !important;
          }
        }
      `}</style>
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
  background:
    "linear-gradient(180deg, rgba(5,5,8,0.54), rgba(7,7,12,0.82)), url('/login-bg.png') center/cover fixed",
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
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "radial-gradient(circle at top, rgba(124,58,237,0.13), rgba(7,7,12,0.08) 48%, rgba(4,4,8,0.28))",
};

const contentGridStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "1220px",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.15fr) minmax(300px, 0.85fr)",
  gap: "44px",
  alignItems: "center",
  padding: "56px",
  boxSizing: "border-box",
};

const textColumnStyle: React.CSSProperties = {
  maxWidth: "760px",
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
  fontSize: "58px",
  lineHeight: 1.12,
  fontWeight: 950,
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

const panelStyle: React.CSSProperties = {
  padding: "30px",
  borderRadius: "22px",
  background: "rgba(15,15,22,0.88)",
  border: "1px solid rgba(196,181,253,0.16)",
  boxShadow: "0 18px 36px rgba(0,0,0,0.28)",
};

const panelEyebrowStyle: React.CSSProperties = {
  margin: "0 0 10px",
  color: "#a78bfa",
  fontSize: "12px",
  letterSpacing: "0.16em",
  fontWeight: 900,
};

const panelTitleStyle: React.CSSProperties = {
  margin: "0 0 24px",
  fontSize: "24px",
};

const statsStyle: React.CSSProperties = {
  display: "grid",
  gap: "12px",
};

const statStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "14px",
  padding: "16px 18px",
  borderRadius: "14px",
  background: "rgba(255,255,255,0.045)",
};

const statValueStyle: React.CSSProperties = {
  color: "#ddd6fe",
  fontSize: "24px",
};

const statLabelStyle: React.CSSProperties = {
  color: "#bbb6cc",
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
