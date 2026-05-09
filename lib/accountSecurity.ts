import type { User, UserMetadata } from "@supabase/supabase-js";
import { compactAuthMetadata } from "@/lib/authMetadata";
import { checkQuickSdkRealName } from "@/lib/quicksdk";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type AccountSecuritySummary = {
  realNameVerified: boolean;
  phoneBound: boolean;
  phone: string;
  maskedPhone: string;
  phoneRewardClaimed: boolean;
};

export function readAccountSecurity(metadata: UserMetadata | undefined): AccountSecuritySummary {
  const phone = readString(metadata?.mobile) || readString(metadata?.phone) || readString(metadata?.bound_phone);
  const phoneBound = readBoolean(metadata?.mobile_bound) || readBoolean(metadata?.phone_bound) || Boolean(phone);

  return {
    realNameVerified:
      readBoolean(metadata?.real_name_verified) ||
      readBoolean(metadata?.id_verified) ||
      readBoolean(metadata?.is_real_name_auth) ||
      readNumber(metadata?.time_left) === -1,
    phoneBound,
    phone,
    maskedPhone: maskPhone(phone),
    phoneRewardClaimed: readBoolean(metadata?.mobile_bind_point_awarded),
  };
}

export async function refreshAccountSecurity(user: User) {
  const uid = readString(user.user_metadata?.quicksdk_uid);
  const current = readAccountSecurity(user.user_metadata);

  if (!uid || current.realNameVerified) {
    return current;
  }

  try {
    const realNameVerified = await checkQuickSdkRealName({ userId: uid });
    if (!realNameVerified) {
      return current;
    }

    const metadata = compactAuthMetadata({
      ...(user.user_metadata ?? {}),
      real_name_verified: true,
      real_name_verified_at: new Date().toISOString(),
    });

    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: metadata,
    });

    if (error) {
      console.error("[account security refresh]", error);
      return current;
    }

    return readAccountSecurity(metadata);
  } catch (error) {
    console.error("[QuickSDK real-name status]", error);
    return current;
  }
}

export async function requireRealNameVerified(user: User) {
  const security = await refreshAccountSecurity(user);
  return security.realNameVerified;
}

export function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) {
    return phone ? "****" : "";
  }

  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
  }

  return false;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}
