import crypto from "node:crypto";
import type { User, UserMetadata } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { compactAuthMetadata } from "@/lib/authMetadata";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getQuickSdkSyntheticEmail,
  getQuickSdkSyntheticPassword,
  verifyQuickSdkToken,
} from "@/lib/quicksdk";

type QuickSdkSupabaseProfile = {
  uid: string;
  username: string;
  timeLeft?: number | null;
  mobile?: string;
  bindingSource?: "sdk_login" | "web_signup" | "sdk_oauth";
};

export async function signInQuickSdkUser(profile: QuickSdkSupabaseProfile) {
  const email = getQuickSdkSyntheticEmail(profile.uid);
  const password = getQuickSdkSyntheticPassword(profile.uid);

  await upsertQuickSdkSupabaseUser({
    ...profile,
    email,
    password,
  });

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }
}

export async function verifyAndSignInQuickSdkUser({
  uid,
  username,
  authToken,
  timeLeft,
  mobile,
  bindingSource,
}: QuickSdkSupabaseProfile & {
  authToken: string;
}) {
  const verification = await verifyQuickSdkToken({ uid, authToken });

  await signInQuickSdkUser({
    uid,
    username,
    mobile,
    bindingSource,
    timeLeft:
      verification.data?.timeleft ??
      verification.data?.timeLeft ??
      timeLeft ??
      null,
  });
}

async function upsertQuickSdkSupabaseUser({
  uid,
  username,
  email,
  password,
  timeLeft,
  mobile,
  bindingSource,
}: QuickSdkSupabaseProfile & {
  email: string;
  password: string;
}) {
  const existingUser = await findUserByEmail(email);
  const partnerCode =
    readValidPartnerCode(existingUser?.user_metadata?.partner_code) ||
    readValidPartnerCode(existingUser?.user_metadata?.mir_partner_code) ||
    (await createNextPartnerCode());
  const userMetadata = buildQuickSdkMetadata({
    current: existingUser?.user_metadata,
    uid,
    username,
    timeLeft,
    mobile,
    bindingSource,
    partnerCode,
  });

  if (!existingUser) {
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
      app_metadata: {
        provider: "quicksdk",
      },
    });

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
    password,
    user_metadata: userMetadata,
    app_metadata: {
      ...(existingUser.app_metadata ?? {}),
      provider: "quicksdk",
    },
  });

  if (error) {
    throw error;
  }
}

async function findUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    throw error;
  }

  return data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

function buildQuickSdkMetadata({
  current,
  uid,
  username,
  timeLeft,
  mobile,
  bindingSource,
  partnerCode,
}: {
  current?: UserMetadata;
  uid: string;
  username: string;
  timeLeft?: number | null;
  mobile?: string;
  bindingSource?: QuickSdkSupabaseProfile["bindingSource"];
  partnerCode: string;
}) {
  const merged: UserMetadata = {
    ...(current ?? {}),
    provider: "quicksdk",
    quicksdk_uid: uid,
    quicksdk_username: username,
    partner_code: partnerCode,
    login_type: "direct_credentials",
  };

  if (bindingSource) {
    merged.binding_source = bindingSource;
  }

  if (typeof timeLeft === "number" && Number.isFinite(timeLeft)) {
    merged.time_left = timeLeft;
  }

  if (mobile?.trim()) {
    merged.mobile = mobile.trim();
  }

  return compactAuthMetadata(merged);
}

async function createNextPartnerCode() {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    throw error;
  }

  const existingCodes = new Set(
    data.users
      .map((user) => readValidPartnerCode(user.user_metadata?.partner_code))
      .filter(Boolean)
  );

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const nextCode = createRandomPartnerCode();

    if (!existingCodes.has(nextCode)) {
      return nextCode;
    }
  }

  throw new Error("Failed to create a unique partner code.");
}

function createRandomPartnerCode() {
  return `LP${crypto.randomInt(0, 1000000).toString().padStart(6, "0")}`;
}

function readValidPartnerCode(value: unknown) {
  const raw = readString(value).toUpperCase();
  return /^LP\d{6}$/.test(raw) ? raw : "";
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
