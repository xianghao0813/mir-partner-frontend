import type { User, UserMetadata } from "@supabase/supabase-js";
import { createPartnerCode } from "@/lib/partnerProfile";
import {
  getQuickSdkUserOrders,
  getQuickSdkWalletAmount,
  type QuickSdkOrderData,
} from "@/lib/quicksdk";

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

export async function buildWalletSummary(user: User): Promise<WalletSummary> {
  const account =
    user.email?.trim() ||
    readStringMetadata(user.user_metadata, ["quicksdk_username", "username"]) ||
    "当前登录账号";
  const uid = readStringMetadata(user.user_metadata, ["quicksdk_uid", "uid"]) || extractAccountUid(account);
  const sdkWallet = uid ? await readQuickSdkWallet(uid) : null;
  const localTransactions = readWalletTransactions(user.user_metadata);
  const sdkOrderTransactions = sdkWallet?.orders.map(mapOrderToTransaction) ?? [];

  return {
    account,
    nickname:
      readStringMetadata(user.user_metadata, ["nickname", "quicksdk_username", "username"]) ||
      "MIR Partner 玩家",
    uid,
    partnerCode:
      readStringMetadata(user.user_metadata, [
        "partner_code",
        "mir_partner_code",
        "partnerCode",
        "mirPartnerCode",
      ]) || createPartnerCode(user.id),
    status: "正常",
    cloudCoins: sdkWallet?.amount ?? readCloudCoins(user.user_metadata),
    transactions: mergeWalletTransactions([...localTransactions, ...sdkOrderTransactions]),
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

  return 0;
}

export function readWalletTransactions(metadata: UserMetadata | undefined) {
  const value = metadata?.wallet_transactions;

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeWalletTransaction(item))
    .filter((item): item is WalletTransaction => item !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function appendWalletTransaction(
  current: UserMetadata | undefined,
  transaction: WalletTransaction
) {
  const existing = readWalletTransactions(current).filter((item) => item.id !== transaction.id);
  return [transaction, ...existing].slice(0, 50);
}

async function readQuickSdkWallet(uid: string) {
  try {
    const [amount, orders] = await Promise.all([
      getQuickSdkWalletAmount({ userId: uid }),
      getQuickSdkUserOrders({ userId: uid, payStatus: "1" }),
    ]);

    return {
      amount: Math.max(0, Math.floor(amount)),
      orders,
    };
  } catch (error) {
    console.error("[QuickSDK wallet]", error);
    return null;
  }
}

function mapOrderToTransaction(order: QuickSdkOrderData): WalletTransaction {
  const id = order.productOrderNo || order.orderNo;
  const amount = order.dealAmount || order.amount;

  return {
    id: `sdk-order-${id}`,
    type: "recharge",
    amount,
    coins: Math.floor(amount),
    desc: order.productName || "平台币充值",
    date: formatSdkTimestamp(order.payTime ?? order.createTime),
    payMethod: "",
    status: order.payStatus === 1 ? "success" : order.payStatus === 0 ? "failed" : "pending",
  };
}

function mergeWalletTransactions(items: WalletTransaction[]) {
  const byId = new Map<string, WalletTransaction>();

  for (const item of items) {
    byId.set(item.id, item);
  }

  return [...byId.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 50);
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
    desc: desc || "平台币变动",
    date,
    payMethod,
    status,
  };
}

function formatSdkTimestamp(value: number | null) {
  if (!value || !Number.isFinite(value)) {
    return new Date().toISOString().slice(0, 10);
  }

  const milliseconds = value > 9999999999 ? value : value * 1000;
  return new Date(milliseconds).toISOString().slice(0, 10);
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
