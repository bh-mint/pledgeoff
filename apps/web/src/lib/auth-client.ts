"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Returns the current user's JWT access token, or null if not authenticated.
 * Use in Client Components instead of inline supabase.auth.getSession() calls.
 */
export async function getAuthToken(): Promise<string | null> {
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
