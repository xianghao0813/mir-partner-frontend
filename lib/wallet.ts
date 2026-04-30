import type { User, UserMetadata } from "@supabase/supabase-js";
import { compactAuthMetadata } from "@/lib/authMetadata";
import { createPartnerCode } from "@/lib/partnerProfile";
import {
  getQuickSdkUserOrders,
  getQuickSdkWalletAmount,
  type QuickSdkOrderData,
} from "@/lib/quicksdk";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  insertPointTransaction,
  insertWalletTransaction,
  migrateMetadataLedgersToDb,
  readWalletTransactionsFromDb,
} from "@/lib/userLedgers";

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
    "褰撳墠鐧诲綍璐﹀彿";
  const uid = readStringMetadata(user.user_metadata, ["quicksdk_uid", "uid"]) || extractAccountUid(account);
  const sdkWallet = uid ? await readQuickSdkWallet(uid) : null;
  const dbTransactions = await readWalletTransactionsFromDb(user.id);
  const metadataTransactions = readWalletTransactions(user.user_metadata);
  const localTransactions = mergeWalletTransactions([...dbTransactions, ...metadataTransactions]);
  const localCloudCoins = readCloudCoins(user.user_metadata);
  const sdkOrderTransactions = sdkWallet?.orders
    .filter((order) => !isPlatformCoinOrder(order))
    .map(mapOrderToTransaction) ?? [];

  return {
    account,
    nickname:
      readStringMetadata(user.user_metadata, ["nickname", "quicksdk_username", "username"]) ||
      "MIR Partner 鐜╁",
    uid,
    partnerCode:
      readStringMetadata(user.user_metadata, [
        "partner_code",
        "mir_partner_code",
        "partnerCode",
        "mirPartnerCode",
      ]) || createPartnerCode(user.id),
    status: "正常",
    cloudCoins: Math.max(sdkWallet?.amount ?? 0, localCloudCoins),
    transactions: mergeWalletTransactions([...localTransactions, ...sdkOrderTransactions]),
  };
}

export async function reconcileQuickSdkRechargePoints(user: User) {
  const uid = readStringMetadata(user.user_metadata, ["quicksdk_uid", "uid"]);
  let metadata: UserMetadata = compactAuthMetadata(user.user_metadata);
  let changed = hasMetadataChanged(user.user_metadata, metadata);

  await migrateMetadataLedgersToDb(user.id, user.user_metadata);

  if (!uid) {
    return changed ? await updateUserMetadata(user.id, metadata, user.user_metadata) : metadata;
  }

  const orders = await getQuickSdkUserOrders({ userId: uid, payStatus: "1" }).catch((error) => {
    console.error("[QuickSDK wallet reconcile]", error);
    return [] as QuickSdkOrderData[];
  });

  if (orders.length === 0) {
    return changed ? await updateUserMetadata(user.id, metadata, user.user_metadata) : metadata;
  }

  const eligibleOrders = orders.filter((order) => shouldAwardMirPointsForOrder(order));
  const walletRechargePoints = eligibleOrders.reduce((total, order) => {
    const amount = order.dealAmount || order.amount;
    return total + Math.floor(amount * 100);
  }, 0);
  const walletRechargeMonthPoints = eligibleOrders
    .filter((order) => formatSdkTimestamp(order.payTime ?? order.createTime).startsWith(getCurrentMonth()))
    .reduce((total, order) => {
      const amount = order.dealAmount || order.amount;
      return total + Math.floor(amount * 100);
    }, 0);
  const previousWalletRechargePoints = readMetadataNumber(metadata?.mir_wallet_recharge_points);
  const currentMirPoints = readMetadataNumber(metadata?.mir_points);

  if (walletRechargePoints !== previousWalletRechargePoints) {
    metadata = {
      ...metadata,
      mir_points: Math.max(0, currentMirPoints - previousWalletRechargePoints + walletRechargePoints),
      mir_wallet_recharge_points: walletRechargePoints,
      mir_wallet_recharge_month_key: getCurrentMonth(),
      mir_wallet_recharge_month_points: walletRechargeMonthPoints,
      mir_month_key: getCurrentMonth(),
      mir_month_points: walletRechargeMonthPoints,
    };
    changed = true;
  }

  for (const order of orders) {
    const orderId = order.productOrderNo || order.orderNo;
    const amount = order.dealAmount || order.amount;

    if (!orderId || !amount || amount <= 0) {
      continue;
    }

    const transactionId = `sdk-order-${orderId}`;
    const existingWalletTransactions = readWalletTransactions(metadata);
    const existingPointTransactions = Array.isArray(metadata?.mir_point_transactions)
      ? metadata.mir_point_transactions
      : [];
    const hasWalletTransaction = existingWalletTransactions.some((item) => item.id === transactionId);
    const hasPointTransaction = existingPointTransactions.some((item) => {
      if (!item || typeof item !== "object") return false;
      const source = item as Record<string, unknown>;
      return source.id === `point-${transactionId}` || source.referenceId === transactionId;
    });

    const shouldAwardPoints = shouldAwardMirPointsForOrder(order);
    const shouldRecordWallet = !isPlatformCoinOrder(order);

    if ((hasWalletTransaction || !shouldRecordWallet) && (hasPointTransaction || !shouldAwardPoints)) {
      continue;
    }

    const paidAt = createDateFromSdkTimestamp(order.payTime ?? order.createTime);

    if (shouldAwardPoints && !hasPointTransaction) {
      await insertPointTransaction(user.id, {
        id: `point-${transactionId}`,
        title: "云币充值积分",
        description: `订单 ${orderId} 自动发放`,
        points: Math.floor(amount * 100),
        createdAt: paidAt.toISOString(),
        source: "wallet_recharge",
      });
    }

    if (shouldRecordWallet && !hasWalletTransaction) {
      const walletTransaction: WalletTransaction = {
        id: transactionId,
        type: "recharge",
        amount,
        coins: Math.floor(amount),
        desc: order.productName || "云币充值",
        date: paidAt.toISOString().slice(0, 10),
        payMethod: "",
        status: "success",
      };
      await insertWalletTransaction(user.id, walletTransaction);
      metadata = {
        ...metadata,
        wallet_transactions: appendWalletTransaction(metadata, walletTransaction),
      };
      changed = true;
    }
  }

  if (!changed) {
    return metadata;
  }

  return updateUserMetadata(user.id, compactAuthMetadata(metadata), user.user_metadata);
}

async function updateUserMetadata(userId: string, metadata: UserMetadata, fallback: UserMetadata | undefined) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: metadata,
  });

  if (error) {
    console.error("[QuickSDK wallet reconcile update]", error);
    return fallback ?? {};
  }

  return metadata;
}

function hasMetadataChanged(before: UserMetadata | undefined, after: UserMetadata) {
  return JSON.stringify(before ?? {}) !== JSON.stringify(after);
}

function readMetadataNumber(value: unknown) {
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
  return [transaction, ...existing].slice(0, 20);
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
    desc: order.productName || "云币充值",
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
    .slice(0, 300);
}

function shouldAwardMirPointsForOrder(order: QuickSdkOrderData) {
  return !isPlatformCoinOrder(order);
}

function isPlatformCoinOrder(order: QuickSdkOrderData) {
  return order.payType === "173" || containsPlatformCoin(order.productName) || containsPlatformCoin(order.payTypeName);
}

function containsPlatformCoin(value: string | undefined) {
  return typeof value === "string" && value.includes("平台币");
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
    desc: desc || "浜戝竵鍙樺姩",
    date,
    payMethod,
    status,
  };
}

function formatSdkTimestamp(value: number | null) {
  return createDateFromSdkTimestamp(value).toISOString().slice(0, 10);
}

function getCurrentMonth() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

function createDateFromSdkTimestamp(value: number | null) {
  if (!value || !Number.isFinite(value)) {
    return new Date();
  }

  const milliseconds = value > 9999999999 ? value : value * 1000;
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? new Date() : date;
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
