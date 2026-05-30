import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseAuthClient } from "@/lib/supabase/server";
import { VerifyEmailClient } from "./VerifyEmailClient";

export const metadata: Metadata = {
  title: "Verify your email — PledgeOFF",
  robots: { index: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email: emailParam } = await searchParams;

  const supabase = await createSupabaseAuthClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Already confirmed → go to dashboard
  if (user?.email_confirmed_at) redirect("/dashboard");

  const email = emailParam ?? user?.email ?? "";

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--canvas)" }}
    >
      <VerifyEmailClient email={email} />
    </div>
  );
}
