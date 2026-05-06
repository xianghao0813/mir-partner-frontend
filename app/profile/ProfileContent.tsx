"use client";

import { useState } from "react";
import BossSlashTrial from "@/components/BossSlashTrial";
import type { PartnerPointTransaction, PartnerProfileSummary } from "@/lib/partnerProfile";

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
  const [pointTransactions, setPointTransactions] = useState(profile.pointTransactions);
  const [tierCouponClaim, setTierCouponClaim] = useState(profile.tierCouponClaim);
  const [claimingTierCoupons, setClaimingTierCoupons] = useState(false);
  const [tierCouponMessage, setTierCouponMessage] = useState("");
  const [activeTierIndex, setActiveTierIndex] = useState(
    Math.max(0, profileTierList.findIndex((tier) => tier.id === profile.currentTier.id))
  );
  const currentTier = getTierForPoints(currentPoints);
  const nextTier = getNextTier(currentTier.id);
  const pointsToNextTier = nextTier ? Math.max(nextTier.minPoints - currentPoints, 0) : 0;
  const retentionPenalty = currentTier.id > 1 ? Math.floor(currentTier.minPoints * 0.2) : 0;
  const retentionTarget = currentTier.minPoints + retentionPenalty;
  const retentionPointsLeft = Math.max(0, retentionTarget - currentPoints);
  const retentionAchieved = currentTier.id === 1 || profile.upgradedThisMonth || retentionPointsLeft === 0;
  const retentionMarkerPercent =
    nextTier && currentTier.id > 1
      ? Math.min(
          100,
          Math.max(
            0,
            ((retentionTarget - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100
          )
        )
      : null;
  const progressPercent = nextTier
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(
            ((currentPoints - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 1000
          ) / 10
        )
      )
    : 100;
  const progressPercentText =
    progressPercent > 0 && progressPercent < 1
      ? `${progressPercent.toFixed(1)}%`
      : `${Math.round(progressPercent)}%`;
  const filteredPointTransactions = pointTransactions.filter((entry) =>
    ledgerMonth ? (entry.createdAt ?? "").startsWith(ledgerMonth) : true
  );
  const filteredPointTotal = filteredPointTransactions.reduce((sum, entry) => sum + entry.points, 0);

  async function claimTierUpgradeCoupons() {
    setClaimingTierCoupons(true);
    setTierCouponMessage("");

    try {
      const response = await fetch("/api/coupons/tier-upgrade-claim", {
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as { message?: string; couponsIssued?: number; toTierId?: number } | null;

      if (!response.ok) {
        throw new Error(payload?.message || "领取失败。");
      }

      setTierCouponClaim((current) => ({
        ...current,
        grantedTierId: payload?.toTierId ?? current.currentTierId,
        pendingCount: 0,
        claimable: false,
      }));
      setTierCouponMessage(`已领取 ${Number(payload?.couponsIssued ?? 0).toLocaleString()} 张晋升追加优惠券。`);
    } catch (error) {
      setTierCouponMessage(error instanceof Error ? error.message : "领取失败。");
    } finally {
      setClaimingTierCoupons(false);
    }
  }

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
                <div style={tierGaugePercentStyle}>{progressPercentText}</div>
              </div>

              <div style={tierProgressStyle}>
                <div style={tierProgressHeaderStyle}>
                  <span>当前 {currentPoints.toLocaleString()} 分</span>
                  <span>{nextTier ? `${nextTier.minPoints.toLocaleString()} 分` : "最高星级"}</span>
                </div>
                <div style={progressRailStyle}>
                  <div style={{ ...progressFillStyle(currentTier.accent), width: `${progressPercent}%` }} />
                  {retentionMarkerPercent !== null ? (
                    <div style={{ ...retentionMarkerStyle, left: `${retentionMarkerPercent}%` }}>
                      <span style={retentionMarkerDotStyle} />
                      <span style={retentionMarkerLabelStyle}>保级</span>
                    </div>
                  ) : null}
                </div>
                <div style={tierProgressHeaderStyle}>
                  <span>当前累计 {currentPoints.toLocaleString()} 分</span>
                  <span>{nextTier ? `目标 ${nextTier.label}` : "已达最高等级"}</span>
                </div>
                <div style={retentionStatusStyle(retentionAchieved, currentTier.accent)}>
                  {currentTier.id === 1
                    ? "米尔新星暂无保级要求"
                    : retentionAchieved
                      ? `已达保级线，月底预计可保持 ${currentTier.label}`
                      : `距离保级还需 ${retentionPointsLeft.toLocaleString()} 分，月底未升级将扣除 ${retentionPenalty.toLocaleString()} 分`}
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
                label="保级状态"
                value={
                  currentTier.id === 1
                    ? "暂无要求"
                    : retentionAchieved
                      ? "已达成"
                      : `还需 ${retentionPointsLeft.toLocaleString()} 分`
                }
                accent={retentionAchieved ? "#86efac" : "#fca5a5"}
                progress={
                  currentTier.id === 1
                    ? 100
                    : Math.min(100, Math.max(0, Math.round((currentPoints / retentionTarget) * 100)))
                }
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

          {tierCouponClaim.claimable ? (
            <div style={tierCouponClaimPanelStyle}>
              <div>
                <strong>晋升追加优惠券可领取</strong>
                <div style={tierCouponClaimTextStyle}>
                  本月已发放到 {getTierLabel(tierCouponClaim.grantedTierId)}，当前为 {currentTier.label}，可追加领取 {tierCouponClaim.pendingCount.toLocaleString()} 张优惠券。
                </div>
              </div>
              <button type="button" onClick={() => void claimTierUpgradeCoupons()} disabled={claimingTierCoupons} style={tierCouponClaimButtonStyle}>
                {claimingTierCoupons ? "领取中..." : "领取追加优惠券"}
              </button>
            </div>
          ) : null}
          {tierCouponMessage ? <div style={tierCouponMessageStyle}>{tierCouponMessage}</div> : null}

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
                    <div style={tierCouponBenefitTitleStyle}>每月星级优惠券</div>
                    <div style={tierCouponBenefitListStyle}>
                      {getCouponBenefitsForTier(tier.id).map((benefit) => (
                        <div key={benefit} style={tierCouponBenefitItemStyle}>{benefit}</div>
                      ))}
                    </div>
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
              <h2 style={sectionTitleStyle}>遗迹冲刺</h2>
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
            onRewardClaimed={(transaction) => {
              const normalized = normalizeRewardTransaction(transaction);
              setPointTransactions((current) => [
                normalized,
                ...current.filter((entry) => entry.id !== normalized.id),
              ]);
              if (normalized.createdAt) {
                setLedgerMonth(normalized.createdAt.slice(0, 7));
              }
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

function getTierLabel(tierId: number) {
  return profileTierList.find((tier) => tier.id === tierId)?.label ?? "未发放";
}

function getCouponBenefitsForTier(tierId: number) {
  const extraCount = Math.max(0, tierId - 1) * 2;
  return [
    `100元云币充值：立减8元 x ${3 + extraCount}张`,
    `300元云币充值：立减28元 x ${1 + extraCount}张`,
  ];
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

function normalizeRewardTransaction(transaction: {
  id?: string;
  title?: string;
  description?: string;
  points?: number;
  createdAt?: string;
  source?: string;
}): PartnerPointTransaction {
  const createdAt = transaction.createdAt || new Date().toISOString();

  return {
    id: transaction.id || `boss-last-hit-${Date.now()}`,
    title: transaction.title || "小游戏积分",
    description: transaction.description || "遗迹冲刺小游戏奖励",
    points: Number.isFinite(Number(transaction.points)) ? Math.floor(Number(transaction.points)) : 50,
    createdAt,
    source: transaction.source || "boss_last_hit",
  };
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
  position: "relative",
  height: "10px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.08)",
  overflow: "visible",
};

const progressFillStyle = (accent: string): React.CSSProperties => ({
  height: "100%",
  borderRadius: "999px",
  background: `linear-gradient(90deg, ${accent}, #facc15)`,
});

const retentionMarkerStyle: React.CSSProperties = {
  position: "absolute",
  top: "-8px",
  transform: "translateX(-50%)",
  display: "grid",
  justifyItems: "center",
  gap: "4px",
  zIndex: 2,
};

const retentionMarkerDotStyle: React.CSSProperties = {
  width: "4px",
  height: "24px",
  borderRadius: "999px",
  background: "#f8fafc",
  boxShadow: "0 0 12px rgba(248,250,252,0.65)",
};

const retentionMarkerLabelStyle: React.CSSProperties = {
  padding: "3px 7px",
  borderRadius: "999px",
  background: "rgba(15,23,42,0.92)",
  border: "1px solid rgba(255,255,255,0.14)",
  color: "#f8fafc",
  fontSize: "11px",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const retentionStatusStyle = (achieved: boolean, accent: string): React.CSSProperties => ({
  padding: "10px 12px",
  borderRadius: "14px",
  background: achieved ? `${accent}1f` : "rgba(239,68,68,0.12)",
  border: achieved ? `1px solid ${accent}55` : "1px solid rgba(248,113,113,0.28)",
  color: achieved ? "#e5e7eb" : "#fecaca",
  fontSize: "13px",
  fontWeight: 800,
  lineHeight: 1.5,
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

const tierCouponClaimPanelStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  flexWrap: "wrap",
  padding: "14px 16px",
  marginBottom: "16px",
  borderRadius: "16px",
  background: "rgba(250,204,21,0.1)",
  border: "1px solid rgba(250,204,21,0.24)",
  color: "#f8fafc",
};

const tierCouponClaimTextStyle: React.CSSProperties = {
  marginTop: "6px",
  color: "#fde68a",
  fontSize: "13px",
  lineHeight: 1.55,
};

const tierCouponClaimButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(250,204,21,0.45)",
  background: "linear-gradient(135deg, #facc15, #f59e0b)",
  color: "#111827",
  borderRadius: "12px",
  minHeight: "42px",
  padding: "0 16px",
  fontWeight: 900,
  cursor: "pointer",
};

const tierCouponMessageStyle: React.CSSProperties = {
  marginBottom: "16px",
  padding: "12px 14px",
  borderRadius: "14px",
  background: "rgba(59,130,246,0.12)",
  border: "1px solid rgba(96,165,250,0.22)",
  color: "#bfdbfe",
  fontSize: "13px",
  fontWeight: 800,
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
  height: "390px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
};

const tierCardButtonStyle = (offset: number, isActive: boolean): React.CSSProperties => ({
  position: "absolute",
  width: "min(560px, 96%)",
  height: "330px",
  border: "none",
  padding: 0,
  background: "transparent",
  cursor: "pointer",
  transform: `translateX(${offset * 34}%) scale(${isActive ? 1 : 0.84}) rotate(${offset * -2.5}deg)`,
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
  padding: "26px 30px",
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
  lineHeight: 1.15,
  wordBreak: "keep-all",
};

const tierCardPointsStyle: React.CSSProperties = {
  fontSize: "34px",
  fontWeight: 800,
  color: "#f8fafc",
  lineHeight: 1.1,
  wordBreak: "break-word",
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

const tierCouponBenefitTitleStyle: React.CSSProperties = {
  marginTop: "4px",
  color: "#fde68a",
  fontSize: "13px",
  fontWeight: 900,
};

const tierCouponBenefitListStyle: React.CSSProperties = {
  display: "grid",
  gap: "6px",
};

const tierCouponBenefitItemStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: "11px",
  background: "rgba(250,204,21,0.08)",
  border: "1px solid rgba(250,204,21,0.16)",
  color: "#fde68a",
  fontSize: "12px",
  lineHeight: 1.4,
  fontWeight: 800,
};

const tierBenefitItemStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.07)",
  color: "#d1d5db",
  fontSize: "13px",
  lineHeight: 1.45,
  whiteSpace: "normal",
  overflowWrap: "anywhere",
};
