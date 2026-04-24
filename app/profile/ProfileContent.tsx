"use client";

import { useState } from "react";
import BossSlashTrial from "@/components/BossSlashTrial";
import type { PartnerProfileSummary } from "@/lib/partnerProfile";

type ProfileContentProps = {
  profile: PartnerProfileSummary;
};

export default function ProfileContent({ profile }: ProfileContentProps) {
  const [currentPoints, setCurrentPoints] = useState(profile.points);

  return (
    <main className="hide-scrollbar" style={pageStyle}>
      <div className="auth-bg" />
      <div className="auth-overlay" />

      <div style={shellStyle}>
        <section style={cardStyle}>
          <div style={eyebrowStyle}>MIR Partner</div>
          <h1 style={titleStyle}>个人资料</h1>
          <p style={subtitleStyle}>这里只保留当前账号的核心识别信息。</p>

          <div style={infoGridStyle}>
            <InfoCard label="UID" value={profile.uid || "-"} />
            <InfoCard label="合伙人编码" value={profile.partnerCode} accent="#fde68a" />
          </div>
        </section>

        <section style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <div style={eyebrowStyle}>Mini Game</div>
              <h2 style={sectionTitleStyle}>Boss Last Hit</h2>
            </div>
            <div style={pointsBadgeStyle}>MIR Points: {currentPoints}</div>
          </div>

          <BossSlashTrial
            initialPoints={currentPoints}
            onPointsChange={(points) => {
              setCurrentPoints(points);
            }}
          />
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

const infoGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "14px",
};

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
