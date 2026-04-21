import crypto from "node:crypto";
import type { User } from "@supabase/supabase-js";

export type MirPartnerTier = {
  id: number;
  label: string;
  minPoints: number;
  accent: string;
  description: string;
};

export const MIR_PARTNER_TIERS: MirPartnerTier[] = [
  {
    id: 1,
    label: "米尔新星",
    minPoints: 0,
    accent: "#94a3b8",
    description: "完成接入后获得初始身份，开始累计米尔积分。",
  },
  {
    id: 2,
    label: "米尔一星",
    minPoints: 1000,
    accent: "#60a5fa",
    description: "具备稳定转化基础，可查看基础成长数据。",
  },
  {
    id: 3,
    label: "米尔二星",
    minPoints: 3000,
    accent: "#22c55e",
    description: "首页充值与游戏内订单同步后，积分增速开始明显。",
  },
  {
    id: 4,
    label: "米尔三星",
    minPoints: 8000,
    accent: "#14b8a6",
    description: "进入活跃增长阶段，可持续积累长期价值。",
  },
  {
    id: 5,
    label: "米尔四星",
    minPoints: 20000,
    accent: "#f59e0b",
    description: "形成成熟合作能力，积分规模达到中高阶。",
  },
  {
    id: 6,
    label: "米尔五星",
    minPoints: 50000,
    accent: "#fb7185",
    description: "具备稳定订单贡献，进入重点成长区间。",
  },
  {
    id: 7,
    label: "米尔六星",
    minPoints: 100000,
    accent: "#c084fc",
    description: "高等级合作身份，拥有更强品牌与转化影响力。",
  },
  {
    id: 8,
    label: "共创合伙人",
    minPoints: 200000,
    accent: "#facc15",
    description: "最高等级身份，代表持续共创与顶级贡献。",
  },
];

export type PartnerProfileSummary = {
  partnerCode: string;
  uid: string;
  points: number;
  currentTier: MirPartnerTier;
  nextTier: MirPartnerTier | null;
  progressPercent: number;
  pointsToNextTier: number;
};

export function buildPartnerProfileSummary(user: User): PartnerProfileSummary {
  const uid = String(user.user_metadata?.quicksdk_uid ?? "").trim();
  const partnerCode =
    readStringMetadata(user, [
      "partner_code",
      "mir_partner_code",
      "partnerCode",
      "mirPartnerCode",
    ]) || createPartnerCode(user.id);
  const points = readNumericMetadata(user, [
    "mir_points",
    "partner_points",
    "total_points",
    "points",
  ]);
  const currentTier = getCurrentTier(points);
  const nextTier = MIR_PARTNER_TIERS.find((tier) => tier.id === currentTier.id + 1) ?? null;
  const pointsToNextTier = nextTier ? Math.max(nextTier.minPoints - points, 0) : 0;
  const progressPercent = nextTier
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(
            ((points - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100
          )
        )
      )
    : 100;

  return {
    partnerCode,
    uid,
    points,
    currentTier,
    nextTier,
    progressPercent,
    pointsToNextTier,
  };
}

function getCurrentTier(points: number) {
  return [...MIR_PARTNER_TIERS]
    .reverse()
    .find((tier) => points >= tier.minPoints) ?? MIR_PARTNER_TIERS[0];
}

function createPartnerCode(userId: string) {
  const digest = crypto.createHash("sha256").update(`mir-partner:${userId}`, "utf8").digest("hex");
  const numericCode = String(parseInt(digest.slice(0, 12), 16) % 100000000).padStart(8, "0");
  return `MP${numericCode}`;
}

function readStringMetadata(user: User, keys: string[]) {
  for (const key of keys) {
    const value = user.user_metadata?.[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function readNumericMetadata(user: User, keys: string[]) {
  for (const key of keys) {
    const value = user.user_metadata?.[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.max(0, Math.floor(value));
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return Math.max(0, Math.floor(parsed));
      }
    }
  }

  return 0;
}
