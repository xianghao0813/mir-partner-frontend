import crypto from "node:crypto";
import type { User } from "@supabase/supabase-js";
import {
  buildMirPointSummary,
  getCurrentTier,
  getShanghaiMonthKey,
  hasMirImportBaselineOverride,
  isAtOrAfterMirImportBaseline,
  MIR_PARTNER_TIERS,
  readMirImportBaselineAt,
  readMirImportBaselinePoints,
  type MirPartnerTier,
} from "@/lib/mirPoints";
import { getQuickSdkUserOrders, type QuickSdkOrderData } from "@/lib/quicksdk";
import {
  getGrantedTierCouponIdFromDb,
  getTierCouponBenefits,
  getTierCouponClaimState,
  type TierCouponBenefit,
} from "@/lib/tierCoupons";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { readPointTransactionsFromDb } from "@/lib/userLedgers";
import { getRechargeDisplayName } from "@/lib/rechargeDisplay";

export { MIR_PARTNER_TIERS, type MirPartnerTier };

export type PartnerProfileSummary = {
  partnerCode: string;
  uid: string;
  points: number;
  monthlyPoints: number;
  currentTier: MirPartnerTier;
  nextTier: MirPartnerTier | null;
  progressPercent: number;
  pointsToNextTier: number;
  upgradedThisMonth: boolean;
  pointTransactions: PartnerPointTransaction[];
  couponBenefits: TierCouponBenefit[];
  tierCouponClaim: {
    monthKey: string;
    currentTierId: number;
    grantedTierId: number;
    pendingCount: number;
    claimable: boolean;
  };
};

export type PartnerPointTransaction = {
  id: string;
  title: string;
  description: string;
  points: number;
  createdAt: string | null;
  source: string;
};

export async function buildPartnerProfileSummary(
  user: User,
  options: { includeQuickSdkFallback?: boolean } = {}
): Promise<PartnerProfileSummary> {
  const includeQuickSdkFallback = options.includeQuickSdkFallback ?? true;
  const uid = String(user.user_metadata?.quicksdk_uid ?? "").trim();
  const partnerCode =
    readStringMetadata(user, [
      "partner_code",
      "mir_partner_code",
      "partnerCode",
      "mirPartnerCode",
    ]) || createPartnerCode(user.id);
  const monthKey = getShanghaiMonthKey();
  const [dbPointTransactions, dbMonthlyPointTransactions] = await Promise.all([
    readPointTransactionsFromDb(user.id),
    readPointTransactionsFromDb(user.id, monthKey),
  ]);
  const importBaselineAt = readMirImportBaselineAt(user.user_metadata);
  const importBaselinePoints = readMirImportBaselinePoints(user.user_metadata);
  const hasImportBaseline = hasMirImportBaselineOverride(user.user_metadata);
  const metadataPointTransactions = readPointTransactions(user.user_metadata);
  const fallbackPointTransactions =
    metadataPointTransactions.length > 0
      ? filterImportedPointTransactions(metadataPointTransactions, user.user_metadata)
      : includeQuickSdkFallback
        ? await readQuickSdkPointTransactions(uid, user.user_metadata)
        : [];
  const usableDbPointTransactions = filterImportedPointTransactions(dbPointTransactions, user.user_metadata);
  const usableDbMonthlyPointTransactions = filterImportedPointTransactions(dbMonthlyPointTransactions, user.user_metadata);
  const earnedPointTransactions = dbPointTransactions.length > 0 ? usableDbPointTransactions : fallbackPointTransactions;
  const baselineTransaction = hasImportBaseline
    ? [{
        id: `import-baseline-${importBaselineAt?.getTime() ?? "unknown"}`,
        title: "导入初始积分",
        description: "管理员导入的积分基准，基准时间之前的充值不再重复计入积分。",
        points: importBaselinePoints,
        createdAt: importBaselineAt?.toISOString() ?? null,
        source: "admin_import_baseline",
      }]
    : [];
  const pointTransactions = [...baselineTransaction, ...earnedPointTransactions];
  const pointsSummary = buildMirPointSummary(
    recalculatedMetadata(user.user_metadata, pointTransactions)
  );
  const recalculatedPoints = earnedPointTransactions.reduce((sum, entry) => sum + entry.points, 0);
  const effectivePoints = hasImportBaseline
    ? Math.max(0, importBaselinePoints + recalculatedPoints)
    : pointTransactions.length > 0
      ? Math.max(0, pointTransactions.reduce((sum, entry) => sum + entry.points, 0))
      : pointsSummary.points;
  const effectiveMonthlyPoints =
    dbMonthlyPointTransactions.length > 0
      ? usableDbMonthlyPointTransactions.reduce((sum, entry) => sum + Math.max(0, entry.points), 0)
      : earnedPointTransactions.length > 0
        ? earnedPointTransactions
            .filter((entry) => (entry.createdAt ?? "").startsWith(monthKey))
            .reduce((sum, entry) => sum + Math.max(0, entry.points), 0)
      : pointsSummary.monthlyPoints;
  const currentTier = getCurrentTier(effectivePoints);
  const dbGrantedTierId = await getGrantedTierCouponIdFromDb({
    supabaseAdmin,
    userId: user.id,
    monthKey,
  });
  const claimBaseMetadata = {
    ...recalculatedMetadata(user.user_metadata, pointTransactions),
    mir_coupon_grant_month_key: monthKey,
    mir_coupon_grant_tier_id: Math.max(
      dbGrantedTierId,
      getTierCouponClaimState(user.user_metadata, effectivePoints).grantedTierId
    ),
  };
  const nextTier = MIR_PARTNER_TIERS.find((tier) => tier.id === currentTier.id + 1) ?? null;
  const pointsToNextTier = nextTier ? Math.max(nextTier.minPoints - effectivePoints, 0) : 0;
  const progressPercent = nextTier
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(
            ((effectivePoints - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100
          )
        )
      )
    : 100;

  return {
    partnerCode,
    uid,
    points: effectivePoints,
    monthlyPoints: effectiveMonthlyPoints,
    currentTier,
    nextTier,
    progressPercent,
    pointsToNextTier,
    upgradedThisMonth: pointsSummary.upgradedThisMonth,
    pointTransactions,
    couponBenefits: getTierCouponBenefits(currentTier.id),
    tierCouponClaim: getTierCouponClaimState(claimBaseMetadata, effectivePoints),
  };
}

function recalculatedMetadata(metadata: User["user_metadata"], pointTransactions: PartnerPointTransaction[]) {
  if (pointTransactions.length === 0) {
    return metadata;
  }

  return {
    ...(metadata ?? {}),
    mir_points: Math.max(0, pointTransactions.reduce((sum, entry) => sum + entry.points, 0)),
  };
}

export function createPartnerCode(userId: string) {
  const digest = crypto.createHash("sha256").update(`mir-partner:${userId}`, "utf8").digest("hex");
  const numericCode = String(parseInt(digest.slice(0, 12), 16) % 1000000).padStart(6, "0");
  return `LP${numericCode}`;
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

function readPointTransactions(metadata: User["user_metadata"]): PartnerPointTransaction[] {
  const raw = Array.isArray(metadata?.mir_point_transactions) ? metadata.mir_point_transactions : [];

  return raw
    .map((item, index) => normalizePointTransaction(item, index))
    .filter((item): item is PartnerPointTransaction => item !== null)
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

function normalizePointTransaction(item: unknown, index: number): PartnerPointTransaction | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const source = item as Record<string, unknown>;
  const points = readNumber(source.points) || readNumber(source.amount) || readNumber(source.value);
  const createdAt = readIsoString(source.createdAt) || readIsoString(source.created_at);

  if (!points && !createdAt) {
    return null;
  }

  return {
    id: readString(source.id) || `point-${index}`,
    title: readString(source.title) || "MIR 积分",
    description: readString(source.description) || readString(source.source) || "-",
    points,
    createdAt,
    source: readString(source.source) || readString(source.type) || "point",
  };
}

function filterImportedPointTransactions(
  transactions: PartnerPointTransaction[],
  metadata: User["user_metadata"]
) {
  if (!hasMirImportBaselineOverride(metadata)) {
    return transactions;
  }

  return transactions.filter((transaction) => {
    if (transaction.source === "admin_import_baseline") {
      return false;
    }

    const createdAt = transaction.createdAt ? new Date(transaction.createdAt) : null;
    return createdAt && !Number.isNaN(createdAt.getTime()) && isAtOrAfterMirImportBaseline(metadata, createdAt);
  });
}

async function readQuickSdkPointTransactions(
  uid: string,
  metadata?: User["user_metadata"]
): Promise<PartnerPointTransaction[]> {
  if (!uid) {
    return [];
  }

  const orders = await getQuickSdkUserOrders({ userId: uid, payStatus: "1" }).catch((error) => {
    console.error("[QuickSDK point ledger fallback]", error);
    return [] as QuickSdkOrderData[];
  });

  return orders
    .filter((order) =>
      !isPlatformCoinOrder(order) &&
      isAtOrAfterMirImportBaseline(metadata, createDateFromSdkTimestamp(order.payTime ?? order.createTime))
    )
    .map((order) => {
      const orderId = order.productOrderNo || order.orderNo;
      const amount = order.dealAmount || order.amount;

      return {
        id: `point-sdk-order-${orderId}`,
        title: getRechargeDisplayName(order.productName),
        description: `订单 ${orderId} 自动发放`,
        points: Math.floor(amount * 100),
        createdAt: createDateFromSdkTimestamp(order.payTime ?? order.createTime).toISOString(),
        source: "wallet_recharge",
      };
    })
    .filter((item) => item.points > 0)
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

function isPlatformCoinOrder(order: QuickSdkOrderData) {
  return order.payType === "173" || containsPlatformCoin(order.productName) || containsPlatformCoin(order.payTypeName);
}

function containsPlatformCoin(value: string | undefined) {
  return typeof value === "string" && value.includes("平台币");
}

function createDateFromSdkTimestamp(value: number | null) {
  if (!value || !Number.isFinite(value)) {
    return new Date();
  }

  const milliseconds = value > 9999999999 ? value : value * 1000;
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.floor(parsed);
    }
  }

  return 0;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readIsoString(value: unknown) {
  const raw = readString(value);
  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString();
}
