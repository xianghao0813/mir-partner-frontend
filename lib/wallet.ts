import type { User, UserMetadata } from "@supabase/supabase-js";
import { createPartnerCode } from "@/lib/partnerProfile";

export type WalletTransaction = {
  id: string;
  type: "recharge" | "consume";
  amount: number;
  coins: number;
  desc: string;
  date: string;
  payMethod?: "wechat" | "alipay" | "";
  status?: "pending" | "success" | "failed";
};

export type WalletSummary = {
  account: string;
  nickname: string;
  uid: string;
  partnerCode: string;
  status: string;
  cloudCoins: number;
  transactions: WalletTransaction[];
};

const DEFAULT_TRANSACTIONS: WalletTransaction[] = [
  {
    id: "demo-1",
    date: "2026-04-08",
    type: "recharge",
    amount: 1000,
    coins: 1000,
    desc: "云币充值",
    payMethod: "wechat",
    status: "success",
  },
  {
    id: "demo-2",
    date: "2026-04-06",
    type: "consume",
    amount: -80,
    coins: -80,
    desc: "云币消费",
    status: "success",
  },
];

export function buildWalletSummary(user: User): WalletSummary {
  const account =
    user.email?.trim() ||
    readStringMetadata(user.user_metadata, ["quicksdk_username", "username"]) ||
    "当前登录账号";

  return {
    account,
    nickname:
      readStringMetadata(user.user_metadata, ["nickname", "quicksdk_username", "username"]) ||
      "MIR Partner 玩家",
    uid: readStringMetadata(user.user_metadata, ["quicksdk_uid", "uid"]) || extractAccountUid(account),
    partnerCode:
      readStringMetadata(user.user_metadata, [
        "partner_code",
        "mir_partner_code",
        "partnerCode",
        "mirPartnerCode",
      ]) || createPartnerCode(user.id),
    status: "正常",
    cloudCoins: readCloudCoins(user.user_metadata),
    transactions: readWalletTransactions(user.user_metadata),
  };
}

export function readCloudCoins(metadata: UserMetadata | undefined) {
  const keys = ["cloud_coins", "wallet_coins", "coins"];

  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.max(0, Math.floor(value));
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return Math.max(0, Math.floor(parsed));
      }
    }
  }

  return 2580;
}

export function readWalletTransactions(metadata: UserMetadata | undefined) {
  const value = metadata?.wallet_transactions;

  if (!Array.isArray(value)) {
    return DEFAULT_TRANSACTIONS;
  }

  const normalized = value
    .map((item) => normalizeWalletTransaction(item))
    .filter((item): item is WalletTransaction => item !== null)
    .sort((a, b) => b.date.localeCompare(a.date));

  return normalized.length > 0 ? normalized : DEFAULT_TRANSACTIONS;
}

export function appendWalletTransaction(
  current: UserMetadata | undefined,
  transaction: WalletTransaction
) {
  const existing = readWalletTransactions(current).filter((item) => item.id !== transaction.id);
  return [transaction, ...existing].slice(0, 20);
}

function normalizeWalletTransaction(value: unknown): WalletTransaction | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Record<string, unknown>;
  const id = readString(item.id);
  const type = item.type === "consume" ? "consume" : item.type === "recharge" ? "recharge" : null;
  const amount = readNumber(item.amount);
  const coins = readNumber(item.coins);
  const desc = readString(item.desc);
  const date = readString(item.date);
  const payMethod =
    item.payMethod === "wechat" || item.payMethod === "alipay" ? item.payMethod : "";
  const status =
    item.status === "pending" || item.status === "success" || item.status === "failed"
      ? item.status
      : undefined;

  if (!id || !type || !date) {
    return null;
  }

  return {
    id,
    type,
    amount,
    coins,
    desc: desc || "云币变动",
    date,
    payMethod,
    status,
  };
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

function readStringMetadata(metadata: UserMetadata | undefined, keys: string[]) {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function extractAccountUid(account: string) {
  const localPart = account.split("@")[0] ?? account;
  return localPart.replace(/\D/g, "") || localPart.trim();
}
