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
