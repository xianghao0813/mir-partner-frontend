import { type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type RiskSeverity = "low" | "medium" | "high" | "critical";

export type RiskEventInput = {
  userId?: string;
  eventType: string;
  severity: RiskSeverity;
  score: number;
  source?: string;
  details?: Record<string, unknown>;
  request?: NextRequest | Request;
  autoFreeze?: boolean;
};

export const RISK_FREEZE_THRESHOLD = 100;
const RISK_WINDOW_HOURS = 24;
const AUTO_FREEZE_HOURS = 24;

export async function recordRiskEvent(input: RiskEventInput) {
  const score = Math.max(0, Math.floor(input.score));
  const ipAddress = getRequestIp(input.request);
  const userAgent = input.request?.headers.get("user-agent") ?? null;

  const { error } = await supabaseAdmin.from("risk_events").insert({
    user_id: input.userId || null,
    event_type: input.eventType,
    severity: input.severity,
    score,
    source: input.source ?? "system",
    details: input.details ?? {},
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  if (error) {
    if (error.code !== "42P01") {
      console.error("[risk event insert]", error.message);
    }
    return { inserted: false, frozen: false, totalScore: 0 };
  }

  if (!input.userId || !input.autoFreeze) {
    return { inserted: true, frozen: false, totalScore: score };
  }

  const totalScore = await getRecentRiskScore(input.userId);
  if (totalScore < RISK_FREEZE_THRESHOLD) {
    return { inserted: true, frozen: false, totalScore };
  }

  await freezeUserForRisk(input.userId, totalScore, input.eventType);
  return { inserted: true, frozen: true, totalScore };
}

export async function detectRapidPaymentAttempts({
  userId,
  request,
  source,
}: {
  userId: string;
  request: NextRequest;
  source: "payment_order" | "coupon_order";
}) {
  const since = new Date(Date.now() - 60 * 1000).toISOString();
  const [paymentCount, couponCount] = await Promise.all([
    countRecentRows("payment_orders", userId, since),
    countRecentRows("coupon_checkout_sessions", userId, since),
  ]);
  const attempts = paymentCount + couponCount;

  if (attempts < 5) {
    return { blocked: false, attempts };
  }

  const severity: RiskSeverity = attempts >= 8 ? "critical" : "high";
  const score = attempts >= 8 ? 100 : 70;
  const result = await recordRiskEvent({
    userId,
    eventType: "rapid_payment_attempts",
    severity,
    score,
    source,
    request,
    autoFreeze: attempts >= 8,
    details: {
      attempts,
      paymentCount,
      couponCount,
      windowSeconds: 60,
    },
  });

  return {
    blocked: attempts >= 5,
    attempts,
    frozen: result.frozen,
    totalScore: result.totalScore,
  };
}

async function countRecentRows(table: "payment_orders" | "coupon_checkout_sessions", userId: string, since: string) {
  const { count, error } = await supabaseAdmin
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);

  if (error) {
    if (error.code !== "42P01") {
      console.error(`[risk count ${table}]`, error.message);
    }
    return 0;
  }

  return count ?? 0;
}

async function getRecentRiskScore(userId: string) {
  const since = new Date(Date.now() - RISK_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("risk_events")
    .select("score")
    .eq("user_id", userId)
    .is("resolved_at", null)
    .gte("created_at", since);

  if (error) {
    if (error.code !== "42P01") {
      console.error("[risk score]", error.message);
    }
    return 0;
  }

  return (data ?? []).reduce((sum, item) => sum + Number(item.score ?? 0), 0);
}

async function freezeUserForRisk(userId: string, totalScore: number, eventType: string) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data.user) {
    return;
  }

  const metadata = data.user.user_metadata ?? {};
  if (String(metadata.account_status ?? "").toLowerCase() === "frozen") {
    return;
  }

  await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...metadata,
      account_status: "frozen",
      account_frozen_until: new Date(Date.now() + AUTO_FREEZE_HOURS * 60 * 60 * 1000).toISOString(),
      account_frozen_reason: "系统检测到账户存在异常操作，已自动冻结并等待人工复核。",
      account_frozen_at: new Date().toISOString(),
      account_frozen_by: "risk-control",
      account_risk_score: totalScore,
      account_risk_event_type: eventType,
    },
  });
}

function getRequestIp(request?: NextRequest | Request) {
  if (!request) {
    return null;
  }

  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    null
  );
}
