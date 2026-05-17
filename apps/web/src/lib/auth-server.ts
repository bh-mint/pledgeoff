import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseAuthClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createSupabaseAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}
