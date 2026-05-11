import type { UserMetadata } from "@supabase/supabase-js";

export type AttendanceSummary = {
  today: string;
  checkedToday: boolean;
  totalDays: number;
  monthKey: string;
  checkedDates: string[];
  monthlyCheckedDates: string[];
  nextSevenBonusIn: number;
  nextThirtyBonusIn: number;
};

export type AttendanceAward = {
  basePoints: number;
  sevenDayBonus: number;
  thirtyDayBonus: number;
  totalAwarded: number;
  totalDays: number;
  date: string;
};

export function buildAttendanceSummary(metadata: UserMetadata | undefined, now = new Date()): AttendanceSummary {
  const today = getShanghaiDateKey(now);
  const monthKey = today.slice(0, 7);
  const checkedDates = readAttendanceDates(metadata);
  const totalDays = Math.max(readNumber(metadata?.attendance_total_days), checkedDates.length);
  const checkedToday = checkedDates.includes(today);

  return {
    today,
    checkedToday,
    totalDays,
    monthKey,
    checkedDates,
    monthlyCheckedDates: checkedDates.filter((date) => date.startsWith(monthKey)),
    nextSevenBonusIn: checkedToday ? daysUntilNext(totalDays, 7) : daysUntilNext(totalDays + 1, 7),
    nextThirtyBonusIn: checkedToday ? daysUntilNext(totalDays, 30) : daysUntilNext(totalDays + 1, 30),
  };
}

export function checkInAttendance(metadata: UserMetadata | undefined, now = new Date()) {
  const today = getShanghaiDateKey(now);
  const checkedDates = readAttendanceDates(metadata);
  const checkedToday = checkedDates.includes(today);

  if (checkedToday) {
    return {
      alreadyChecked: true,
      metadata: metadata ?? {},
      award: null,
      summary: buildAttendanceSummary(metadata, now),
    };
  }

  const nextDates = [today, ...checkedDates.filter((date) => date !== today)].slice(0, 420);
  const totalDays = Math.max(readNumber(metadata?.attendance_total_days), checkedDates.length) + 1;
  const sevenDayBonus = totalDays % 7 === 0 ? 1000 : 0;
  const thirtyDayBonus = totalDays % 30 === 0 ? 5000 : 0;
  const award: AttendanceAward = {
    basePoints: 100,
    sevenDayBonus,
    thirtyDayBonus,
    totalAwarded: 100 + sevenDayBonus + thirtyDayBonus,
    totalDays,
    date: today,
  };
  const nextMetadata: UserMetadata = {
    ...(metadata ?? {}),
    attendance_dates: nextDates,
    attendance_total_days: totalDays,
    attendance_last_date: today,
  };

  return {
    alreadyChecked: false,
    metadata: nextMetadata,
    award,
    summary: buildAttendanceSummary(nextMetadata, now),
  };
}

export function getShanghaiDateKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function readAttendanceDates(metadata: UserMetadata | undefined) {
  const raw = Array.isArray(metadata?.attendance_dates) ? metadata.attendance_dates : [];
  return Array.from(
    new Set(
      raw
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item))
    )
  ).sort((a, b) => b.localeCompare(a));
}

function daysUntilNext(totalDays: number, cycle: number) {
  const remainder = totalDays % cycle;
  return remainder === 0 ? cycle : cycle - remainder;
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
