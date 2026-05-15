import type { UserMetadata } from "@supabase/supabase-js";

export const ATTENDANCE_DAILY_POINTS = 100;
export const ATTENDANCE_MAKEUP_COST = 200;
export const ATTENDANCE_SEVEN_DAY_BONUS = 1000;
export const ATTENDANCE_TWENTY_FIVE_DAY_BONUS = 5000;

export type AttendanceSummary = {
  today: string;
  checkedToday: boolean;
  monthKey: string;
  checkedDates: string[];
  makeupDates: string[];
  monthlyCheckedDates: string[];
  monthlyMakeupDates: string[];
  monthlyCheckedCount: number;
  currentStreak: number;
  longestStreak: number;
  nextSevenBonusIn: number;
  nextTwentyFiveBonusIn: number;
  availableMakeupDates: string[];
  makeupCost: number;
};

export type AttendanceAward = {
  basePoints: number;
  makeupCost: number;
  sevenDayBonus: number;
  twentyFiveDayBonus: number;
  totalAwarded: number;
  checkedCount: number;
  currentStreak: number;
  date: string;
  type: "checkin" | "makeup";
};

type AttendanceAction =
  | { type: "checkin"; date?: string }
  | { type: "makeup"; date: string; currentPoints: number };

export function buildAttendanceSummary(metadata: UserMetadata | undefined, now = new Date()): AttendanceSummary {
  const today = getShanghaiDateKey(now);
  const monthKey = today.slice(0, 7);
  const checkedDates = readAttendanceDates(metadata);
  const makeupDates = readAttendanceMakeupDates(metadata);
  const monthlyCheckedDates = checkedDates.filter((date) => date.startsWith(monthKey));
  const monthlyMakeupDates = makeupDates.filter((date) => date.startsWith(monthKey));
  const currentStreak = calculateCurrentMonthStreak(monthlyCheckedDates, today);
  const longestStreak = calculateLongestStreak(monthlyCheckedDates);

  return {
    today,
    checkedToday: monthlyCheckedDates.includes(today),
    monthKey,
    checkedDates,
    makeupDates,
    monthlyCheckedDates,
    monthlyMakeupDates,
    monthlyCheckedCount: monthlyCheckedDates.length,
    currentStreak,
    longestStreak,
    nextSevenBonusIn: daysUntilNextStreakBonus(currentStreak, 7),
    nextTwentyFiveBonusIn: daysUntilNextStreakBonus(currentStreak, 25),
    availableMakeupDates: getAvailableMakeupDates(monthKey, today, monthlyCheckedDates),
    makeupCost: ATTENDANCE_MAKEUP_COST,
  };
}

export function applyAttendanceAction(
  metadata: UserMetadata | undefined,
  action: AttendanceAction,
  now = new Date()
) {
  const today = getShanghaiDateKey(now);
  const monthKey = today.slice(0, 7);
  const targetDate = action.type === "checkin" ? action.date ?? today : action.date;
  const checkedDates = readAttendanceDates(metadata);
  const makeupDates = readAttendanceMakeupDates(metadata);

  if (!targetDate.startsWith(monthKey)) {
    return {
      ok: false as const,
      code: "invalid_month",
      message: "只能处理本月签到。",
      metadata: metadata ?? {},
      award: null,
      summary: buildAttendanceSummary(metadata, now),
    };
  }

  if (action.type === "checkin" && targetDate !== today) {
    return {
      ok: false as const,
      code: "invalid_checkin_date",
      message: "只能签到今天。",
      metadata: metadata ?? {},
      award: null,
      summary: buildAttendanceSummary(metadata, now),
    };
  }

  if (action.type === "makeup") {
    if (targetDate >= today) {
      return {
        ok: false as const,
        code: "invalid_makeup_date",
        message: "只能补签今天之前的日期。",
        metadata: metadata ?? {},
        award: null,
        summary: buildAttendanceSummary(metadata, now),
      };
    }

    if (action.currentPoints < ATTENDANCE_MAKEUP_COST) {
      return {
        ok: false as const,
        code: "insufficient_points",
        message: "积分不足，补签需要 200 MIR 积分。",
        metadata: metadata ?? {},
        award: null,
        summary: buildAttendanceSummary(metadata, now),
      };
    }
  }

  if (checkedDates.includes(targetDate)) {
    return {
      ok: false as const,
      code: "already_checked",
      message: targetDate === today ? "今日已经签到。" : "该日期已经签到。",
      metadata: metadata ?? {},
      award: null,
      summary: buildAttendanceSummary(metadata, now),
    };
  }

  const previousMonthlyDates = checkedDates.filter((date) => date.startsWith(monthKey));
  const previousBonusKeys = readBonusKeys(metadata);
  const nextCheckedDates = [
    targetDate,
    ...checkedDates.filter((date) => date.startsWith(monthKey) && date !== targetDate),
  ].sort((a, b) => b.localeCompare(a));
  const currentStreak = calculateCurrentMonthStreak(nextCheckedDates, today);
  const checkedCount = nextCheckedDates.length;
  const sevenDayBonus =
    currentStreak >= 7 && !previousBonusKeys.has(`${monthKey}:streak:7`)
      ? ATTENDANCE_SEVEN_DAY_BONUS
      : 0;
  const twentyFiveDayBonus =
    currentStreak >= 25 && !previousBonusKeys.has(`${monthKey}:streak:25`)
      ? ATTENDANCE_TWENTY_FIVE_DAY_BONUS
      : 0;
  const basePoints = action.type === "checkin" ? ATTENDANCE_DAILY_POINTS : 0;
  const makeupCost = action.type === "makeup" ? ATTENDANCE_MAKEUP_COST : 0;
  const award: AttendanceAward = {
    basePoints,
    makeupCost,
    sevenDayBonus,
    twentyFiveDayBonus,
    totalAwarded: basePoints + sevenDayBonus + twentyFiveDayBonus - makeupCost,
    checkedCount,
    currentStreak,
    date: targetDate,
    type: action.type,
  };
  const nextBonusKeys = new Set(previousBonusKeys);
  if (sevenDayBonus > 0) nextBonusKeys.add(`${monthKey}:streak:7`);
  if (twentyFiveDayBonus > 0) nextBonusKeys.add(`${monthKey}:streak:25`);
  const nextMakeupDates =
    action.type === "makeup"
      ? [
          targetDate,
          ...makeupDates.filter((date) => date.startsWith(monthKey) && date !== targetDate),
        ].sort((a, b) => b.localeCompare(a))
      : makeupDates.filter((date) => date.startsWith(monthKey));
  const nextMetadata: UserMetadata = {
    ...(metadata ?? {}),
    attendance_dates: nextCheckedDates,
    attendance_makeup_dates: nextMakeupDates,
    attendance_month_key: monthKey,
    attendance_month_checked_count: checkedCount,
    attendance_current_streak: currentStreak,
    attendance_longest_streak: Math.max(
      calculateLongestStreak(previousMonthlyDates),
      calculateLongestStreak(nextCheckedDates)
    ),
    attendance_last_date: targetDate,
    attendance_bonus_keys: Array.from(nextBonusKeys)
      .filter((key) => key.startsWith(`${monthKey}:`))
      .sort(),
  };

  return {
    ok: true as const,
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
  return readDateArray(metadata?.attendance_dates);
}

function readAttendanceMakeupDates(metadata: UserMetadata | undefined) {
  return readDateArray(metadata?.attendance_makeup_dates);
}

function readDateArray(value: unknown) {
  const raw = Array.isArray(value) ? value : [];
  return Array.from(
    new Set(
      raw
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item))
    )
  ).sort((a, b) => b.localeCompare(a));
}

function readBonusKeys(metadata: UserMetadata | undefined) {
  const raw = Array.isArray(metadata?.attendance_bonus_keys) ? metadata.attendance_bonus_keys : [];
  return new Set(raw.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean));
}

function getAvailableMakeupDates(monthKey: string, today: string, checkedDates: string[]) {
  const checked = new Set(checkedDates);
  const days = getMonthDaysUntil(monthKey, today);
  return days.filter((date) => date < today && !checked.has(date)).sort((a, b) => b.localeCompare(a));
}

function calculateCurrentMonthStreak(monthlyCheckedDates: string[], today: string) {
  const checked = new Set(monthlyCheckedDates);
  const monthKey = today.slice(0, 7);
  let cursor = checked.has(today) ? today : previousDateKey(today);
  let streak = 0;

  while (cursor.startsWith(monthKey) && checked.has(cursor)) {
    streak += 1;
    cursor = previousDateKey(cursor);
  }

  return streak;
}

function calculateLongestStreak(monthlyCheckedDates: string[]) {
  const sorted = [...monthlyCheckedDates].sort();
  let longest = 0;
  let current = 0;
  let previous = "";

  for (const date of sorted) {
    current = previous && previousDateKey(date) === previous ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = date;
  }

  return longest;
}

function daysUntilNextStreakBonus(currentStreak: number, target: number) {
  return Math.max(0, target - Math.min(currentStreak, target));
}

function getMonthDaysUntil(monthKey: string, today: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const result: string[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${monthKey}-${String(day).padStart(2, "0")}`;
    if (date > today) break;
    result.push(date);
  }

  return result;
}

function previousDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
