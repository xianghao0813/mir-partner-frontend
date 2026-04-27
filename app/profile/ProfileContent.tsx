"use client";

import { useState } from "react";
import BossSlashTrial from "@/components/BossSlashTrial";
import type { PartnerProfileSummary } from "@/lib/partnerProfile";

type ProfileContentProps = {
  profile: PartnerProfileSummary;
};

const profileTierList = [
  { id: 1, label: "米尔新星", minPoints: 0, accent: "#94a3b8" },
  { id: 2, label: "米尔一星", minPoints: 100000, accent: "#60a5fa" },
  { id: 3, label: "米尔二星", minPoints: 500000, accent: "#22c55e" },
  { id: 4, label: "米尔三星", minPoints: 1000000, accent: "#14b8a6" },
  { id: 5, label: "米尔四星", minPoints: 5000000, accent: "#f59e0b" },
  { id: 6, label: "米尔五星", minPoints: 10000000, accent: "#fb7185" },
  { id: 7, label: "米尔六星", minPoints: 30000000, accent: "#c084fc" },
  { id: 8, label: "米尔至尊", minPoints: 50000000, accent: "#facc15" },
];

export default function ProfileContent({ profile }: ProfileContentProps) {
  const [currentPoints, setCurrentPoints] = useState(profile.points);
  const [currentMonthlyPoints, setCurrentMonthlyPoints] = useState(profile.monthlyPoints);
  const [ledgerMonth, setLedgerMonth] = useState(getCurrentMonth());
  const [activeTierIndex, setActiveTierIndex] = useState(
    Math.max(0, profileTierList.findIndex((tier) => tier.id === profile.currentTier.id))
  );
  const currentTier = getTierForPoints(currentPoints);
  const nextTier = getNextTier(currentTier.id);
  const pointsToNextTier = nextTier ? Math.max(nextTier.minPoints - currentPoints, 0) : 0;
  const progressPercent = nextTier
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(
            ((currentPoints - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100
          )
        )
      )
    : 100;
  const filteredPointTransactions = profile.pointTransactions.filter((entry) =>
    ledgerMonth ? (entry.createdAt ?? "").startsWith(ledgerMonth) : true
  );
  const filteredPointTotal = filteredPointTransactions.reduce((sum, entry) => sum + entry.points, 0);

  return (
    <main className="hide-scrollbar" style={pageStyle}>
      <div className="auth-bg" style={{ position: "fixed" }} />
      <div className="auth-overlay" style={{ position: "fixed" }} />

      <div style={shellStyle}>
        <section style={cardStyle}>
          <div style={eyebrowStyle}>MIR Partner</div>
          <h1 style={titleStyle}>个人资料</h1>
          <p style={subtitleStyle}>查看当前账号的合伙人身份、星级和 MIR 积分进度。</p>

          <div style={identityGridStyle}>
            <InfoCard label="UID" value={profile.uid || "-"} />
            <InfoCard label="合伙人编号" value={profile.partnerCode} accent="#fde68a" />
          </div>

          <div style={tierDashboardStyle}>
            <article style={tierGaugeCardStyle(currentTier.accent)}>
              <div style={tierGaugeTopStyle}>
                <div>
                  <div style={infoLabelStyle}>当前合伙人星级</div>
                  <div style={{ ...tierGaugeTitleStyle, color: currentTier.accent }}>{currentTier.label}</div>
                </div>
                <div style={tierGaugePercentStyle}>{progressPercent}%</div>
              </div>

              <div style={tierProgressStyle}>
                <div style={tierProgressHeaderStyle}>
                  <span>{currentTier.minPoints.toLocaleString()} 分</span>
                  <span>{nextTier ? `${nextTier.minPoints.toLocaleString()} 分` : "最高星级"}</span>
                </div>
                <div style={progressRailStyle}>
                  <div style={{ ...progressFillStyle(currentTier.accent), width: `${progressPercent}%` }} />
                </div>
                <div style={tierProgressHeaderStyle}>
                  <span>当前累计 {currentPoints.toLocaleString()} 分</span>
                  <span>{nextTier ? `目标 ${nextTier.label}` : "已达最高等级"}</span>
                </div>
              </div>
            </article>

            <div style={tierMetricGridStyle}>
              <MetricCard
                label="本月获得积分"
                value={`${currentMonthlyPoints.toLocaleString()} 分`}
                accent="#86efac"
                progress={Math.min(100, Math.round((currentMonthlyPoints / 100000) * 100))}
              />
              <MetricCard
                label="升级还需"
                value={nextTier ? `${pointsToNextTier.toLocaleString()} 分` : "已达最高星级"}
                accent="#facc15"
                progress={nextTier ? 100 - progressPercent : 100}
              />
            </div>
          </div>
        </section>

        <section style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <div style={eyebrowStyle}>Partner Tiers</div>
              <h2 style={sectionTitleStyle}>合伙人星级权益</h2>
            </div>
            <div style={pointsBadgeStyle}>{profileTierList[activeTierIndex].label}</div>
          </div>

          <div style={tierCarouselStyle}>
            {profileTierList.map((tier, index) => {
              const offset = index - activeTierIndex;
              const isActive = index === activeTierIndex;
              const isVisible = Math.abs(offset) <= 2;

              if (!isVisible) {
                return null;
              }

              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setActiveTierIndex(index)}
                  style={tierCardButtonStyle(offset, isActive)}
                  aria-label={`${tier.label} 星级权益`}
                >
                  <article style={tierCardStyle(isActive, tier.accent)}>
                    <div style={{ ...tierCardBadgeStyle, color: tier.accent }}>{tier.label}</div>
                    <div style={tierCardPointsStyle}>{tier.minPoints.toLocaleString()} 分</div>
                    <div style={tierCardTextStyle}>升级所需累计积分</div>
                    <div style={tierBenefitListStyle}>
                      {getTierBenefits(tier.label).map((benefit) => (
                        <div key={benefit} style={tierBenefitItemStyle}>
                          {benefit}
                        </div>
                      ))}
                    </div>
                  </article>
                </button>
              );
            })}
          </div>
        </section>

        <section style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <div style={eyebrowStyle}>Mini Game</div>
              <h2 style={sectionTitleStyle}>Boss Last Hit</h2>
            </div>
            <div style={pointsBadgeStyle}>MIR Points: {currentPoints.toLocaleString()}</div>
          </div>

          <BossSlashTrial
            initialPoints={currentPoints}
            onPointsChange={(points) => {
              setCurrentPoints((previousPoints) => {
                if (points > previousPoints) {
                  setCurrentMonthlyPoints((previousMonthlyPoints) => previousMonthlyPoints + points - previousPoints);
                }
                return points;
              });
            }}
          />
        </section>

        <section style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <div style={eyebrowStyle}>Point Ledger</div>
              <h2 style={sectionTitleStyle}>MIR 积分月度明细</h2>
            </div>
            <div style={ledgerControlStyle}>
              <input
                type="month"
                value={ledgerMonth}
                onChange={(event) => setLedgerMonth(event.target.value)}
                style={monthInputStyle}
              />
              <div style={pointsBadgeStyle}>合计 {filteredPointTotal.toLocaleString()} 分</div>
            </div>
          </div>

          {filteredPointTransactions.length === 0 ? (
            <div style={emptyLedgerStyle}>该月份暂无积分记录。</div>
          ) : (
            <div style={ledgerListStyle}>
              {filteredPointTransactions.map((entry) => (
                <article key={entry.id} style={ledgerItemStyle}>
                  <div>
                    <div style={ledgerTitleStyle}>{entry.title}</div>
                    <div style={ledgerDescriptionStyle}>{entry.description}</div>
                    <div style={ledgerDateStyle}>{formatDate(entry.createdAt)}</div>
                  </div>
                  <div style={entry.points < 0 ? ledgerNegativeAmountStyle : ledgerAmountStyle}>
                    {entry.points > 0 ? "+" : ""}
                    {entry.points.toLocaleString()}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function InfoCard({
  label,
  value,
  accent = "#f8fafc",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <article style={infoCardStyle}>
      <div style={infoLabelStyle}>{label}</div>
      <div style={{ ...infoValueStyle, color: accent }}>{value}</div>
    </article>
  );
}

function MetricCard({
  label,
  value,
  accent,
  progress,
}: {
  label: string;
  value: string;
  accent: string;
  progress: number;
}) {
  return (
    <article style={metricCardStyle}>
      <div style={infoLabelStyle}>{label}</div>
      <div style={{ ...metricValueStyle, color: accent }}>{value}</div>
      <div style={metricRailStyle}>
        <div style={{ ...metricFillStyle(accent), width: `${Math.min(100, Math.max(0, progress))}%` }} />
      </div>
    </article>
  );
}

function getTierForPoints(points: number) {
  return [...profileTierList]
    .reverse()
    .find((tier) => points >= tier.minPoints) ?? profileTierList[0];
}

function getNextTier(currentTierId: number) {
  return profileTierList.find((tier) => tier.id === currentTierId + 1) ?? null;
}

function getTierBenefits(tierLabel: string) {
  return [
    `${tierLabel} 专属身份标识`,
    "月度活动优先参与资格",
    "云币任务奖励加成（待定）",
    "合伙人数据看板权限（待定）",
  ];
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const pageStyle: React.CSSProperties = {
  height: "calc(100vh - 81px)",
  position: "relative",
  margin: "-40px",
  width: "calc(100% + 80px)",
  overflowX: "hidden",
  overflowY: "auto",
  backgroundColor: "#07070a",
  boxSizing: "border-box",
  padding: "72px 24px 120px",
};

const shellStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  maxWidth: "1120px",
  margin: "0 auto",
  display: "grid",
  gap: "20px",
};

const cardStyle: React.CSSProperties = {
  borderRadius: "24px",
  background: "rgba(16,16,24,0.82)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
  backdropFilter: "blur(14px)",
  padding: "28px",
};

const eyebrowStyle: React.CSSProperties = {
  color: "#c4b5fd",
  fontSize: "12px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: "10px",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "32px",
  color: "white",
};

const subtitleStyle: React.CSSProperties = {
  marginTop: "8px",
  marginBottom: "20px",
  color: "#b8b8c5",
  fontSize: "14px",
};

const identityGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "14px",
};

const tierDashboardStyle: React.CSSProperties = {
  marginTop: "16px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))",
  gap: "14px",
};

const tierGaugeCardStyle = (accent: string): React.CSSProperties => ({
  padding: "22px",
  borderRadius: "20px",
  background: `linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.025)), radial-gradient(circle at top right, ${accent}26, transparent 48%)`,
  border: `1px solid ${accent}55`,
  boxShadow: `0 18px 38px rgba(0,0,0,0.26), 0 0 24px ${accent}1f`,
  display: "grid",
  gap: "18px",
});

const tierGaugeTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
};

const tierGaugeTitleStyle: React.CSSProperties = {
  marginTop: "8px",
  fontSize: "34px",
  fontWeight: 900,
  lineHeight: 1.05,
};

const tierGaugePercentStyle: React.CSSProperties = {
  minWidth: "70px",
  textAlign: "center",
  padding: "10px 12px",
  borderRadius: "14px",
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.09)",
  color: "#f8fafc",
  fontSize: "20px",
  fontWeight: 800,
};

const tierMetricGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "14px",
};

const metricCardStyle: React.CSSProperties = {
  minHeight: "120px",
  padding: "18px",
  borderRadius: "20px",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.075)",
  display: "grid",
  alignContent: "space-between",
  gap: "14px",
};

const metricValueStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 850,
  lineHeight: 1.18,
  wordBreak: "break-word",
};

const metricRailStyle: React.CSSProperties = {
  height: "8px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.08)",
  overflow: "hidden",
};

const metricFillStyle = (accent: string): React.CSSProperties => ({
  height: "100%",
  borderRadius: "999px",
  background: `linear-gradient(90deg, ${accent}, #f8fafc)`,
});

const tierProgressStyle: React.CSSProperties = {
  display: "grid",
  gap: "10px",
};

const tierProgressHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  color: "#d8b4fe",
  fontSize: "13px",
  fontWeight: 700,
};

const progressRailStyle: React.CSSProperties = {
  height: "10px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.08)",
  overflow: "hidden",
};

const progressFillStyle = (accent: string): React.CSSProperties => ({
  height: "100%",
  borderRadius: "999px",
  background: `linear-gradient(90deg, ${accent}, #facc15)`,
});

const infoCardStyle: React.CSSProperties = {
  padding: "18px",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.06)",
  display: "grid",
  gap: "8px",
};

const infoLabelStyle: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "13px",
};

const infoValueStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 700,
  wordBreak: "break-word",
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  marginBottom: "18px",
  flexWrap: "wrap",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "24px",
  color: "white",
};

const pointsBadgeStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: "999px",
  background: "rgba(124,58,237,0.2)",
  border: "1px solid rgba(192,132,252,0.3)",
  color: "#f5d0fe",
  fontSize: "14px",
  fontWeight: 700,
};

const ledgerControlStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
};

const monthInputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  colorScheme: "dark",
  outline: "none",
};

const emptyLedgerStyle: React.CSSProperties = {
  padding: "20px",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.06)",
  color: "#a1a1aa",
  textAlign: "center",
};

const ledgerListStyle: React.CSSProperties = {
  display: "grid",
  gap: "10px",
};

const ledgerItemStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  alignItems: "center",
  padding: "14px",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.06)",
};

const ledgerTitleStyle: React.CSSProperties = {
  color: "white",
  fontWeight: 800,
};

const ledgerDescriptionStyle: React.CSSProperties = {
  marginTop: "5px",
  color: "#a1a1aa",
  fontSize: "13px",
  lineHeight: 1.5,
};

const ledgerDateStyle: React.CSSProperties = {
  marginTop: "5px",
  color: "#71717a",
  fontSize: "12px",
};

const ledgerAmountStyle: React.CSSProperties = {
  color: "#86efac",
  fontSize: "18px",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const ledgerNegativeAmountStyle: React.CSSProperties = {
  ...ledgerAmountStyle,
  color: "#fca5a5",
};

const tierCarouselStyle: React.CSSProperties = {
  position: "relative",
  height: "360px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
};

const tierCardButtonStyle = (offset: number, isActive: boolean): React.CSSProperties => ({
  position: "absolute",
  width: "min(360px, 82vw)",
  height: "300px",
  border: "none",
  padding: 0,
  background: "transparent",
  cursor: "pointer",
  transform: `translateX(${offset * 42}%) scale(${isActive ? 1 : 0.86}) rotate(${offset * -3}deg)`,
  opacity: isActive ? 1 : 0.58,
  zIndex: 20 - Math.abs(offset),
  transition:
    "transform 260ms ease, opacity 260ms ease, filter 260ms ease, z-index 260ms ease",
  filter: isActive ? "none" : "blur(0.2px)",
});

const tierCardStyle = (isActive: boolean, accent: string): React.CSSProperties => ({
  width: "100%",
  height: "100%",
  boxSizing: "border-box",
  borderRadius: "24px",
  padding: "24px",
  textAlign: "left",
  color: "white",
  background: isActive
    ? `linear-gradient(145deg, rgba(24,24,36,0.98), rgba(18,18,28,0.96)), radial-gradient(circle at top, ${accent}40, transparent 58%)`
    : "linear-gradient(145deg, rgba(20,20,30,0.9), rgba(12,12,18,0.9))",
  border: `1px solid ${isActive ? accent : "rgba(255,255,255,0.12)"}`,
  boxShadow: isActive
    ? `0 24px 60px rgba(0,0,0,0.42), 0 0 26px ${accent}33`
    : "0 16px 36px rgba(0,0,0,0.32)",
  display: "grid",
  alignContent: "start",
  gap: "12px",
});

const tierCardBadgeStyle: React.CSSProperties = {
  fontSize: "28px",
  fontWeight: 800,
};

const tierCardPointsStyle: React.CSSProperties = {
  fontSize: "34px",
  fontWeight: 800,
  color: "#f8fafc",
};

const tierCardTextStyle: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "13px",
};

const tierBenefitListStyle: React.CSSProperties = {
  display: "grid",
  gap: "8px",
  marginTop: "6px",
};

const tierBenefitItemStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.07)",
  color: "#d1d5db",
  fontSize: "13px",
};
