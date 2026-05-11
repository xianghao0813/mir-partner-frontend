import { redirect } from "next/navigation";
import { buildAttendanceSummary } from "@/lib/attendance";
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
      initialSummary={buildAttendanceSummary(user.user_metadata)}
    />
  );
}
