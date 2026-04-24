import { redirect } from "next/navigation";
import ProfileContent from "./ProfileContent";
import { createClient } from "@/lib/supabase/server";
import { buildPartnerProfileSummary } from "@/lib/partnerProfile";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = buildPartnerProfileSummary(user);

  return <ProfileContent profile={profile} />;
}
