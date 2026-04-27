import crypto from "node:crypto";
import type { User } from "@supabase/supabase-js";
import {
  buildMirPointSummary,
  MIR_PARTNER_TIERS,
  type MirPartnerTier,
} from "@/lib/mirPoints";

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
};

export type PartnerPointTransaction = {
  id: string;
  title: string;
  description: string;
  points: number;
  createdAt: string | null;
  source: string;
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
  const pointsSummary = buildMirPointSummary(user.user_metadata);

  return {
    partnerCode,
    uid,
    points: pointsSummary.points,
    monthlyPoints: pointsSummary.monthlyPoints,
    currentTier: pointsSummary.currentTier,
    nextTier: pointsSummary.nextTier,
    progressPercent: pointsSummary.progressPercent,
    pointsToNextTier: pointsSummary.pointsToNextTier,
    upgradedThisMonth: pointsSummary.upgradedThisMonth,
    pointTransactions: readPointTransactions(user.user_metadata),
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
