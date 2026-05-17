"use client";

import { createBrowserClient } from "@supabase/ssr";

// Auth/session only — UI components. Never use for business data.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
