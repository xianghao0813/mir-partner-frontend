"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Section = {
  eyebrow: string;
  title: string;
  description: string;
  stats?: { label: string; value: string }[];
  points: string[];
};

const sections: Section[] = [
  {
    eyebrow: "MIR PARTNER PROGRAM",
    title: "MIR 合伙人计划",
    description:
      "新版合伙人计划以本人行为为核心，围绕积分、星级、优惠券、签到和小游戏建立长期成长体系。原官网保留充值入口，新版官网承接合伙人权益、活动和账号服务。",
    stats: [
      { label: "成长核心", value: "积分" },
      { label: "主要权益", value: "优惠券" },
      { label: "关系模式", value: "个人" },
    ],
    points: [
      "取消复杂团队关系和三代返利规则。",
      "用户通过本人充值、签到、小游戏和活动获得积分。",
      "积分、星级、优惠券与钱包信息统一在新版官网展示。",
    ],
  },
  {
    eyebrow: "POINT SYSTEM",
    title: "积分与星级成长",
    description:
      "积分是判断用户成长和星级权益的核心指标。系统按月统计积分变化，并根据规则判断升级、保级或调整。",
    stats: [
      { label: "星级体系", value: "8级" },
      { label: "统计周期", value: "每月" },
      { label: "保级规则", value: "按积分" },
    ],
    points: [
      "已导入用户的最终积分会作为新版官网起始积分。",
      "未导入用户可根据历史充值记录自动计算积分。",
      "导入时间之后的新充值和活动记录会按新版规则继续累计。",
    ],
  },
  {
    eyebrow: "COUPON BENEFITS",
    title: "星级优惠券权益",
    description:
      "新版体系保留星级概念，但取消云币返利和现金返利。用户达到不同星级后，可领取对应额度和数量的充值优惠券。",
    stats: [
      { label: "云币返利", value: "取消" },
      { label: "现金返利", value: "取消" },
      { label: "替代权益", value: "优惠券" },
    ],
    points: [
      "优惠券可用于新版官网云币充值抵扣。",
      "星级越高，可领取的优惠券数量和优惠力度越高。",
      "优惠券状态会清晰区分未使用、已使用和已过期。",
    ],
  },
  {
    eyebrow: "DAILY ACTIVITY",
    title: "签到与小游戏",
    description:
      "新版官网将通过日常活动提升用户回访和参与度。签到、补签、连续签到奖励与小游戏奖励都可以帮助用户获得积分。",
    stats: [
      { label: "签到统计", value: "按月" },
      { label: "补签方式", value: "积分" },
      { label: "小游戏", value: "积分奖励" },
    ],
    points: [
      "每日签到可获得积分，并在月历中展示签到记录。",
      "漏签后可通过补签修复连续签到。",
      "小游戏提供额外积分奖励，并配合风控防止异常操作。",
    ],
  },
  {
    eyebrow: "RULES & SAFETY",
    title: "清晰稳定的运营规则",
    description:
      "新版体系减少复杂计算，让用户更容易理解自己的积分来源、星级变化和可领取权益，同时通过风控能力保护支付与优惠券流程。",
    stats: [
      { label: "异常价格", value: "检测" },
      { label: "重复支付", value: "防护" },
      { label: "异常账号", value: "冻结" },
    ],
    points: [
      "用户仅通过本人充值、活动和成就累计积分。",
      "异常价格、异常优惠券使用和高频支付会被识别。",
      "重要规则调整会通过公告同步，便于用户追踪最新变化。",
    ],
  },
  {
    eyebrow: "BRAND PORTAL",
    title: "长期用户与品牌入口",
    description:
      "新版官网不仅是合伙人中心，也将逐步承担 Wemade 游戏品牌页的角色，用于展示项目、活动、权益、客服与长期用户服务。",
    stats: [
      { label: "用户关系", value: "长期" },
      { label: "品牌内容", value: "统一" },
      { label: "活动入口", value: "集中" },
    ],
    points: [
      "从单一游戏用户运营升级为长期用户资产运营。",
      "持续活动引导用户回访并参与游戏内容。",
      "后续可承载更多 Wemade 游戏资讯和活动入口。",
    ],
  },
];

export default function PartnerPage() {
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

  return (
    <main className="hide-scrollbar" style={pageStyle}>
      <section style={heroStyle}>
        <p style={eyebrowStyle}>PARTNER CENTER</p>
        <h1 style={heroTitleStyle}>从充值用户到长期合伙人</h1>
        <p style={heroDescStyle}>
          新版合伙人官网将合伙人身份、积分成长、星级优惠券、签到活动、小游戏和钱包服务集中到同一入口。
        </p>
        <div style={heroActionsStyle}>
          <Link href={isLoggedIn ? "/profile" : "/signup"} style={primaryButtonStyle}>
            {isLoggedIn ? "进入合伙人中心" : "立即加入合伙人计划"}
          </Link>
          <Link href="/profile/points-activity" style={secondaryButtonStyle}>
            查看积分活动
          </Link>
        </div>
      </section>

      <section style={sectionGridStyle}>
        {sections.map((section) => (
          <article key={section.title} style={sectionCardStyle}>
            <div>
              <p style={cardEyebrowStyle}>{section.eyebrow}</p>
              <h2 style={cardTitleStyle}>{section.title}</h2>
              <p style={cardDescStyle}>{section.description}</p>
            </div>

            {section.stats && (
              <div style={statsGridStyle}>
                {section.stats.map((stat) => (
                  <div key={`${section.title}-${stat.label}`} style={statStyle}>
                    <strong style={statValueStyle}>{stat.value}</strong>
                    <span style={statLabelStyle}>{stat.label}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={pointListStyle}>
              {section.points.map((point) => (
                <div key={point} style={pointStyle}>
                  <span style={dotStyle} />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "calc(100vh - 81px)",
  overflowY: "auto",
  margin: "-40px",
  width: "calc(100% + 80px)",
  padding: "64px 40px",
  boxSizing: "border-box",
  color: "#f8fafc",
  background:
    "linear-gradient(180deg, rgba(5,5,8,0.70), rgba(7,7,12,0.96)), url('/login-bg.png') center/cover fixed",
};

const heroStyle: React.CSSProperties = {
  maxWidth: "1050px",
  margin: "0 auto 36px",
  textAlign: "center",
};

const eyebrowStyle: React.CSSProperties = {
  margin: "0 0 14px",
  color: "#c4b5fd",
  fontSize: "13px",
  letterSpacing: "0.18em",
  fontWeight: 900,
};

const heroTitleStyle: React.CSSProperties = {
  margin: "0 0 18px",
  fontSize: "52px",
  lineHeight: 1.12,
  fontWeight: 950,
};

const heroDescStyle: React.CSSProperties = {
  maxWidth: "820px",
  margin: "0 auto",
  color: "#d8d5e5",
  fontSize: "19px",
  lineHeight: 1.85,
};

const heroActionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  flexWrap: "wrap",
  gap: "14px",
  marginTop: "28px",
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "14px 24px",
  borderRadius: "12px",
  textDecoration: "none",
  color: "white",
  background: "linear-gradient(90deg, #7c3aed, #a855f7)",
  fontWeight: 900,
};

const secondaryButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.14)",
};

const sectionGridStyle: React.CSSProperties = {
  maxWidth: "1180px",
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "18px",
};

const sectionCardStyle: React.CSSProperties = {
  display: "grid",
  gap: "22px",
  alignContent: "start",
  padding: "28px",
  borderRadius: "18px",
  background: "rgba(17,17,24,0.90)",
  border: "1px solid rgba(196,181,253,0.16)",
  boxShadow: "0 18px 32px rgba(0,0,0,0.24)",
};

const cardEyebrowStyle: React.CSSProperties = {
  margin: "0 0 10px",
  color: "#a78bfa",
  fontSize: "12px",
  letterSpacing: "0.16em",
  fontWeight: 900,
};

const cardTitleStyle: React.CSSProperties = {
  margin: "0 0 12px",
  fontSize: "26px",
};

const cardDescStyle: React.CSSProperties = {
  margin: 0,
  color: "#d4d1df",
  lineHeight: 1.75,
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "10px",
};

const statStyle: React.CSSProperties = {
  display: "grid",
  gap: "6px",
  textAlign: "center",
  padding: "14px 10px",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.045)",
};

const statValueStyle: React.CSSProperties = {
  color: "#ddd6fe",
  fontSize: "20px",
};

const statLabelStyle: React.CSSProperties = {
  color: "#aaa6bb",
  fontSize: "12px",
};

const pointListStyle: React.CSSProperties = {
  display: "grid",
  gap: "10px",
};

const pointStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  alignItems: "flex-start",
  color: "#eeecf6",
  lineHeight: 1.65,
};

const dotStyle: React.CSSProperties = {
  width: "8px",
  height: "8px",
  marginTop: "9px",
  borderRadius: "999px",
  flexShrink: 0,
  background: "#a78bfa",
};
