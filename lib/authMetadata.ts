import type { UserMetadata } from "@supabase/supabase-js";

export function compactAuthMetadata(metadata: UserMetadata | undefined): UserMetadata {
  const compacted: UserMetadata = { ...(metadata ?? {}) };
  const monthKey = getShanghaiMonthKey();

  compacted.wallet_transactions = null;
  compacted.mir_point_transactions = null;
  compacted.boss_last_hit_runs = null;
  compacted.attendance_dates = pruneDateArrayToMonth(compacted.attendance_dates, monthKey);
  compacted.attendance_makeup_dates = pruneDateArrayToMonth(compacted.attendance_makeup_dates, monthKey);
  compacted.attendance_bonus_keys = pruneBonusKeysToMonth(compacted.attendance_bonus_keys, monthKey);

  return compacted;
}

function getShanghaiMonthKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

function pruneDateArrayToMonth(value: unknown, monthKey: string) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.startsWith(monthKey) && /^\d{4}-\d{2}-\d{2}$/.test(item))
    )
  ).sort((a, b) => b.localeCompare(a));
}

function pruneBonusKeysToMonth(value: unknown, monthKey: string) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.startsWith(`${monthKey}:`))
    )
  ).sort();
}
