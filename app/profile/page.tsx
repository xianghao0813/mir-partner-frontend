import { redirect } from "next/navigation";
import ProfileContent from "./ProfileContent";
import { createClient } from "@/lib/supabase/server";
import { buildPartnerProfileSummary } from "@/lib/partnerProfile";
import { reconcileQuickSdkRechargePoints } from "@/lib/wallet";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const reconciledMetadata = await reconcileQuickSdkRechargePoints(user);
  const profile = buildPartnerProfileSummary({
    ...user,
    user_metadata: reconciledMetadata,
  });

  return <ProfileContent profile={profile} />;
}
