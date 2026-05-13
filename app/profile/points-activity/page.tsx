import { redirect } from "next/navigation";
import { readAttendanceSummaryFromDb } from "@/lib/attendanceDb";
import { buildPartnerProfileSummary } from "@/lib/partnerProfile";
import { createClient } from "@/lib/supabase/server";
import PointsActivityContent from "./PointsActivityContent";

export default async function PointsActivityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await buildPartnerProfileSummary({
    ...user,
  }, { includeQuickSdkFallback: false });

  return (
    <PointsActivityContent
      initialPoints={profile.points}
      initialTier={profile.currentTier}
      initialSummary={await readAttendanceSummaryFromDb(user.id, user.user_metadata)}
    />
  );
}
