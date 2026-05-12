import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { readAttendanceSummaryFromDb } from "@/lib/attendanceDb";
import { buildPartnerProfileSummary } from "@/lib/partnerProfile";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildWalletSummary, reconcileQuickSdkRechargePoints } from "@/lib/wallet";

const SYNC_COOLDOWN_MS = 60 * 1000;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const force = requestUrl.searchParams.get("force") === "1";
  const includeWalletRealtime = requestUrl.searchParams.get("wallet") === "1";
  const lastSyncedAt = readIsoTime(user.user_metadata?.mir_quicksdk_synced_at);
  const recentlySynced = lastSyncedAt > 0 && Date.now() - lastSyncedAt < SYNC_COOLDOWN_MS;

  if (!force && recentlySynced) {
    return NextResponse.json(await buildSyncPayload(user, "skipped", includeWalletRealtime));
  }

  const reconciledMetadata = await reconcileQuickSdkRechargePoints(user);
  const syncedMetadata = {
    ...reconciledMetadata,
    mir_quicksdk_synced_at: new Date().toISOString(),
  };

  await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: syncedMetadata,
  });

  return NextResponse.json(
    await buildSyncPayload(
      {
        ...user,
        user_metadata: syncedMetadata,
      },
      "synced",
      includeWalletRealtime
    )
  );
}

async function buildSyncPayload(
  user: User,
  status: "synced" | "skipped",
  includeWalletRealtime: boolean
) {
  const [profile, wallet] = await Promise.all([
    buildPartnerProfileSummary(user, { includeQuickSdkFallback: false }),
    buildWalletSummary(user, { includeSdkWallet: status === "synced" && includeWalletRealtime }),
  ]);

  return {
    ok: true,
    status,
    syncedAt: readString(user.user_metadata?.mir_quicksdk_synced_at),
    profile,
    wallet,
    attendance: await readAttendanceSummaryFromDb(user.id, user.user_metadata),
  };
}

function readIsoTime(value: unknown) {
  const raw = readString(value);
  if (!raw) return 0;
  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
