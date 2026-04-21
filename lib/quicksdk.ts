import crypto from "node:crypto";

const QUICKSDK_DEFAULT_BASE_URL = "https://qkgamesdk.quickapi.net";
const QUICKSDK_DEFAULT_CHANNEL_CODE = "website";

type QuickSdkConfig = {
  baseUrl: string;
  openId: string;
  openKey: string;
  productCode: string;
  channelCode: string;
  localAuthSecret: string;
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

export function getQuickSdkConfig(): QuickSdkConfig {
  const baseUrl =
    process.env.QUICKSDK_BASE_URL?.trim().replace(/\/+$/, "") ?? QUICKSDK_DEFAULT_BASE_URL;
  const openId = process.env.QUICKSDK_OPEN_ID?.trim() ?? "";
  const openKey = process.env.QUICKSDK_OPEN_KEY?.trim() ?? "";
  const productCode = process.env.QUICKSDK_PRODUCT_CODE?.trim() ?? "";
  const channelCode =
    process.env.QUICKSDK_CHANNEL_CODE?.trim() ?? QUICKSDK_DEFAULT_CHANNEL_CODE;
  const localAuthSecret = process.env.QUICKSDK_LOCAL_AUTH_SECRET?.trim() ?? "";

  if (!openId || !openKey || !productCode || !localAuthSecret) {
    throw new Error(
      "QuickSDK environment variables are missing. Required: QUICKSDK_OPEN_ID, QUICKSDK_OPEN_KEY, QUICKSDK_PRODUCT_CODE, QUICKSDK_LOCAL_AUTH_SECRET."
    );
  }

  return {
    baseUrl,
    openId,
    openKey,
    productCode,
    channelCode,
    localAuthSecret,
  };
}

export async function createQuickSdkOauthUrl({
  successUrl,
  cancelUrl,
}: {
  successUrl: string;
  cancelUrl?: string;
}) {
  const config = getQuickSdkConfig();
  const payload = buildSignedParams({
    openId: config.openId,
    productCode: config.productCode,
    channelCode: config.channelCode,
    successUrl,
    cancalUrl: cancelUrl,
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

function buildSignedParams(input: Record<string, string | undefined>) {
  const { openKey } = getQuickSdkConfig();
  const normalized = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && value !== "")
  ) as Record<string, string>;

  const sorted = Object.entries(normalized).sort(([a], [b]) => a.localeCompare(b));
  const signBase = `${sorted.map(([key, value]) => `${key}=${value}&`).join("")}${openKey}`;
  const sign = crypto.createHash("md5").update(signBase, "utf8").digest("hex");

  return {
    ...normalized,
    sign,
  };
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

  const json = parseJson<{ status?: boolean; message?: string; data?: string | { url?: string } }>(
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
