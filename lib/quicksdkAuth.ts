import type { User, UserMetadata } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
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
  const userMetadata = buildQuickSdkMetadata({
    current: existingUser?.user_metadata,
    uid,
    username,
    timeLeft,
    mobile,
    bindingSource,
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
}: {
  current?: UserMetadata;
  uid: string;
  username: string;
  timeLeft?: number | null;
  mobile?: string;
  bindingSource?: QuickSdkSupabaseProfile["bindingSource"];
}) {
  const merged: UserMetadata = {
    ...(current ?? {}),
    provider: "quicksdk",
    quicksdk_uid: uid,
    quicksdk_username: username,
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

  return merged;
}
