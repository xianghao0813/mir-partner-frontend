import crypto from "node:crypto";

const DEFAULT_AGGREGATE_BASE_URL = "http://custom-quicksdkapi.gamewemade.com";
const DEFAULT_CHANNEL_CODE = "website";

type AggregateConfig = {
  baseUrl: string;
  openId: string;
  openKey: string;
  productCode: string;
  productKey: string;
  callbackKey: string;
  md5Key: string;
  channelCode: string;
};

type AggregateApiResponse<T = unknown> = {
  status: boolean;
  message?: string;
  data?: T;
};

type AggregateBalanceData = {
  amount?: number | string;
  balance?: number | string;
  money?: number | string;
};

export function isGameWemadeAggregateConfigured() {
  const config = readAggregateConfig({ strict: false });
  return Boolean(config?.openId && config.openKey && config.productCode);
}

export function getGameWemadeAggregateConfig() {
  const config = readAggregateConfig({ strict: true });
  if (!config) {
    throw new Error("GameWemade aggregate SDK environment variables are missing.");
  }
  return config;
}

export async function getAggregateWalletAmount({ platformUid }: { platformUid: string }) {
  if (!platformUid) {
    throw new Error("platformUid is required.");
  }

  const result = await postAggregateForm<AggregateBalanceData | AggregateBalanceData[]>("open/walletInfo", {
    platformUid,
  });

  return normalizeAmount(result.data);
}

export async function changeAggregatePlatformCoins({
  platformUid,
  amount,
  orderNo,
  remark,
}: {
  platformUid: string;
  amount: string | number;
  orderNo?: string;
  remark?: string;
}) {
  if (!platformUid) {
    throw new Error("platformUid is required.");
  }

  const result = await postAggregateForm<AggregateBalanceData | AggregateBalanceData[]>("open/payToUser", {
    platformUid,
    amount: String(amount),
    orderNo,
    remark,
  });

  return normalizeAmount(result.data);
}

async function postAggregateForm<T>(endpoint: string, params: Record<string, string | undefined>) {
  const config = getGameWemadeAggregateConfig();
  const payload = buildSignedParams(
    {
      openId: config.openId,
      productCode: config.productCode,
      ...params,
    },
    config.openKey
  );
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    formData.append(key, value);
  });

  const response = await fetch(`${config.baseUrl}/${endpoint.replace(/^\/+/, "")}`, {
    method: "POST",
    body: formData,
    cache: "no-store",
  });
  const text = await response.text();
  const json = parseJson<AggregateApiResponse<T>>(text);

  if (!response.ok) {
    throw new Error(json?.message || `GameWemade aggregate request failed with status ${response.status}`);
  }

  if (!json) {
    throw new Error("GameWemade aggregate SDK returned an invalid response.");
  }

  if (!json.status) {
    throw new Error(json.message || "GameWemade aggregate SDK request failed.");
  }

  return json;
}

function readAggregateConfig({ strict }: { strict: boolean }): AggregateConfig | null {
  const openId = readEnv("GAMEWEMADE_QUICK_SDK_OPEN_ID", "QUICKSDK_AGG_OPEN_ID", "AGGREGATE_SDK_OPEN_ID");
  const openKey = readEnv("GAMEWEMADE_QUICK_SDK_OPEN_KEY", "QUICKSDK_AGG_OPEN_KEY", "AGGREGATE_SDK_OPEN_KEY");
  const productCode = readEnv(
    "GAMEWEMADE_QUICK_SDK_PRODUCT_CODE",
    "QUICKSDK_AGG_PRODUCT_CODE",
    "AGGREGATE_SDK_PRODUCT_CODE"
  );

  if (!openId || !openKey || !productCode) {
    if (strict) {
      throw new Error(
        "Required aggregate SDK env vars: GAMEWEMADE_QUICK_SDK_OPEN_ID, GAMEWEMADE_QUICK_SDK_OPEN_KEY, GAMEWEMADE_QUICK_SDK_PRODUCT_CODE."
      );
    }
    return null;
  }

  return {
    openId,
    openKey,
    productCode,
    productKey: readEnv("GAMEWEMADE_QUICK_SDK_PRODUCT_KEY", "QUICKSDK_AGG_PRODUCT_KEY", "AGGREGATE_SDK_PRODUCT_KEY"),
    callbackKey: readEnv("GAMEWEMADE_QUICK_SDK_CALLBACK_KEY", "QUICKSDK_AGG_CALLBACK_KEY", "AGGREGATE_SDK_CALLBACK_KEY"),
    md5Key: readEnv("GAMEWEMADE_QUICK_SDK_MD5_KEY", "QUICKSDK_AGG_MD5_KEY", "AGGREGATE_SDK_MD5_KEY"),
    baseUrl:
      readEnv("GAMEWEMADE_QUICK_SDK_BASE_URL", "QUICKSDK_AGG_BASE_URL", "AGGREGATE_SDK_BASE_URL")
        .replace(/\/+$/, "") || DEFAULT_AGGREGATE_BASE_URL,
    channelCode:
      readEnv("GAMEWEMADE_QUICK_SDK_CHANNEL_CODE", "QUICKSDK_AGG_CHANNEL_CODE", "AGGREGATE_SDK_CHANNEL_CODE") ||
      DEFAULT_CHANNEL_CODE,
  };
}

function buildSignedParams(input: Record<string, string | undefined>, openKey: string) {
  const normalized = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && value !== "")
  ) as Record<string, string>;
  const sorted = Object.entries(normalized).sort(([left], [right]) => left.localeCompare(right));
  const signBase = `${sorted.map(([key, value]) => `${key}=${value}&`).join("")}${openKey}`;

  return {
    ...normalized,
    sign: crypto.createHash("md5").update(signBase, "utf8").digest("hex"),
  };
}

function normalizeAmount(data: unknown) {
  if (typeof data === "number" && Number.isFinite(data)) {
    return data;
  }
  if (typeof data === "string") {
    const parsed = Number(data);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const candidate = Array.isArray(data) ? data[0] : data;
  if (!candidate || typeof candidate !== "object") {
    return 0;
  }

  const source = candidate as AggregateBalanceData;
  return readNumber(source.amount) ?? readNumber(source.balance) ?? readNumber(source.money) ?? 0;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }
  return "";
}

function parseJson<T>(value: string) {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
