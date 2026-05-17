import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Auth/session only — Server Components, middleware, auth callbacks. Never for business data.
export async function createSupabaseAuthClient() {
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
