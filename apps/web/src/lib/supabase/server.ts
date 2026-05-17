import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// SSR auth client — uses anon key + user session cookies for RLS-aware queries
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server component — cookie writes ignored
          }
        },
      },
    }
  );
}

// Service role client lives in lib/supabase-server.ts — import from there
