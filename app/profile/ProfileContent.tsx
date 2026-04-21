"use client";

import { useState } from "react";
import BossSlashTrial from "@/components/BossSlashTrial";
import type { MirPartnerTier, PartnerProfileSummary } from "@/lib/partnerProfile";

type ProfileContentProps = {
  email: string;
  provider: string;
  quickSdkUsername: string;
  timeLeft?: unknown;
  profile: PartnerProfileSummary;
  tiers: MirPartnerTier[];
};

const tierBenefits = [
  {
    tierLabel: "米尔新星",
    benefitTitle: "初始合作身份",
    accent: "#94a3b8",
    points: ["生成合伙人编码", "开始累计官网与游戏内订单积分", "查看基础个人资料与成长进度"],
  },
  {
    tierLabel: "米尔一星",
    benefitTitle: "基础成长权益",
    accent: "#60a5fa",
    points: ["开放基础积分统计", "可追踪每月积分汇总", "获得标准活动参与资格"],
  },
  {
    tierLabel: "米尔二星",
    benefitTitle: "转化提升阶段",
    accent: "#22c55e",
    points: ["获得更清晰的订单归因能力", "优先同步充值与支付订单", "活动资源位优先级提升"],
  },
  {
    tierLabel: "米尔三星",
    benefitTitle: "活跃合作阶段",
    accent: "#14b8a6",
    points: ["开放更完整的积分明细视图", "获得阶段成长激励", "可参与重点合作活动"],
  },
  {
    tierLabel: "米尔四星",
    benefitTitle: "成熟合作身份",
    accent: "#f59e0b",
    points: ["更高权重的合作身份展示", "重点活动信息优先触达", "具备更稳定的资源支持预期"],
  },
  {
    tierLabel: "米尔五星",
    benefitTitle: "高阶合作权益",
    accent: "#fb7185",
    points: ["高价值订单贡献追踪", "成长加速档位支持", "重点项目合作机会提升"],
  },
  {
    tierLabel: "米尔六星",
    benefitTitle: "核心合作档位",
    accent: "#c084fc",
    points: ["高优先级合作识别", "大型活动合作优先", "更强品牌与转化能力展示"],
  },
  {
    tierLabel: "共创合伙人",
    benefitTitle: "最高等级共创权益",
    accent: "#facc15",
    points: ["最高等级身份标识", "优先参与共创型合作", "后续可扩展专属激励与荣誉展示"],
  },
];

const monthlyStatements = [
  {
    month: "2026-04",
    total: 1680,
    items: [
      { date: "04-04", source: "官网充值订单", orderNo: "WEB-240404-001", points: 320 },
      { date: "04-09", source: "游戏内支付订单", orderNo: "GAME-240409-117", points: 560 },
      { date: "04-16", source: "官网充值订单", orderNo: "WEB-240416-023", points: 240 },
      { date: "04-19", source: "游戏内支付订单", orderNo: "GAME-240419-088", points: 560 },
    ],
  },
  {
    month: "2026-03",
    total: 920,
    items: [
      { date: "03-03", source: "官网充值订单", orderNo: "WEB-240303-011", points: 180 },
      { date: "03-12", source: "游戏内支付订单", orderNo: "GAME-240312-041", points: 260 },
      { date: "03-21", source: "官网充值订单", orderNo: "WEB-240321-018", points: 220 },
      { date: "03-28", source: "游戏内支付订单", orderNo: "GAME-240328-067", points: 260 },
    ],
  },
  {
    month: "2026-02",
    total: 540,
    items: [
      { date: "02-06", source: "官网充值订单", orderNo: "WEB-240206-007", points: 120 },
      { date: "02-14", source: "游戏内支付订单", orderNo: "GAME-240214-033", points: 180 },
      { date: "02-20", source: "官网充值订单", orderNo: "WEB-240220-016", points: 110 },
      { date: "02-27", source: "游戏内支付订单", orderNo: "GAME-240227-054", points: 130 },
    ],
  },
];

export default function ProfileContent({
  email,
  provider,
  quickSdkUsername,
  timeLeft,
  profile,
  tiers,
}: ProfileContentProps) {
  const [benefitIndex, setBenefitIndex] = useState(0);
  const [statementIndex, setStatementIndex] = useState(0);
  const [currentPoints, setCurrentPoints] = useState(profile.points);

  const currentTier =
    [...tiers].reverse().find((tier) => currentPoints >= tier.minPoints) ?? tiers[0];
  const nextTier = tiers.find((tier) => tier.id === currentTier.id + 1) ?? null;
  const progressPercent = nextTier
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(((currentPoints - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100)
        )
      )
    : 100;
  const activeStatement = monthlyStatements[statementIndex];

  return (
    <main className="hide-scrollbar" style={pageStyle}>
      <div style={shellStyle}>
        <section style={heroStyle}>
          <div style={{ ...cardStyle, display: "grid", gap: "18px" }}>
            <span style={eyebrowStyle}>MIR Partner Account</span>
            <h1 style={titleStyle}>个人资料</h1>
            <p style={subtitleStyle}>
              这里集中展示账号身份、QuickSDK UID、合伙人编码，以及米尔积分与成长等级。
            </p>

            <div style={topOverviewGridStyle}>
              <article style={topCardStyle}>
                <div style={cardHeaderStyle}>
                  <h2 style={cardTitleStyle}>账号信息</h2>
                  <span style={badgeStyle}>{provider === "quicksdk" ? "QuickSDK" : "站内账号"}</span>
                </div>

                <div style={infoGridStyle}>
                  <InfoItem label="登录邮箱" value={email || "-"} />
                  <InfoItem
                    label="QuickSDK UID"
                    value={profile.uid || "QuickSDK 绑定后显示"}
                    accent={profile.uid ? "#f8fafc" : "#94a3b8"}
                    compact
                  />
                  <InfoItem
                    label="合伙人编码"
                    value={profile.partnerCode}
                    accent="#fde68a"
                    description="站内唯一身份编号，仅在官网体系内使用"
                    compact
                    highlight
                  />
                </div>

                {provider === "quicksdk" ? (
                  <div style={noticeStyle}>
                    <div style={noticeTitleStyle}>QuickSDK 同步状态</div>
                    <div style={noticeTextStyle}>
                      {quickSdkUsername
                        ? `已同步 QuickSDK 用户名：${quickSdkUsername}`
                        : "QuickSDK 用户名尚未同步。"}
                    </div>
                    <div style={noticeTextStyle}>
                      {typeof timeLeft === "number"
                        ? `防沉迷剩余时长：${timeLeft} 秒`
                        : "防沉迷剩余时长数据暂未提供。"}
                    </div>
                  </div>
                ) : (
                  <div style={noticeStyle}>
                    <div style={noticeTitleStyle}>UID 显示说明</div>
                    <div style={noticeTextStyle}>完成 QuickSDK 账号绑定后，这里会自动显示对应 UID。</div>
                  </div>
                )}
              </article>

              <article style={heroPanelStyle}>
                <div style={{ color: "#c4b5fd", fontSize: "13px", letterSpacing: "0.08em" }}>当前等级</div>
                <div style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800, color: currentTier.accent }}>
                  {currentTier.label}
                </div>
                <div style={{ color: "#e5e7eb", fontSize: "15px", lineHeight: 1.6 }}>{currentTier.description}</div>

                <div style={progressMetaStyle}>
                  <span>累计积分 {currentPoints.toLocaleString()}</span>
                  <span>
                    {nextTier
                      ? `距离 ${nextTier.label} 还差 ${Math.max(nextTier.minPoints - currentPoints, 0).toLocaleString()}`
                      : "已达到最高等级"}
                  </span>
                </div>

                <div style={progressTrackStyle}>
                  <div
                    style={{
                      ...progressFillStyle,
                      width: `${progressPercent}%`,
                      background: `linear-gradient(90deg, ${currentTier.accent}, #f5d0fe)`,
                    }}
                  />
                </div>

                <div style={tierSummaryStyle}>
                  <div>
                    <div style={miniLabelStyle}>当前积分</div>
                    <div style={miniValueStyle}>{currentPoints.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={miniLabelStyle}>下一等级</div>
                    <div style={miniValueStyle}>{nextTier ? nextTier.label : "已满级"}</div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section style={cardStyle}>
          <div style={cardHeaderStyle}>
            <h2 style={cardTitleStyle}>等级权益卡</h2>
            <span style={badgeStyle}>8 Cards</span>
          </div>

          <div style={carouselHeaderStyle}>
            <div>
              <p style={sectionTextStyle}>点击左右箭头查看 8 个等级对应的权益内容。</p>
            </div>
            <div style={arrowGroupStyle}>
              <button
                type="button"
                onClick={() => setBenefitIndex((prev) => (prev === 0 ? tierBenefits.length - 1 : prev - 1))}
                style={arrowButtonStyle}
                aria-label="上一张权益卡"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => setBenefitIndex((prev) => (prev === tierBenefits.length - 1 ? 0 : prev + 1))}
                style={arrowButtonStyle}
                aria-label="下一张权益卡"
              >
                →
              </button>
            </div>
          </div>

          <div style={benefitStackViewportStyle}>
            {tierBenefits.map((benefit, index) => {
              const stackIndex = getBenefitStackIndex(index, benefitIndex, tierBenefits.length);
              const isActive = stackIndex === 0;

              return (
                <article
                  key={benefit.tierLabel}
                  style={{
                    ...benefitCardStyle,
                    ...getBenefitStackCardStyle(stackIndex),
                    borderColor: `${benefit.accent}55`,
                    boxShadow: isActive
                      ? `0 24px 60px ${benefit.accent}20`
                      : `0 14px 36px ${benefit.accent}10`,
                  }}
                  aria-hidden={!isActive}
                >
                  <div style={benefitCardTopStyle}>
                    <div style={{ display: "grid", gap: "10px" }}>
                      <span
                        style={{
                          ...badgeStyle,
                          width: "fit-content",
                          color: benefit.accent,
                          borderColor: `${benefit.accent}55`,
                          background: `${benefit.accent}12`,
                        }}
                      >
                        {benefit.tierLabel}
                      </span>
                      <h3 style={{ margin: 0, fontSize: "clamp(24px, 4vw, 32px)" }}>{benefit.benefitTitle}</h3>
                      <p style={bodyTextStyle}>该卡片展示当前等级可获得的代表性权益，后续可以直接替换成真实运营规则。</p>
                    </div>

                    <div style={benefitMetaCardStyle}>
                      <div style={miniLabelStyle}>卡片进度</div>
                      <div style={miniValueStyle}>
                        {index + 1} / {tierBenefits.length}
                      </div>
                      <div style={{ ...infoDescriptionStyle, marginTop: "8px" }}>
                        {currentTier.label === benefit.tierLabel ? "你当前正处于该等级。" : "可提前查看下一阶段权益。"}
                      </div>
                    </div>
                  </div>

                  <div style={benefitListStyle}>
                    {benefit.points.map((point) => (
                      <div key={point} style={benefitPointStyle}>
                        <span
                          style={{
                            ...ruleDotStyle,
                            background: `linear-gradient(180deg, ${benefit.accent}, #ffffff)`,
                          }}
                        />
                        <span>{point}</span>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <BossSlashTrial initialPoints={currentPoints} onPointsChange={setCurrentPoints} />

        <section style={cardStyle}>
          <div style={carouselHeaderStyle}>
            <div>
              <h2 style={cardTitleStyle}>月度积分明细</h2>
              <p style={sectionTextStyle}>按月份查看积分获取总量与订单来源明细。</p>
            </div>
            <div style={arrowGroupStyle}>
              <button
                type="button"
                onClick={() => setStatementIndex((prev) => (prev === 0 ? monthlyStatements.length - 1 : prev - 1))}
                style={arrowButtonStyle}
                aria-label="上一个月份"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() =>
                  setStatementIndex((prev) => (prev === monthlyStatements.length - 1 ? 0 : prev + 1))
                }
                style={arrowButtonStyle}
                aria-label="下一个月份"
              >
                →
              </button>
            </div>
          </div>

          <div style={statementSummaryStyle}>
            <div>
              <div style={infoLabelStyle}>统计月份</div>
              <div style={statementMonthStyle}>{activeStatement.month}</div>
            </div>
            <div>
              <div style={infoLabelStyle}>本月累计积分</div>
              <div style={statementPointsStyle}>+{activeStatement.total.toLocaleString()}</div>
            </div>
          </div>

          <div style={statementTableStyle}>
            <div style={statementHeadStyle}>
              <span>日期</span>
              <span>来源</span>
              <span>订单号</span>
              <span style={{ textAlign: "right" }}>积分</span>
            </div>
            {activeStatement.items.map((item) => (
              <div key={item.orderNo} style={statementRowStyle}>
                <span>{item.date}</span>
                <span>{item.source}</span>
                <span style={statementOrderStyle}>{item.orderNo}</span>
                <span style={statementPointCellStyle}>+{item.points}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function getBenefitStackIndex(index: number, activeIndex: number, total: number) {
  return (index - activeIndex + total) % total;
}

function getBenefitStackCardStyle(stackIndex: number): React.CSSProperties {
  const visibleDepth = Math.min(stackIndex, 3);
  const isVisible = stackIndex < 4;

  return {
    position: "absolute",
    inset: 0,
    zIndex: 20 - stackIndex,
    opacity: isVisible ? 1 - visibleDepth * 0.18 : 0,
    pointerEvents: stackIndex === 0 ? "auto" : "none",
    transform: `translate3d(${visibleDepth * 18}px, ${visibleDepth * 18}px, 0) scale(${1 - visibleDepth * 0.04})`,
    filter: stackIndex === 0 ? "none" : "saturate(0.88)",
    transition: "transform 280ms ease, opacity 280ms ease, box-shadow 280ms ease, filter 280ms ease",
  };
}

function InfoItem({
  label,
  value,
  accent,
  description,
  compact,
  highlight,
}: {
  label: string;
  value: string;
  accent?: string;
  description?: string;
  compact?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        ...infoItemStyle,
        background: highlight ? "rgba(250,204,21,0.08)" : "rgba(255,255,255,0.03)",
        borderColor: highlight ? "rgba(250,204,21,0.24)" : "rgba(148,163,184,0.14)",
      }}
    >
      <div style={infoLabelStyle}>{label}</div>
      <div
        style={{
          ...infoValueStyle,
          color: accent ?? "#f8fafc",
          fontSize: compact ? "clamp(18px, 2.2vw, 24px)" : infoValueStyle.fontSize,
          whiteSpace: compact ? "nowrap" : "normal",
          overflow: compact ? "hidden" : "visible",
          textOverflow: compact ? "ellipsis" : "clip",
        }}
        title={value}
      >
        {value}
      </div>
      {description ? <div style={infoDescriptionStyle}>{description}</div> : null}
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  height: "calc(100vh - 161px)",
  margin: "-40px",
  width: "calc(100% + 80px)",
  padding: "52px 0 64px",
  color: "white",
  overflowY: "auto",
  overscrollBehavior: "contain",
  background:
    "radial-gradient(circle at top left, rgba(124,58,237,0.18) 0%, rgba(10,10,14,1) 36%, rgba(4,6,14,1) 100%)",
};

const shellStyle: React.CSSProperties = {
  maxWidth: "1120px",
  margin: "0 auto",
  display: "grid",
  gap: "24px",
  padding: "0 24px",
};

const heroStyle: React.CSSProperties = {
  display: "grid",
  gap: "24px",
};

const heroPanelStyle: React.CSSProperties = {
  borderRadius: "28px",
  padding: "28px",
  background: "linear-gradient(180deg, rgba(76,29,149,0.55), rgba(15,23,42,0.88))",
  border: "1px solid rgba(196,181,253,0.22)",
  boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
  display: "grid",
  gap: "14px",
};

const eyebrowStyle: React.CSSProperties = {
  display: "inline-flex",
  width: "fit-content",
  padding: "7px 12px",
  borderRadius: "999px",
  background: "rgba(168,85,247,0.14)",
  border: "1px solid rgba(196,181,253,0.22)",
  color: "#d8b4fe",
  fontSize: "12px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "48px",
  lineHeight: 1.05,
  fontWeight: 800,
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#cbd5e1",
  maxWidth: "680px",
  fontSize: "16px",
  lineHeight: 1.7,
};

const cardStyle: React.CSSProperties = {
  borderRadius: "28px",
  padding: "28px",
  background: "rgba(10,14,24,0.8)",
  border: "1px solid rgba(148,163,184,0.16)",
  boxShadow: "0 24px 60px rgba(0,0,0,0.24)",
  backdropFilter: "blur(16px)",
};

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  marginBottom: "20px",
  flexWrap: "wrap",
};

const cardTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 800,
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "999px",
  border: "1px solid rgba(148,163,184,0.18)",
  background: "rgba(255,255,255,0.04)",
  padding: "7px 12px",
  color: "#cbd5e1",
  fontSize: "12px",
  whiteSpace: "nowrap",
};

const topOverviewGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.15fr) minmax(280px, 0.85fr)",
  gap: "18px",
};

const topCardStyle: React.CSSProperties = {
  ...cardStyle,
  padding: "26px",
  display: "grid",
  gap: "18px",
};

const infoGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "14px",
};

const infoItemStyle: React.CSSProperties = {
  borderRadius: "20px",
  border: "1px solid rgba(148,163,184,0.14)",
  background: "rgba(255,255,255,0.03)",
  padding: "18px",
  display: "grid",
  gap: "8px",
};

const infoLabelStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: "13px",
};

const infoValueStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 700,
  wordBreak: "break-word",
};

const infoDescriptionStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: "13px",
  lineHeight: 1.5,
};

const noticeStyle: React.CSSProperties = {
  marginTop: "18px",
  borderRadius: "20px",
  padding: "18px",
  border: "1px solid rgba(96,165,250,0.18)",
  background: "rgba(37,99,235,0.08)",
  display: "grid",
  gap: "8px",
};

const noticeTitleStyle: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  color: "#bfdbfe",
};

const noticeTextStyle: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: 1.6,
  color: "#dbeafe",
};

const bodyTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#cbd5e1",
  lineHeight: 1.7,
  fontSize: "15px",
};

const sectionTextStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#94a3b8",
  fontSize: "14px",
  lineHeight: 1.6,
};

const ruleDotStyle: React.CSSProperties = {
  width: "8px",
  height: "8px",
  marginTop: "7px",
  borderRadius: "999px",
  background: "linear-gradient(180deg, #a855f7, #60a5fa)",
  flexShrink: 0,
};

const progressMetaStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  color: "#e2e8f0",
  fontSize: "14px",
};

const progressTrackStyle: React.CSSProperties = {
  height: "12px",
  width: "100%",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.1)",
  overflow: "hidden",
};

const progressFillStyle: React.CSSProperties = {
  height: "100%",
  borderRadius: "999px",
  transition: "width 180ms ease",
};

const tierSummaryStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: "14px",
  marginTop: "6px",
};

const miniLabelStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: "12px",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const miniValueStyle: React.CSSProperties = {
  marginTop: "8px",
  color: "#f8fafc",
  fontSize: "clamp(18px, 2.5vw, 24px)",
  fontWeight: 800,
  lineHeight: 1.2,
};

const carouselHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "20px",
  flexWrap: "wrap",
};

const arrowGroupStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
};

const arrowButtonStyle: React.CSSProperties = {
  width: "46px",
  height: "46px",
  borderRadius: "999px",
  border: "1px solid rgba(148,163,184,0.2)",
  background: "rgba(255,255,255,0.04)",
  color: "#f8fafc",
  fontSize: "20px",
  cursor: "pointer",
};

const benefitStackViewportStyle: React.CSSProperties = {
  position: "relative",
  minHeight: "420px",
  paddingRight: "56px",
  paddingBottom: "56px",
};

const benefitCardStyle: React.CSSProperties = {
  borderRadius: "26px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "linear-gradient(180deg, rgba(10,14,24,0.98), rgba(15,23,42,0.96))",
  padding: "26px",
  display: "grid",
  gap: "22px",
  overflow: "hidden",
};

const benefitCardTopStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(200px, 260px)",
  gap: "18px",
  alignItems: "stretch",
};

const benefitMetaCardStyle: React.CSSProperties = {
  borderRadius: "22px",
  border: "1px solid rgba(148,163,184,0.18)",
  background: "rgba(2,6,23,0.92)",
  padding: "18px",
  display: "grid",
  alignContent: "start",
};

const benefitListStyle: React.CSSProperties = {
  display: "grid",
  gap: "14px",
};

const benefitPointStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
  fontSize: "15px",
  lineHeight: 1.6,
  color: "#e5e7eb",
};

const statementSummaryStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
  marginBottom: "20px",
  padding: "20px",
  borderRadius: "20px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(148,163,184,0.14)",
};

const statementMonthStyle: React.CSSProperties = {
  marginTop: "8px",
  fontSize: "clamp(22px, 4vw, 30px)",
  fontWeight: 800,
};

const statementPointsStyle: React.CSSProperties = {
  marginTop: "8px",
  fontSize: "clamp(22px, 4vw, 30px)",
  fontWeight: 800,
  color: "#86efac",
};

const statementTableStyle: React.CSSProperties = {
  display: "grid",
  gap: "10px",
};

const statementHeadStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "90px minmax(140px, 1fr) minmax(180px, 1fr) 90px",
  gap: "12px",
  color: "#94a3b8",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  padding: "0 8px",
};

const statementRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "90px minmax(140px, 1fr) minmax(180px, 1fr) 90px",
  gap: "12px",
  alignItems: "center",
  padding: "16px",
  borderRadius: "18px",
  border: "1px solid rgba(148,163,184,0.14)",
  background: "rgba(255,255,255,0.03)",
  color: "#e2e8f0",
  fontSize: "14px",
};

const statementOrderStyle: React.CSSProperties = {
  color: "#c4b5fd",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const statementPointCellStyle: React.CSSProperties = {
  textAlign: "right",
  fontWeight: 800,
  color: "#86efac",
};
