import crypto from "node:crypto";

const QUICKSDK_DEFAULT_BASE_URL = "http://custom-sdkapi.gamewemade.com";
const QUICKSDK_DEFAULT_CHANNEL_CODE = "website";

type QuickSdkConfig = {
  baseUrl: string;
  openId: string;
  openKey: string;
  callbackKey: string;
  productCode: string;
  channelCode: string;
  localAuthSecret: string;
  publicBaseUrl: string;
};

export type QuickSdkCheckTokenResponse = {
  status: boolean;
  message: string;
  data?: {
    uid?: number | string;
    username?: string;
    authToken?: string;
    token?: string;
    timeleft?: number;
    timeLeft?: number;
    [key: string]: unknown;
  };
};

type QuickSdkApiResponse<TData = unknown> = {
  status: boolean;
  message: string;
  data?: TData;
};

export type QuickSdkAuthData = {
  uid: string;
  username: string;
  authToken?: string;
  timeLeft?: number | null;
  mobile?: string;
};

export type QuickSdkOrderData = {
  orderNo: string;
  productOrderNo: string;
  productName: string;
  amount: number;
  dealAmount: number;
  payStatus: number;
  createTime: number | null;
  payTime: number | null;
  payTypeName: string;
  payType: string;
};

type QuickSdkPhoneCodePurpose = "login" | "register" | "bind" | "unbind" | "reset-password";

export function getQuickSdkConfig(): QuickSdkConfig {
  const baseUrl =
    process.env.QUICKSDK_BASE_URL?.trim().replace(/\/+$/, "") ?? QUICKSDK_DEFAULT_BASE_URL;
  const openId = process.env.QUICKSDK_OPEN_ID?.trim() ?? "";
  const openKey = process.env.QUICKSDK_OPEN_KEY?.trim() ?? "";
  const callbackKey = process.env.QUICKSDK_CALLBACK_KEY?.trim() || openKey;
  const productCode = process.env.QUICKSDK_PRODUCT_CODE?.trim() ?? "";
  const channelCode =
    process.env.QUICKSDK_CHANNEL_CODE?.trim() ?? QUICKSDK_DEFAULT_CHANNEL_CODE;
  const localAuthSecret = process.env.QUICKSDK_LOCAL_AUTH_SECRET?.trim() ?? "";
  const publicBaseUrl = process.env.QUICKSDK_PUBLIC_BASE_URL?.trim().replace(/\/+$/, "") ?? "";

  if (!openId || !openKey || !productCode || !localAuthSecret) {
    throw new Error(
      "QuickSDK environment variables are missing. Required: QUICKSDK_OPEN_ID, QUICKSDK_OPEN_KEY, QUICKSDK_PRODUCT_CODE, QUICKSDK_LOCAL_AUTH_SECRET."
    );
  }

  return {
    baseUrl,
    openId,
    openKey,
    callbackKey,
    productCode,
    channelCode,
    localAuthSecret,
    publicBaseUrl,
  };
}

export function getQuickSdkPublicBaseUrl(requestOrigin: string) {
  const { publicBaseUrl } = getQuickSdkConfig();
  return publicBaseUrl || requestOrigin;
}

export function resolvePublicOrigin(
  requestUrl: string,
  requestHeaders?: Headers | Record<string, string | string[] | undefined>
) {
  const configuredOrigin = getQuickSdkConfig().publicBaseUrl;

  if (configuredOrigin) {
    return configuredOrigin;
  }

  const header = (name: string) => getHeaderValue(requestHeaders, name);
  const forwardedProto = header("x-forwarded-proto");
  const forwardedHost = header("x-forwarded-host");
  const host = forwardedHost || header("host");

  if (host) {
    const proto = forwardedProto || new URL(requestUrl).protocol.replace(":", "");
    return `${proto}://${host}`.replace(/\/+$/, "");
  }

  return new URL(requestUrl).origin;
}

export async function createQuickSdkOauthUrl({
  successUrl,
  cancelUrl,
}: {
  successUrl: string;
  cancelUrl?: string;
}) {
  const config = getQuickSdkConfig();
  const encodedSuccessUrl = encodeQuickSdkCallbackUrl(successUrl);
  const encodedCancelUrl = cancelUrl ? encodeQuickSdkCallbackUrl(cancelUrl) : undefined;
  const payload = buildSignedParams({
    openId: config.openId,
    productCode: config.productCode,
    channelCode: config.channelCode,
    successUrl: encodedSuccessUrl,
    cancalUrl: encodedCancelUrl,
  });

  const response = await postForm(`${config.baseUrl}/webOpen/oauth`, payload);
  const text = await response.text();
  const location = normalizeReturnedUrl(text);

  if (!response.ok) {
    throw new Error(location || `QuickSDK oauth request failed with status ${response.status}`);
  }

  if (!location) {
    throw new Error("QuickSDK oauth request did not return a login URL.");
  }

  if (!isAbsoluteHttpUrl(location)) {
    throw new Error(location);
  }

  return location;
}

export async function verifyQuickSdkToken({
  uid,
  authToken,
}: {
  uid: string;
  authToken: string;
}) {
  const config = getQuickSdkConfig();
  const payload = buildSignedParams({
    openId: config.openId,
    productCode: config.productCode,
    channelCode: config.channelCode,
    uid,
    authToken,
  });

  const response = await postForm(`${config.baseUrl}/webOpen/checkToken`, payload);
  const text = await response.text();
  const json = parseJson<QuickSdkCheckTokenResponse>(text);

  if (!response.ok) {
    throw new Error(
      json?.message || `QuickSDK checkToken request failed with status ${response.status}`
    );
  }

  if (!json) {
    throw new Error("QuickSDK checkToken returned an invalid response.");
  }

  if (!json.status) {
    throw new Error(json.message || "QuickSDK token verification failed");
  }

  return json;
}

export async function loginQuickSdkAccount({
  username,
  password,
}: {
  username: string;
  password: string;
}) {
  const config = getQuickSdkConfig();
  const payload = buildSignedParams({
    openId: config.openId,
    productCode: config.productCode,
    channelCode: config.channelCode,
    username,
    password: md5Hex(password),
  });

  const result = await postQuickSdkForm("/webOpen/userLogin", payload);
  return normalizeQuickSdkAuthData(result.data);
}

export async function sendQuickSdkPhoneCode({
  phone,
  purpose,
  uid,
}: {
  phone: string;
  purpose: QuickSdkPhoneCodePurpose;
  uid?: string;
}) {
  const config = getQuickSdkConfig();
  const payload = buildSignedParams({
    openId: config.openId,
    productCode: config.productCode,
    channelCode: config.channelCode,
    phone,
    sendType: String(getQuickSdkSendType(purpose)),
    uid,
  });

  const result = await postQuickSdkForm("/webOpen/sendCodeByPhone", payload);
  return result.data;
}

export async function registerQuickSdkAccount({
  username,
  password,
  phone,
  code,
}: {
  username: string;
  password: string;
  phone: string;
  code: string;
}) {
  const config = getQuickSdkConfig();
  const payload = buildSignedParams({
    openId: config.openId,
    productCode: config.productCode,
    channelCode: config.channelCode,
    username,
    password: md5Hex(password),
    phone,
    code,
  });

  const result = await postQuickSdkForm("/webOpen/upassportReg", payload);
  return result.data;
}

export async function changeQuickSdkPassword({
  userId,
  oldPassword,
  newPassword,
}: {
  userId: string;
  oldPassword: string;
  newPassword: string;
}) {
  const config = getQuickSdkConfig();
  const payload = buildSignedParams({
    openId: config.openId,
    productCode: config.productCode,
    channelCode: config.channelCode,
    userId,
    oldPassword: md5Hex(oldPassword),
    newPassword: md5Hex(newPassword),
  });

  const result = await postQuickSdkForm("/webOpen/userChangePass", payload);
  return result.data;
}

export async function resetQuickSdkPassword({
  phone,
  code,
  newPassword,
}: {
  phone: string;
  code: string;
  newPassword: string;
}) {
  const config = getQuickSdkConfig();
  const payload = buildSignedParams({
    openId: config.openId,
    productCode: config.productCode,
    channelCode: config.channelCode,
    phone,
    code,
    newPassword: md5Hex(newPassword),
  });

  const result = await postQuickSdkForm("/webOpen/setNewPass", payload);
  return result.data;
}

export async function getQuickSdkWalletAmount({ userId }: { userId: string }) {
  const config = getQuickSdkConfig();
  const payload = buildSignedParams({
    openId: config.openId,
    productCode: config.productCode,
    channelCode: config.channelCode,
    userId,
  });

  const result = await postQuickSdkForm("/webOpen/walletInfo", payload);
  return normalizeQuickSdkWalletAmount(result.data);
}

export async function changeQuickSdkPlatformCoins({
  userId,
  amount,
  remark,
}: {
  userId: string;
  amount: string;
  remark?: string;
}) {
  const config = getQuickSdkConfig();
  const payload = buildSignedParams({
    openId: config.openId,
    productCode: config.productCode,
    channelCode: config.channelCode,
    userId,
    amount,
    remark,
  });

  const result = await postQuickSdkForm("/webOpen/payToUser", payload);
  return normalizeQuickSdkWalletAmount(result.data);
}

export async function getQuickSdkUserOrders({
  userId,
  page = "1",
  payStatus = "1",
}: {
  userId: string;
  page?: string;
  payStatus?: "-1" | "0" | "1";
}) {
  const config = getQuickSdkConfig();
  const payload = buildSignedParams({
    openId: config.openId,
    productCode: config.productCode,
    channelCode: config.channelCode,
    userId,
    payStatus,
    page,
  });

  const result = await postQuickSdkForm("/webOpen/orderList", payload);
  return normalizeQuickSdkOrders(result.data);
}

export async function createQuickSdkPayUrl({
  amount,
  userId,
  cpOrderNo,
  orderSubject,
  goodsName,
  goodsId,
  roleId,
  roleName,
  roleLevel,
  serverId,
  serverName,
  extrasParams,
  callbackUrl,
  successUrl,
  cancelUrl,
  theme,
}: {
  amount: string;
  userId: string;
  cpOrderNo: string;
  orderSubject: string;
  goodsName: string;
  goodsId: string;
  roleId: string;
  roleName: string;
  roleLevel: string;
  serverId: string;
  serverName: string;
  extrasParams?: string;
  callbackUrl?: string;
  successUrl?: string;
  cancelUrl?: string;
  theme?: string;
}) {
  const config = getQuickSdkConfig();
  const payload = buildSignedParams({
    openId: config.openId,
    productCode: config.productCode,
    channelCode: config.channelCode,
    amount,
    userId,
    cpOrderNo,
    orderSubject,
    goodsName,
    goodsId,
    roleId,
    roleName,
    roleLevel,
    serverId,
    serverName,
    extrasParams,
    callbackUrl,
    successUrl,
    cancelUrl,
    theme,
  });

  const response = await postForm(`${config.baseUrl}/webOpen/getPayUrl`, payload);
  const text = await response.text();

  if (!response.ok) {
    const errorJson = parseJson<QuickSdkApiResponse>(text);
    throw new Error(errorJson?.message || `QuickSDK request failed with status ${response.status}`);
  }

  const payUrl = normalizeQuickSdkPayUrlResponse(text);

  if (!payUrl) {
    console.error("[QuickSDK getPayUrl raw]", text);
    throw new Error("QuickSDK did not return a payment URL.");
  }

  return payUrl;
}

export function verifyQuickSdkCallbackSign(payload: Record<string, unknown> | null) {
  if (!payload) {
    return false;
  }

  const receivedSign = readQuickSdkString(payload, ["sign"]);
  if (!receivedSign) {
    return false;
  }

  const expectedSign = createQuickSdkSign(
    Object.fromEntries(
      Object.entries(payload)
        .filter(([key]) => key.toLowerCase() !== "sign")
        .map(([key, value]) => [key, normalizeSignValue(value)])
    ),
    getQuickSdkConfig().callbackKey
  );

  return safeEqualHex(receivedSign, expectedSign);
}

export function getQuickSdkSyntheticEmail(uid: string) {
  return `sdkuid-${uid}@quicksdk.local`;
}

export function getQuickSdkSyntheticPassword(uid: string) {
  const { localAuthSecret } = getQuickSdkConfig();
  return crypto
    .createHash("sha256")
    .update(`quicksdk:${uid}:${localAuthSecret}`, "utf8")
    .digest("hex");
}

function encodeQuickSdkCallbackUrl(value: string) {
  return encodeURIComponent(value);
}

function getQuickSdkSendType(purpose: QuickSdkPhoneCodePurpose) {
  switch (purpose) {
    case "bind":
      return 2;
    case "unbind":
      return 3;
    case "reset-password":
      return 4;
    case "login":
    case "register":
    default:
      return 1;
  }
}

function md5Hex(value: string) {
  return crypto.createHash("md5").update(value, "utf8").digest("hex");
}

async function postQuickSdkForm(path: string, payload: Record<string, string>) {
  const config = getQuickSdkConfig();
  const response = await postForm(`${config.baseUrl}${path}`, payload);
  const text = await response.text();
  const json = parseJson<QuickSdkApiResponse>(text);

  if (!response.ok) {
    throw new Error(json?.message || `QuickSDK request failed with status ${response.status}`);
  }

  if (!json) {
    throw new Error("QuickSDK returned an invalid response.");
  }

  if (!json.status) {
    throw new Error(json.message || "QuickSDK request failed");
  }

  return json;
}

function normalizeQuickSdkAuthData(data: unknown): QuickSdkAuthData {
  const candidate =
    Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : (data as Record<string, unknown> | undefined);

  if (!candidate || typeof candidate !== "object") {
    throw new Error("QuickSDK login did not return account data.");
  }

  const uid = readQuickSdkString(candidate, ["uid", "userId"]);
  const username = readQuickSdkString(candidate, ["username", "userName"]);
  const authToken = readQuickSdkString(candidate, ["authToken", "token"]);
  const mobile = readQuickSdkString(candidate, ["mobile", "phone"]);
  const timeLeft = readQuickSdkNumber(candidate, ["timeLeft", "timeleft"]);

  if (!uid || !username) {
    throw new Error("QuickSDK login did not return uid or username.");
  }

  return {
    uid,
    username,
    authToken: authToken || undefined,
    mobile: mobile || undefined,
    timeLeft,
  };
}

function normalizeQuickSdkWalletAmount(data: unknown) {
  const candidate =
    Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : (data as Record<string, unknown> | undefined);

  if (typeof data === "number" && Number.isFinite(data)) {
    return data;
  }

  if (typeof data === "string") {
    const parsed = Number(data);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (!candidate || typeof candidate !== "object") {
    return 0;
  }

  return readQuickSdkNumber(candidate, ["amount", "balance", "money"]) ?? 0;
}

function normalizeQuickSdkOrders(data: unknown): QuickSdkOrderData[] {
  const items = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).list)
      ? ((data as Record<string, unknown>).list as unknown[])
      : [];

  return items
    .map((item) => normalizeQuickSdkOrder(item))
    .filter((item): item is QuickSdkOrderData => item !== null);
}

function normalizeQuickSdkOrder(value: unknown): QuickSdkOrderData | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Record<string, unknown>;
  const orderNo = readQuickSdkString(item, ["orderNo", "sdkOrderNo"]);
  const productOrderNo = readQuickSdkString(item, ["productOrderNo", "cpOrderNo", "gameOrder"]);
  const amount = readQuickSdkNumber(item, ["amount"]) ?? 0;
  const dealAmount = readQuickSdkNumber(item, ["dealAmount", "realAmount"]) ?? amount;
  const payStatus = readQuickSdkNumber(item, ["payStatus"]) ?? 0;

  if (!orderNo && !productOrderNo) {
    return null;
  }

  return {
    orderNo,
    productOrderNo,
    productName: readQuickSdkString(item, ["productName", "orderSubject", "goodsName"]),
    amount,
    dealAmount,
    payStatus,
    createTime: readQuickSdkNumber(item, ["createTime"]),
    payTime: readQuickSdkNumber(item, ["payTime"]),
    payTypeName: readQuickSdkString(item, ["payTypeName"]),
    payType: readQuickSdkString(item, ["payType"]),
  };
}

function normalizeQuickSdkPayUrl(data: unknown) {
  if (typeof data === "string") {
    return normalizeMaybeRelativeQuickSdkUrl(data);
  }

  if (!data || typeof data !== "object") {
    return "";
  }

  const candidate = data as Record<string, unknown>;
  const payUrl = candidate.payUrl;

  if (typeof payUrl === "string") {
    return normalizeMaybeRelativeQuickSdkUrl(payUrl);
  }

  return "";
}

function normalizeQuickSdkPayUrlResponse(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  const directUrl = normalizeMaybeRelativeQuickSdkUrl(trimmed);
  if (directUrl) {
    return directUrl;
  }

  const json = parseJson<QuickSdkApiResponse | { data?: unknown; payUrl?: unknown; url?: unknown }>(trimmed);
  if (!json) {
    return "";
  }

  if ("payUrl" in json && typeof json.payUrl === "string") {
    return normalizeMaybeRelativeQuickSdkUrl(json.payUrl);
  }

  if ("url" in json && typeof json.url === "string") {
    return normalizeMaybeRelativeQuickSdkUrl(json.url);
  }

  if ("data" in json) {
    return normalizeQuickSdkPayUrlDeep(json.data);
  }

  return "";
}

function normalizeQuickSdkPayUrlDeep(data: unknown): string {
  if (typeof data === "string") {
    return normalizeMaybeRelativeQuickSdkUrl(data);
  }

  if (!data || typeof data !== "object") {
    return "";
  }

  const candidate = data as Record<string, unknown>;
  const direct = [candidate.payUrl, candidate.url, candidate.paymentUrl, candidate.link];

  for (const item of direct) {
    if (typeof item === "string") {
      const normalized = normalizeMaybeRelativeQuickSdkUrl(item);
      if (normalized) {
        return normalized;
      }
    }
  }

  if ("data" in candidate) {
    return normalizeQuickSdkPayUrlDeep(candidate.data);
  }

  return "";
}

function normalizeMaybeRelativeQuickSdkUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (isAbsoluteHttpUrl(trimmed)) {
    return trimmed;
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}\/.+/i.test(trimmed)) {
    return `http://${trimmed}`;
  }

  return "";
}

function readQuickSdkString(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
}

function readQuickSdkNumber(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function buildSignedParams(input: Record<string, string | undefined>) {
  const normalized = normalizeSignParams(input);
  const sign = createQuickSdkSign(normalized);

  return {
    ...normalized,
    sign,
  };
}

function createQuickSdkSign(input: Record<string, string | undefined>, key = getQuickSdkConfig().openKey) {
  const normalized = normalizeSignParams(input);
  const sorted = Object.entries(normalized).sort(([a], [b]) => a.localeCompare(b));
  const signBase = `${sorted.map(([key, value]) => `${key}=${value}&`).join("")}${key}`;
  return crypto.createHash("md5").update(signBase, "utf8").digest("hex");
}

function normalizeSignParams(input: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && value !== "")
  ) as Record<string, string>;
}

function normalizeSignValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

function safeEqualHex(left: string, right: string) {
  const normalizedLeft = left.trim().toLowerCase();
  const normalizedRight = right.trim().toLowerCase();
  if (!/^[a-f0-9]+$/.test(normalizedLeft) || !/^[a-f0-9]+$/.test(normalizedRight)) {
    return false;
  }

  const leftBuffer = Buffer.from(normalizedLeft, "hex");
  const rightBuffer = Buffer.from(normalizedRight, "hex");
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

async function postForm(url: string, payload: Record<string, string>) {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    formData.append(key, value);
  });

  return fetch(url, {
    method: "POST",
    body: formData,
    cache: "no-store",
  });
}

function normalizeReturnedUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const json = parseJson<{
    status?: boolean;
    message?: string;
    data?: string | { url?: string; loginUrl?: string };
  }>(
    trimmed
  );

  if (!json) {
    return trimmed;
  }

  if (typeof json.data === "string") {
    return json.data;
  }

  if (json.data && typeof json.data === "object" && typeof json.data.url === "string") {
    return json.data.url;
  }

  if (json.data && typeof json.data === "object" && typeof json.data.loginUrl === "string") {
    return json.data.loginUrl;
  }

  return json.message ?? "";
}

function isAbsoluteHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseJson<T>(value: string) {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function getHeaderValue(
  headers: Headers | Record<string, string | string[] | undefined> | undefined,
  name: string
) {
  if (!headers) {
    return "";
  }

  if (headers instanceof Headers) {
    return headers.get(name)?.split(",")[0]?.trim() ?? "";
  }

  const matchedKey = Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase());

  if (!matchedKey) {
    return "";
  }

  const value = headers[matchedKey];

  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }

  return value?.split(",")[0]?.trim() ?? "";
}
