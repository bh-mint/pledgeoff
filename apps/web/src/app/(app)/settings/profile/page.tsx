import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-server";
import { getUserPlan } from "@/server/billing/getUserPlan";
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

  const [profileResult, plan] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, username, company_name")
      .eq("id", user.id)
      .single(),
    getUserPlan(user.id),
  ]);

  const profile = profileResult.data as {
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    company_name?: string | null;
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
      plan={plan}
    />
  );
}
