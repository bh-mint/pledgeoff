import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-server";
import { createSupabaseAuthClient } from "@/lib/supabase/server";
import { SecurityClient } from "./SecurityClient";

export const metadata: Metadata = {
  title: "Security — PledgeOFF Settings",
  robots: { index: false },
};

export default async function SecurityPage() {
  const user = await requireUser();
  void user;

  const supabase = await createSupabaseAuthClient();
  const { data } = await supabase.auth.mfa.listFactors();
  const factors = data?.totp ?? [];

  return <SecurityClient initialFactors={factors} />;
}
