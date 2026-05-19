import type { User, UserMetadata } from "@supabase/supabase-js";
import { compactAuthMetadata } from "@/lib/authMetadata";
import { getCloudCoinPackage } from "@/lib/cloudCoinPackages";
import { applyCouponDiscount, isPackageApplicable, type UserCouponRecord } from "@/lib/coupons";
import { createPartnerCode } from "@/lib/partnerProfile";
import { getRechargeDisplayName } from "@/lib/rechargeDisplay";
import {
  getCurrentTier,
  isAtOrAfterMirImportBaseline,
  readMirPoints,
  type MirPartnerTier,
} from "@/lib/mirPoints";
import {
  changeQuickSdkPlatformCoins,
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
  currentTier: MirPartnerTier;
  transactions: WalletTransaction[];
};

export async function buildWalletSummary(
  user: User,
  options: { includeSdkWallet?: boolean } = {}
): Promise<WalletSummary> {
  const includeSdkWallet = options.includeSdkWallet ?? true;
  const account =
    user.email?.trim() ||
    readStringMetadata(user.user_metadata, ["quicksdk_username", "username"]) ||
    "当前登录账号";
  const uid = readStringMetadata(user.user_metadata, ["quicksdk_uid", "uid"]) || extractAccountUid(account);
  const sdkWallet = includeSdkWallet && uid ? await readQuickSdkWallet(uid) : null;
  const dbTransactions = await readWalletTransactionsFromDb(user.id);
  const metadataTransactions = readWalletTransactions(user.user_metadata);
  const localTransactions = mergeWalletTransactions([...dbTransactions, ...metadataTransactions]);
  const localCloudCoins = readCloudCoins(user.user_metadata);
  const websiteCloudCoins = calculateWebsiteCloudCoinBalance(localTransactions);
  const localTransactionById = new Map(localTransactions.map((transaction) => [transaction.id, transaction]));
  const sdkOrderTransactions = sdkWallet
    ? (
        await Promise.all(sdkWallet.orders.map((order) => mapOrderToTransaction(user.id, order)))
      ).map((transaction) => localTransactionById.get(transaction.id) ?? transaction)
    : [];

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
    cloudCoins: Math.max(sdkWallet?.amount ?? 0, localCloudCoins, websiteCloudCoins),
    currentTier: getCurrentTier(readMirPoints(user.user_metadata)),
    transactions: normalizeWalletLedgerTransactions(mergeWalletTransactions([...localTransactions, ...sdkOrderTransactions])),
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

  const eligibleOrders = orders.filter((order) => shouldAwardMirPointsForOrder(order, metadata));
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
    const coins = await resolveWalletOrderCoins(user.id, order);

    if (!orderId || !amount || amount <= 0) {
      continue;
    }

    const transactionId = `sdk-order-${orderId}`;
    const settledCloudCoins = await settleMissedWebsiteCoinOrder({
      userId: user.id,
      sdkUid: uid,
      orderId,
      amount,
      coins,
      order,
    });
    if (settledCloudCoins !== null) {
      metadata = {
        ...metadata,
        cloud_coins: settledCloudCoins,
        wallet_last_order_no: orderId,
      };
      changed = true;
    }

    const existingWalletTransactions = [
      ...readWalletTransactions(metadata),
      ...(await readWalletTransactionsFromDb(user.id)),
    ];
    const existingPointTransactions = Array.isArray(metadata?.mir_point_transactions)
      ? metadata.mir_point_transactions
      : [];
    const hasWalletTransaction = existingWalletTransactions.some((item) => item.id === transactionId);
    const hasPointTransaction = existingPointTransactions.some((item) => {
      if (!item || typeof item !== "object") return false;
      const source = item as Record<string, unknown>;
      return source.id === `point-${transactionId}` || source.referenceId === transactionId;
    });

    const shouldAwardPoints = shouldAwardMirPointsForOrder(order, metadata);
    const shouldRecordWallet = true;

    if ((hasWalletTransaction || !shouldRecordWallet) && (hasPointTransaction || !shouldAwardPoints)) {
      continue;
    }

    const paidAt = createDateFromSdkTimestamp(order.payTime ?? order.createTime);

    if (shouldAwardPoints && !hasPointTransaction) {
      await insertPointTransaction(user.id, {
        id: `point-${transactionId}`,
        title: getRechargeDisplayName(order.productName),
        description: `订单 ${orderId} 自动发放`,
        points: Math.floor(amount * 100),
        createdAt: paidAt.toISOString(),
        source: "wallet_recharge",
      });
    }

    if (shouldRecordWallet && !hasWalletTransaction) {
      const walletTransaction: WalletTransaction = {
        id: transactionId,
        type: isPlatformCoinOrder(order) ? "consume" : "recharge",
        amount,
        coins: isPlatformCoinOrder(order) ? -Math.floor(amount) : coins,
        desc: isPlatformCoinOrder(order) ? order.productName || "云币使用" : order.productName || "云币充值",
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

async function settleMissedWebsiteCoinOrder({
  userId,
  sdkUid,
  orderId,
  amount,
  coins,
  order,
}: {
  userId: string;
  sdkUid: string;
  orderId: string;
  amount: number;
  coins: number;
  order: QuickSdkOrderData;
}) {
  if (isPlatformCoinOrder(order) || coins <= 0) {
    return null;
  }

  const { data: paymentOrder, error } = await supabaseAdmin
    .from("payment_orders")
    .select("id,status,expected_amount,coins,pay_method,updated_at")
    .eq("cp_order_no", orderId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (error) {
      console.error("[QuickSDK missed coin order lookup]", { orderId, error: error.message });
    }
    return null;
  }

  let source = paymentOrder as Record<string, unknown> | null;
  let sourceKind: "payment" | "coupon" = "payment";
  let couponId = "";
  let packageId = 0;
  let status = readString(source?.status);
  let expectedAmount = readNumber(source?.expected_amount);
  let expectedCoins = readNumber(source?.coins);
  let payMethod: "wechat" | "alipay" = readString(source?.pay_method) === "alipay" ? "alipay" : "wechat";

  if (!source) {
    const couponSource = await resolveCouponSettlementSource({ userId, orderId });
    if (!couponSource) {
      return null;
    }

    source = couponSource.source;
    sourceKind = "coupon";
    couponId = couponSource.couponId;
    packageId = couponSource.packageId;
    status = couponSource.status;
    expectedAmount = couponSource.expectedAmount;
    expectedCoins = couponSource.expectedCoins;
    payMethod = "wechat";
  }

  const transactionId = `sdk-order-${orderId}`;
  const { data: existingTransaction } = await supabaseAdmin
    .from("wallet_transactions")
    .select("id,status")
    .eq("transaction_key", transactionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingTransaction?.status === "success") {
    return null;
  }

  if (existingTransaction?.status === "processing") {
    return null;
  }

  const updatedAt = new Date(readString(source.updated_at)).getTime();
  const processingIsFresh =
    status === "processing" && Number.isFinite(updatedAt) && Date.now() - updatedAt < 2 * 60 * 1000;
  if (processingIsFresh) {
    return null;
  }

  if (expectedAmount <= 0 || Math.abs(amount - expectedAmount) > 0.01 || expectedCoins !== coins) {
    console.error("[QuickSDK missed coin order mismatch]", {
      orderId,
      amount,
      expectedAmount,
      coins,
      expectedCoins,
    });
    return null;
  }

  const nowIso = new Date().toISOString();
  const claimResult = existingTransaction
    ? await supabaseAdmin
        .from("wallet_transactions")
        .update({
          type: "recharge",
          amount,
          coins,
          description: getRechargeDisplayName(order.productName),
          pay_method: payMethod,
          status: "processing",
        })
        .eq("transaction_key", transactionId)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle()
    : await supabaseAdmin
        .from("wallet_transactions")
        .insert({
          user_id: userId,
          transaction_key: transactionId,
          type: "recharge",
          amount,
          coins,
          description: getRechargeDisplayName(order.productName),
          pay_method: payMethod,
          status: "processing",
          occurred_at: createDateFromSdkTimestamp(order.payTime ?? order.createTime).toISOString(),
        })
        .select("id")
        .maybeSingle();
  const claimed = claimResult.data;
  const claimError = claimResult.error;

  if (claimError || !claimed) {
    if (claimError) {
      console.error("[QuickSDK missed coin order claim]", { orderId, error: claimError.message });
    } else {
      console.warn("[QuickSDK missed coin order claim skipped]", { orderId, status });
    }
    return null;
  }

  await supabaseAdmin
    .from("payment_orders")
    .update({ status: "failed", updated_at: nowIso })
    .eq("cp_order_no", orderId)
    .eq("user_id", userId)
    .neq("status", "paid");

  try {
    const nextSdkAmount = await changeQuickSdkPlatformCoins({
      userId: sdkUid,
      amount: String(coins),
      orderNo: orderId,
      remark: `MIR Partner missed recharge repair ${orderId}`,
    });

    await supabaseAdmin
      .from("wallet_transactions")
      .update({ status: "success" })
      .eq("transaction_key", transactionId)
      .eq("user_id", userId);

    if (sourceKind === "coupon") {
      await supabaseAdmin
        .from("user_coupons")
        .update({
          used_at: nowIso,
          used_order_no: orderId,
        })
        .eq("id", couponId)
        .eq("user_id", userId)
        .or(`used_at.is.null,used_order_no.eq.${orderId}`);

      await supabaseAdmin
        .from("payment_orders")
        .upsert(
          {
            cp_order_no: orderId,
            user_id: userId,
            package_id: packageId,
            coins,
            expected_amount: expectedAmount,
            pay_method: payMethod,
            status: "paid",
            paid_amount: amount,
            paid_at: nowIso,
            expires_at: nowIso,
            updated_at: nowIso,
            raw_callback: { repairedCouponByWalletSync: true, orderId, coins },
          },
          { onConflict: "cp_order_no" }
        );
    } else {
      await supabaseAdmin
        .from("payment_orders")
        .update({
          status: "paid",
          paid_amount: amount,
          paid_at: nowIso,
          updated_at: nowIso,
          raw_callback: { repairedByWalletSync: true, orderId, coins },
        })
        .eq("cp_order_no", orderId)
        .eq("user_id", userId);
    }

    return Math.max(0, Math.floor(nextSdkAmount));
  } catch (settleError) {
    await supabaseAdmin
      .from("payment_orders")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("cp_order_no", orderId)
      .eq("user_id", userId);
    console.error("[QuickSDK missed coin order settle failed]", {
      orderId,
      error: settleError instanceof Error ? settleError.message : "unknown",
    });
    return null;
  }
}

async function resolveCouponSettlementSource({
  userId,
  orderId,
}: {
  userId: string;
  orderId: string;
}) {
  const { data: session, error: sessionError } = await supabaseAdmin
    .from("coupon_checkout_sessions")
    .select("id,user_id,coupon_id,package_id,status,cp_order_no")
    .eq("cp_order_no", orderId)
    .eq("user_id", userId)
    .maybeSingle();

  if (sessionError) {
    console.error("[QuickSDK missed coupon session lookup]", { orderId, error: sessionError.message });
    return null;
  }

  if (!session || readString(session.status) !== "consumed") {
    return null;
  }

  const packageId = Math.floor(readNumber(session.package_id));
  const packageItem = getCloudCoinPackage(packageId);
  if (!packageItem) {
    return null;
  }

  const couponId = readString(session.coupon_id);
  const { data: coupon, error: couponError } = await supabaseAdmin
    .from("user_coupons")
    .select("*")
    .eq("id", couponId)
    .eq("user_id", userId)
    .maybeSingle();

  if (couponError || !coupon) {
    console.error("[QuickSDK missed coupon lookup]", {
      orderId,
      couponId,
      error: couponError?.message,
    });
    return null;
  }

  const couponRecord = coupon as UserCouponRecord;
  const couponOrderNo = readString(couponRecord.used_order_no);
  if (couponOrderNo && couponOrderNo !== orderId) {
    return null;
  }

  if (!isPackageApplicable(couponRecord, packageItem)) {
    return null;
  }

  return {
    source: {
      status: "pending",
      expected_amount: applyCouponDiscount(readNumber(packageItem.amount), couponRecord),
      coins: packageItem.coins,
      pay_method: "wechat",
      updated_at: new Date().toISOString(),
    },
    status: "pending",
    expectedAmount: applyCouponDiscount(readNumber(packageItem.amount), couponRecord),
    expectedCoins: packageItem.coins,
    couponId,
    packageId,
  };
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

async function mapOrderToTransaction(userId: string, order: QuickSdkOrderData): Promise<WalletTransaction> {
  const id = order.productOrderNo || order.orderNo;
  const amount = order.dealAmount || order.amount;
  const isCoinConsume = isPlatformCoinOrder(order);
  const coins = isCoinConsume ? Math.floor(amount) : await resolveWalletOrderCoins(userId, order);

  return {
    id: `sdk-order-${id}`,
    type: isCoinConsume ? "consume" : "recharge",
    amount,
    coins: isCoinConsume ? -coins : coins,
    desc: isCoinConsume ? order.productName || "云币使用" : order.productName || "云币充值",
    date: formatSdkTimestamp(order.payTime ?? order.createTime),
    payMethod: "",
    status: order.payStatus === 1 ? "success" : order.payStatus === 0 ? "failed" : "pending",
  };
}

function mergeWalletTransactions(items: WalletTransaction[]) {
  const byId = new Map<string, WalletTransaction>();

  for (const item of items) {
    if (!byId.has(item.id)) {
      byId.set(item.id, item);
    }
  }

  return [...byId.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 300);
}

function calculateWebsiteCloudCoinBalance(items: WalletTransaction[]) {
  return Math.max(
    0,
    items
      .filter((item) => item.id.startsWith("sdk-order-cp"))
      .reduce((total, item) => total + item.coins, 0)
  );
}

function normalizeWalletLedgerTransactions(items: WalletTransaction[]) {
  return items.map((item) => ({
    ...item,
    coins: item.type === "consume" ? -Math.abs(Math.floor(item.coins)) : Math.abs(Math.floor(item.coins)),
  }));
}

function shouldAwardMirPointsForOrder(order: QuickSdkOrderData, metadata?: UserMetadata) {
  return !isPlatformCoinOrder(order) &&
    isAtOrAfterMirImportBaseline(metadata, createDateFromSdkTimestamp(order.payTime ?? order.createTime));
}

async function resolveWalletOrderCoins(userId: string, order: QuickSdkOrderData) {
  const orderNo = order.productOrderNo || order.orderNo;
  const fallbackCoins = Math.floor(order.dealAmount || order.amount || 0);

  if (!orderNo) {
    return fallbackCoins;
  }

  const { data: paymentOrder } = await supabaseAdmin
    .from("payment_orders")
    .select("user_id,coins")
    .eq("cp_order_no", orderNo)
    .maybeSingle();

  if (paymentOrder && readString(paymentOrder.user_id) === userId) {
    const coins = readNumber(paymentOrder.coins);
    if (coins > 0) {
      return coins;
    }
  }

  const { data: couponSession } = await supabaseAdmin
    .from("coupon_checkout_sessions")
    .select("user_id,package_id")
    .eq("cp_order_no", orderNo)
    .maybeSingle();

  if (couponSession && readString(couponSession.user_id) === userId) {
    const packageId = readNumber(couponSession.package_id);
    const packageCoins = getCloudCoinPackage(packageId)?.coins ?? 0;
    if (packageCoins > 0) {
      return packageCoins;
    }
  }

  return fallbackCoins;
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
    desc: desc || "云币变动",
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
