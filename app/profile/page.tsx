import { redirect } from "next/navigation";
import ProfileContent from "./ProfileContent";
import { createClient } from "@/lib/supabase/server";
import { buildPartnerProfileSummary, MIR_PARTNER_TIERS } from "@/lib/partnerProfile";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const quickSdkUsername = String(user.user_metadata?.quicksdk_username ?? "").trim();
  const provider = String(user.user_metadata?.provider ?? "").trim();
  const timeLeft = user.user_metadata?.time_left;
  const profile = buildPartnerProfileSummary(user);

  return (
    <ProfileContent
      email={user.email ?? ""}
      provider={provider}
      quickSdkUsername={quickSdkUsername}
      timeLeft={timeLeft}
      profile={profile}
      tiers={MIR_PARTNER_TIERS}
    />
  );
}
