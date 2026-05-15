"use client";

import type { CSSProperties } from "react";

type TierIdentityBadgeProps = {
  tier: {
    id: number;
    label: string;
    minPoints?: number;
  };
  size?: "lg" | "sm";
};

const tierAccents: Record<number, { color: string; glow: string }> = {
  1: { color: "#94a3b8", glow: "rgba(148,163,184,0.2)" },
  2: { color: "#60a5fa", glow: "rgba(96,165,250,0.22)" },
  3: { color: "#22c55e", glow: "rgba(34,197,94,0.22)" },
  4: { color: "#14b8a6", glow: "rgba(20,184,166,0.22)" },
  5: { color: "#f59e0b", glow: "rgba(245,158,11,0.24)" },
  6: { color: "#fb7185", glow: "rgba(251,113,133,0.24)" },
  7: { color: "#c084fc", glow: "rgba(192,132,252,0.24)" },
  8: { color: "#facc15", glow: "rgba(250,204,21,0.28)" },
};

export default function TierIdentityBadge({ tier, size = "lg" }: TierIdentityBadgeProps) {
  const accent = tierAccents[tier.id] ?? tierAccents[1];
  const compact = size === "sm";

  return (
    <div style={badgeStyle(accent.color, accent.glow, compact)} aria-label={`${tier.label} 身份徽章`}>
      <div style={sealStyle(accent.color, compact)}>{tier.id >= 8 ? "尊" : tier.id}</div>
      <div style={nameStyle(accent.color, compact)}>{tier.label}</div>
    </div>
  );
}

const badgeStyle = (color: string, glow: string, compact: boolean): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: compact ? "9px" : "12px",
  width: compact ? "auto" : "fit-content",
  maxWidth: "100%",
  padding: compact ? "9px 12px" : "14px 16px",
  borderRadius: compact ? "14px" : "18px",
  border: `1px solid ${color}66`,
  background: `linear-gradient(135deg, rgba(255,255,255,0.075), rgba(255,255,255,0.035)), radial-gradient(circle at top right, ${glow}, transparent 56%)`,
  boxShadow: compact ? `0 10px 24px ${glow}` : `0 16px 36px rgba(0,0,0,0.3), 0 0 24px ${glow}`,
  color: "#f8fafc",
});

const sealStyle = (color: string, compact: boolean): CSSProperties => ({
  flex: "0 0 auto",
  width: compact ? "34px" : "44px",
  height: compact ? "34px" : "44px",
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  border: `1px solid ${color}`,
  background: `${color}1f`,
  color,
  fontSize: compact ? "15px" : "18px",
  fontWeight: 950,
  boxShadow: `inset 0 0 16px ${color}33`,
});

const nameStyle = (color: string, compact: boolean): CSSProperties => ({
  color,
  fontSize: compact ? "15px" : "22px",
  fontWeight: 950,
  lineHeight: 1.05,
});
