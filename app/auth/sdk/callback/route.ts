import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getQuickSdkSyntheticEmail,
  getQuickSdkSyntheticPassword,
  verifyQuickSdkToken,
} from "@/lib/quicksdk";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const uid = requestUrl.searchParams.get("uid")?.trim() ?? "";
  const username = requestUrl.searchParams.get("username")?.trim() ?? "";
  const authToken = requestUrl.searchParams.get("authToken")?.trim() ?? "";
  const timeLeft = requestUrl.searchParams.get("timeLeft")?.trim() ?? "";

  if (!uid || !authToken) {
    return redirectWithError(requestUrl, "QuickSDK callback is missing uid or authToken.");
  }

  try {
    const verification = await verifyQuickSdkToken({ uid, authToken });
    const email = getQuickSdkSyntheticEmail(uid);
    const password = getQuickSdkSyntheticPassword(uid);

    await ensureQuickSdkSupabaseUser({
      uid,
      username,
      email,
      password,
      timeLeft:
        verification.data?.timeleft ??
        (timeLeft ? Number.parseInt(timeLeft, 10) : null),
    });

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return NextResponse.redirect(new URL("/profile", request.url));
  } catch (error) {
    return redirectWithError(
      requestUrl,
      error instanceof Error ? error.message : "QuickSDK login failed."
    );
  }
}

async function ensureQuickSdkSupabaseUser({
  uid,
  username,
  email,
  password,
  timeLeft,
}: {
  uid: string;
  username: string;
  email: string;
  password: string;
  timeLeft: number | null;
}) {
  const existingUser = await findUserByEmail(email);
  const userMetadata = {
    provider: "quicksdk",
    quicksdk_uid: uid,
    quicksdk_username: username,
    time_left: Number.isFinite(timeLeft) ? timeLeft : null,
  };

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

function redirectWithError(requestUrl: URL, message: string) {
  const errorUrl = new URL("/login", requestUrl.origin);
  errorUrl.searchParams.set("error", message);
  return NextResponse.redirect(errorUrl);
}
