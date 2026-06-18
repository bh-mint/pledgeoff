import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseAuthClient } from "@/lib/supabase/server";
import { VerifyEmailClient } from "./VerifyEmailClient";
import { ThemeToggle } from "@/components/ThemeToggle";

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

  if (user?.email_confirmed_at) redirect("/dashboard");

  const email = emailParam ?? user?.email ?? "";

  return (
    <div className="auth-main" style={{ minHeight: "100vh" }}>
      <div className="auth-bar">
        <ThemeToggle />
      </div>
      <div className="auth-body">
        <VerifyEmailClient email={email} />
      </div>
    </div>
  );
}
