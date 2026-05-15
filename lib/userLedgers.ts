import type { UserMetadata } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { PartnerPointTransaction } from "@/lib/partnerProfile";
import type { WalletTransaction } from "@/lib/wallet";

const LEDGER_LIMIT = 300;

export async function insertWalletTransaction(userId: string, transaction: WalletTransaction) {
  const { error } = await supabaseAdmin.from("wallet_transactions").upsert(
    {
      user_id: userId,
      transaction_key: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      coins: transaction.coins,
      description: transaction.desc,
      pay_method: transaction.payMethod || null,
      status: transaction.status || "success",
      occurred_at: toOccurredAt(transaction.date),
    },
    { onConflict: "transaction_key", ignoreDuplicates: true }
  );

  if (error) {
    console.error("[wallet_transactions insert]", error);
  }
}

export async function insertPointTransaction(
  userId: string,
  transaction: PartnerPointTransaction
) {
  if (!transaction.points) {
    return;
  }

  const { error } = await supabaseAdmin.from("mir_point_transactions").upsert(
    {
      user_id: userId,
      transaction_key: transaction.id,
      type: transaction.points < 0 ? "deduct" : "earn",
      source: transaction.source,
      reference_id: null,
      points: transaction.points,
      title: transaction.title,
      description: transaction.description,
      occurred_at: transaction.createdAt ?? new Date().toISOString(),
    },
    { onConflict: "transaction_key", ignoreDuplicates: true }
  );

  if (error) {
    console.error("[mir_point_transactions insert]", error);
  }
}

export async function readWalletTransactionsFromDb(userId: string, month?: string) {
  let query = supabaseAdmin
    .from("wallet_transactions")
    .select("transaction_key,type,amount,coins,description,pay_method,status,occurred_at")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false })
    .limit(LEDGER_LIMIT);

  if (month) {
    query = query.gte("occurred_at", `${month}-01T00:00:00+08:00`).lt("occurred_at", getNextMonthStart(month));
  }

  const { data, error } = await query;

  if (error) {
    console.error("[wallet_transactions read]", error);
    return [];
  }

  return (data ?? []).map((item) => ({
    id: readString(item.transaction_key),
    type: item.type === "consume" ? "consume" as const : "recharge" as const,
    amount: readNumber(item.amount),
    coins: readNumber(item.coins),
    desc: readString(item.description),
    date: formatDate(readString(item.occurred_at)),
    payMethod: item.pay_method === "wechat" || item.pay_method === "alipay" ? item.pay_method : "",
    status: item.status === "pending" || item.status === "failed" ? item.status : "success" as const,
  }));
}

export async function readPointTransactionsFromDb(userId: string, month?: string) {
  let query = supabaseAdmin
    .from("mir_point_transactions")
    .select("transaction_key,title,description,points,source,occurred_at")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false })
    .limit(LEDGER_LIMIT);

  if (month) {
    query = query.gte("occurred_at", `${month}-01T00:00:00+08:00`).lt("occurred_at", getNextMonthStart(month));
  }

  const { data, error } = await query;

  if (error) {
    console.error("[mir_point_transactions read]", error);
    return [];
  }

  return (data ?? []).map((item) => ({
    id: readString(item.transaction_key),
    title: readString(item.title) || "MIR 积分",
    description: readString(item.description) || "-",
    points: readNumber(item.points),
    createdAt: readString(item.occurred_at) || null,
    source: readString(item.source) || "point",
  }));
}

export async function migrateMetadataLedgersToDb(userId: string, metadata: UserMetadata | undefined) {
  const walletTransactions = readMetadataArray(metadata?.wallet_transactions);
  const pointTransactions = readMetadataArray(metadata?.mir_point_transactions);

  await Promise.all([
    ...walletTransactions.map((item) => {
      const transaction = normalizeWalletMetadataTransaction(item);
      return transaction ? insertWalletTransaction(userId, transaction) : Promise.resolve();
    }),
    ...pointTransactions.map((item, index) => {
      const transaction = normalizePointMetadataTransaction(item, index);
      return transaction ? insertPointTransaction(userId, transaction) : Promise.resolve();
    }),
  ]);
}

function normalizeWalletMetadataTransaction(item: unknown): WalletTransaction | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const source = item as Record<string, unknown>;
  const id = readString(source.id);
  if (!id) {
    return null;
  }

  return {
    id,
    type: source.type === "consume" ? "consume" : "recharge",
    amount: readNumber(source.amount),
    coins: readNumber(source.coins),
    desc: readString(source.desc) || readString(source.description) || "-",
    date: readString(source.date) || formatDate(readString(source.createdAt)),
    payMethod: source.payMethod === "wechat" || source.payMethod === "alipay" ? source.payMethod : "",
    status: source.status === "pending" || source.status === "failed" ? source.status : "success",
  };
}

function normalizePointMetadataTransaction(item: unknown, index: number): PartnerPointTransaction | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const source = item as Record<string, unknown>;
  const points = readNumber(source.points ?? source.amount ?? source.value);
  const createdAt = readString(source.createdAt) || readString(source.created_at) || new Date().toISOString();

  if (!points) {
    return null;
  }

  return {
    id: readString(source.id) || `metadata-point-${index}-${createdAt}`,
    title: readString(source.title) || "MIR 积分",
    description: readString(source.description) || readString(source.source) || "-",
    points,
    createdAt,
    source: readString(source.source) || readString(source.type) || "point",
  };
}

function readMetadataArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function toOccurredAt(date: string) {
  if (!date) {
    return new Date().toISOString();
  }

  return date.includes("T") ? date : `${date}T00:00:00+08:00`;
}

function formatDate(value: string) {
  return value ? value.slice(0, 10) : new Date().toISOString().slice(0, 10);
}

function getNextMonthStart(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  if (!year || !monthIndex) {
    return new Date().toISOString();
  }

  const next = monthIndex === 12 ? new Date(Date.UTC(year, 12, 1)) : new Date(Date.UTC(year, monthIndex, 1));
  return next.toISOString();
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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
