import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseAuthClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createSupabaseAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // Google OAuth users always have email_confirmed_at set by Supabase.
  // Email/password users who skipped confirmation (e.g. confirmations re-enabled after signup)
  // are redirected here as defense-in-depth.
  if (!user.email_confirmed_at) {
    redirect(`/verify-email?email=${encodeURIComponent(user.email ?? "")}`);
  }
  return user;
}
