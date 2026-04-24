import type { UserMetadata } from "@supabase/supabase-js";

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
    description: "初始合伙人星级。",
  },
  {
    id: 2,
    label: "米尔一星",
    minPoints: 100000,
    accent: "#60a5fa",
    description: "累计积分达到 100,000 后升级。",
  },
  {
    id: 3,
    label: "米尔二星",
    minPoints: 500000,
    accent: "#22c55e",
    description: "累计积分达到 500,000 后升级。",
  },
  {
    id: 4,
    label: "米尔三星",
    minPoints: 1000000,
    accent: "#14b8a6",
    description: "累计积分达到 1,000,000 后升级。",
  },
  {
    id: 5,
    label: "米尔四星",
    minPoints: 5000000,
    accent: "#f59e0b",
    description: "累计积分达到 5,000,000 后升级。",
  },
  {
    id: 6,
    label: "米尔五星",
    minPoints: 10000000,
    accent: "#fb7185",
    description: "累计积分达到 10,000,000 后升级。",
  },
  {
    id: 7,
    label: "米尔六星",
    minPoints: 30000000,
    accent: "#c084fc",
    description: "累计积分达到 30,000,000 后升级。",
  },
  {
    id: 8,
    label: "米尔至尊",
    minPoints: 50000000,
    accent: "#facc15",
    description: "累计积分达到 50,000,000 后升级。",
  },
];

export type MirPointSummary = {
  points: number;
  monthlyPoints: number;
  currentTier: MirPartnerTier;
  nextTier: MirPartnerTier | null;
  progressPercent: number;
  pointsToNextTier: number;
  monthKey: string;
  upgradedThisMonth: boolean;
};

export function buildMirPointSummary(metadata: UserMetadata | undefined, now = new Date()): MirPointSummary {
  const monthKey = getShanghaiMonthKey(now);
  const points = readMirPoints(metadata);
  const currentTier = getCurrentTier(points);
  const nextTier = MIR_PARTNER_TIERS.find((tier) => tier.id === currentTier.id + 1) ?? null;
  const pointsToNextTier = nextTier ? Math.max(nextTier.minPoints - points, 0) : 0;
  const monthlyPoints = readMonthlyPoints(metadata, monthKey);
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
    points,
    monthlyPoints,
    currentTier,
    nextTier,
    progressPercent,
    pointsToNextTier,
    monthKey,
    upgradedThisMonth: readString(metadata?.mir_upgraded_month_key) === monthKey,
  };
}

export function awardMirPoints({
  metadata,
  points,
  source,
  now = new Date(),
}: {
  metadata: UserMetadata | undefined;
  points: number;
  source: string;
  now?: Date;
}) {
  const monthKey = getShanghaiMonthKey(now);
  const awardedPoints = Math.max(0, Math.floor(points));
  const beforePoints = readMirPoints(metadata);
  const afterPoints = beforePoints + awardedPoints;
  const beforeTier = getCurrentTier(beforePoints);
  const afterTier = getCurrentTier(afterPoints);
  const currentMonthlyPoints = readMonthlyPoints(metadata, monthKey);
  const upgradedThisAward = afterTier.id > beforeTier.id;

  return {
    metadata: {
      ...(metadata ?? {}),
      mir_points: afterPoints,
      mir_month_key: monthKey,
      mir_month_points: currentMonthlyPoints + awardedPoints,
      mir_last_tier_id: afterTier.id,
      mir_upgraded_month_key: upgradedThisAward
        ? monthKey
        : readString(metadata?.mir_upgraded_month_key) || undefined,
      mir_last_point_source: source,
      mir_last_point_award: awardedPoints,
      mir_last_point_awarded_at: now.toISOString(),
    },
    beforePoints,
    afterPoints,
    awardedPoints,
    beforeTier,
    afterTier,
    upgradedThisAward,
  };
}

export function settleMonthlyMirPoints(metadata: UserMetadata | undefined, now = new Date()) {
  const monthKey = getShanghaiMonthKey(now);
  const summary = buildMirPointSummary(metadata, now);
  const alreadySettled = readString(metadata?.mir_monthly_settled_key) === monthKey;

  if (alreadySettled) {
    return {
      metadata: metadata ?? {},
      deductedPoints: 0,
      beforePoints: summary.points,
      afterPoints: summary.points,
      beforeTier: summary.currentTier,
      afterTier: summary.currentTier,
      skipped: true,
    };
  }

  const shouldSkipPenalty = summary.upgradedThisMonth;
  const penalty = shouldSkipPenalty ? 0 : Math.floor(summary.currentTier.minPoints * 0.2);
  const afterPoints = Math.max(0, summary.points - penalty);
  const afterTier = getCurrentTier(afterPoints);

  return {
    metadata: {
      ...(metadata ?? {}),
      mir_points: afterPoints,
      mir_month_points: 0,
      mir_month_key: getNextShanghaiMonthKey(now),
      mir_last_tier_id: afterTier.id,
      mir_monthly_settled_key: monthKey,
      mir_last_month_points: summary.monthlyPoints,
      mir_last_month_penalty: penalty,
      mir_last_month_tier_before: summary.currentTier.id,
      mir_last_month_tier_after: afterTier.id,
      mir_last_month_settled_at: now.toISOString(),
      mir_upgraded_month_key: undefined,
    },
    deductedPoints: penalty,
    beforePoints: summary.points,
    afterPoints,
    beforeTier: summary.currentTier,
    afterTier,
    skipped: false,
  };
}

export function readMirPoints(metadata: UserMetadata | undefined) {
  return readNumberFromKeys(metadata, ["mir_points", "partner_points", "total_points", "points"]);
}

export function getCurrentTier(points: number) {
  return [...MIR_PARTNER_TIERS]
    .reverse()
    .find((tier) => points >= tier.minPoints) ?? MIR_PARTNER_TIERS[0];
}

export function getShanghaiMonthKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
  }).format(now);
}

function getNextShanghaiMonthKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value ?? now.getUTCFullYear());
  const month = Number(parts.find((part) => part.type === "month")?.value ?? now.getUTCMonth() + 1);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}

function readMonthlyPoints(metadata: UserMetadata | undefined, monthKey: string) {
  if (readString(metadata?.mir_month_key) !== monthKey) {
    return 0;
  }

  return readNumber(metadata?.mir_month_points);
}

function readNumberFromKeys(metadata: UserMetadata | undefined, keys: string[]) {
  for (const key of keys) {
    const parsed = readNumber(metadata?.[key]);
    if (parsed > 0) {
      return parsed;
    }
  }

  return 0;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed));
    }
  }
  return 0;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
