import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-server";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import { ProfileClient } from "./ProfileClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Account — PledgeOFF" },
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = createSupabaseServiceClient();

  const [profileResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, username, company_name, avatar_url, marketing_emails_consent, marketing_emails_consented_at, is_profile_public")
      .eq("id", user.id)
      .single(),
  ]);

  const profile = profileResult.data as {
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    company_name?: string | null;
    avatar_url?: string | null;
    marketing_emails_consent?: boolean | null;
    marketing_emails_consented_at?: string | null;
    is_profile_public?: boolean | null;
  } | null;

  return (
    <ProfileClient
      email={user.email ?? ""}
      provider={
        (user.app_metadata as { provider?: string } | undefined)?.provider ??
        null
      }
      firstName={profile?.first_name ?? null}
      lastName={profile?.last_name ?? null}
      username={profile?.username ?? null}
      companyName={profile?.company_name ?? null}
      avatarUrl={profile?.avatar_url ?? null}
      marketingEmailsConsent={profile?.marketing_emails_consent ?? false}
      marketingEmailsConsentedAt={profile?.marketing_emails_consented_at ?? null}
      isProfilePublic={profile?.is_profile_public ?? true}
    />
  );
}
