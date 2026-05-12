import type { UserMetadata } from "@supabase/supabase-js";
import {
  type AttendanceAward,
  type AttendanceSummary,
  applyAttendanceAction,
  buildAttendanceSummary,
  getShanghaiDateKey,
} from "@/lib/attendance";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { readPointTransactionsFromDb } from "@/lib/userLedgers";

type AttendanceAction =
  | { type: "checkin"; date?: string }
  | { type: "makeup"; date: string; currentPoints: number };

export async function readAttendanceSummaryFromDb(
  userId: string,
  metadata: UserMetadata | undefined,
  now = new Date()
): Promise<AttendanceSummary> {
  const monthKey = getShanghaiDateKey(now).slice(0, 7);

  await migrateAttendanceMetadataToDb(userId, metadata, monthKey);
  await recoverAttendanceRecordsFromPointLedger(userId, monthKey);

  const dbMetadata = await buildAttendanceMetadataFromDb(userId, monthKey, metadata);
  if (!dbMetadata) {
    return buildAttendanceSummary(metadata, now);
  }

  return buildAttendanceSummary(dbMetadata, now);
}

export async function applyAttendanceActionInDb({
  userId,
  metadata,
  action,
  now = new Date(),
}: {
  userId: string;
  metadata: UserMetadata | undefined;
  action: AttendanceAction;
  now?: Date;
}): Promise<
  | {
      ok: true;
      metadata: UserMetadata;
      award: AttendanceAward;
      summary: AttendanceSummary;
    }
  | {
      ok: false;
      code: string;
      message: string;
      metadata: UserMetadata;
      award: null;
      summary: AttendanceSummary;
    }
> {
  const monthKey = getShanghaiDateKey(now).slice(0, 7);

  await migrateAttendanceMetadataToDb(userId, metadata, monthKey);
  await recoverAttendanceRecordsFromPointLedger(userId, monthKey);

  const dbMetadata = await buildAttendanceMetadataFromDb(userId, monthKey, metadata);
  const result = applyAttendanceAction(dbMetadata ?? metadata, action, now);

  if (!result.ok || !result.award) {
    return result;
  }

  const { error: recordError } = await supabaseAdmin.from("attendance_records").upsert(
    {
      user_id: userId,
      attendance_date: result.award.date,
      month_key: monthKey,
      type: result.award.type,
    },
    { onConflict: "user_id,attendance_date" }
  );

  if (recordError) {
    throw new Error(recordError.message);
  }

  await Promise.all([
    result.award.sevenDayBonus > 0
      ? insertBonusClaim(userId, monthKey, "streak:7")
      : Promise.resolve(),
    result.award.twentyFiveDayBonus > 0
      ? insertBonusClaim(userId, monthKey, "streak:25")
      : Promise.resolve(),
  ]);

  const nextMetadata = await buildAttendanceMetadataFromDb(userId, monthKey, result.metadata);

  return {
    ...result,
    metadata: nextMetadata ?? result.metadata,
    summary: nextMetadata ? buildAttendanceSummary(nextMetadata, now) : result.summary,
  };
}

async function buildAttendanceMetadataFromDb(
  userId: string,
  monthKey: string,
  baseMetadata: UserMetadata | undefined
) {
  const [records, bonusKeys] = await Promise.all([
    readAttendanceRecords(userId, monthKey),
    readAttendanceBonusKeys(userId, monthKey),
  ]);

  if (!records) {
    return null;
  }

  const checkedDates = records.map((record) => record.date);
  const makeupDates = records
    .filter((record) => record.type === "makeup")
    .map((record) => record.date);

  return {
    ...(baseMetadata ?? {}),
    attendance_dates: checkedDates,
    attendance_makeup_dates: makeupDates,
    attendance_bonus_keys: bonusKeys,
    attendance_month_key: monthKey,
    attendance_month_checked_count: checkedDates.length,
  };
}

async function migrateAttendanceMetadataToDb(
  userId: string,
  metadata: UserMetadata | undefined,
  monthKey: string
) {
  const dates = readDateArray(metadata?.attendance_dates).filter((date) => date.startsWith(monthKey));
  const makeupDates = new Set(
    readDateArray(metadata?.attendance_makeup_dates).filter((date) => date.startsWith(monthKey))
  );

  if (dates.length === 0) {
    return;
  }

  const { error } = await supabaseAdmin.from("attendance_records").upsert(
    dates.map((date) => ({
      user_id: userId,
      attendance_date: date,
      month_key: monthKey,
      type: makeupDates.has(date) ? "makeup" : "checkin",
    })),
    { onConflict: "user_id,attendance_date", ignoreDuplicates: true }
  );

  if (error) {
    console.error("[attendance_records migrate]", error);
  }

  const bonusKeys = readStringArray(metadata?.attendance_bonus_keys)
    .filter((key) => key.startsWith(`${monthKey}:streak:`))
    .map((key) => key.replace(`${monthKey}:`, ""));

  await Promise.all(
    bonusKeys.map((bonusType) =>
      bonusType === "streak:7" || bonusType === "streak:25"
        ? insertBonusClaim(userId, monthKey, bonusType)
        : Promise.resolve()
    )
  );
}

async function readAttendanceRecords(userId: string, monthKey: string) {
  const { data, error } = await supabaseAdmin
    .from("attendance_records")
    .select("attendance_date,type")
    .eq("user_id", userId)
    .eq("month_key", monthKey)
    .order("attendance_date", { ascending: false });

  if (error) {
    console.error("[attendance_records read]", error);
    return null;
  }

  return (data ?? []).map((record) => ({
    date: readDate(record.attendance_date),
    type: record.type === "makeup" ? "makeup" : "checkin",
  }));
}

async function recoverAttendanceRecordsFromPointLedger(userId: string, monthKey: string) {
  const transactions = await readPointTransactionsFromDb(userId, monthKey);
  const rows = transactions
    .map((transaction) => {
      const date =
        readDateFromTransactionKey(transaction.id, "point-checkin-") ||
        readDateFromTransactionKey(transaction.id, "point-makeup-") ||
        readDate(transaction.createdAt);
      const source = readString(transaction.source);

      if (!date.startsWith(monthKey)) {
        return null;
      }

      if (source !== "daily_attendance" && source !== "attendance_makeup") {
        return null;
      }

      return {
        user_id: userId,
        attendance_date: date,
        month_key: monthKey,
        type: source === "attendance_makeup" ? "makeup" : "checkin",
      };
    })
    .filter((row): row is {
      user_id: string;
      attendance_date: string;
      month_key: string;
      type: "checkin" | "makeup";
    } => row !== null);

  if (rows.length === 0) {
    return;
  }

  const uniqueRows = Array.from(
    new Map(rows.map((row) => [`${row.user_id}:${row.attendance_date}`, row])).values()
  );

  const { error } = await supabaseAdmin.from("attendance_records").upsert(
    uniqueRows,
    { onConflict: "user_id,attendance_date", ignoreDuplicates: true }
  );

  if (error && error.code !== "42P01") {
    console.error("[attendance_records recover from points]", error);
  }
}

function readDateFromTransactionKey(value: string, prefix: string) {
  if (!value.startsWith(prefix)) {
    return "";
  }

  const date = value.slice(prefix.length, prefix.length + 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

async function readAttendanceBonusKeys(userId: string, monthKey: string) {
  const { data, error } = await supabaseAdmin
    .from("attendance_bonus_claims")
    .select("bonus_type")
    .eq("user_id", userId)
    .eq("month_key", monthKey);

  if (error) {
    console.error("[attendance_bonus_claims read]", error);
    return [];
  }

  return (data ?? [])
    .map((record) => readString(record.bonus_type))
    .filter((type) => type === "streak:7" || type === "streak:25")
    .map((type) => `${monthKey}:${type}`);
}

async function insertBonusClaim(userId: string, monthKey: string, bonusType: "streak:7" | "streak:25") {
  const { error } = await supabaseAdmin.from("attendance_bonus_claims").upsert(
    {
      user_id: userId,
      month_key: monthKey,
      bonus_type: bonusType,
    },
    { onConflict: "user_id,month_key,bonus_type", ignoreDuplicates: true }
  );

  if (error) {
    console.error("[attendance_bonus_claims insert]", error);
  }
}

function readDate(value: unknown) {
  return typeof value === "string" ? value.slice(0, 10) : "";
}

function readDateArray(value: unknown) {
  return readStringArray(value).filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item));
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? Array.from(new Set(value.map(readString).filter(Boolean)))
    : [];
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
