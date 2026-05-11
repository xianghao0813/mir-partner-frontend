import { redirect } from "next/navigation";
import { buildAttendanceSummary } from "@/lib/attendance";
import { buildPartnerProfileSummary } from "@/lib/partnerProfile";
import { createClient } from "@/lib/supabase/server";
import { reconcileQuickSdkRechargePoints } from "@/lib/wallet";
import PointsActivityContent from "./PointsActivityContent";

export default async function PointsActivityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const reconciledMetadata = await reconcileQuickSdkRechargePoints(user);
  const profile = await buildPartnerProfileSummary({
    ...user,
    user_metadata: reconciledMetadata,
  });

  return (
    <PointsActivityContent
      initialPoints={profile.points}
      initialSummary={buildAttendanceSummary(reconciledMetadata)}
    />
  );
}
