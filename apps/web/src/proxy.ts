import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Paths where API key auth is explicitly forbidden (FIX-8).
// Blocks at the edge; routes may also use requireJwtAuth() for defense-in-depth.
const API_KEY_BLOCKED_PREFIXES = [
  "/api/v1/billing",
  "/api/v1/teams",
  "/api/v1/api-keys",
];

// Pages that require an authenticated session (Layer 1 — edge guard).
// requireUser() in Server Components remains as Layer 2 (defense-in-depth).
const PROTECTED_PAGE_PREFIXES = [
  "/dashboard",
  "/ideas",
  "/settings",
  "/admin",
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── FIX-8: block API keys on sensitive API paths ──────────────────────────
  const apiKey = req.headers.get("x-api-key");
  if (apiKey?.startsWith("po_live_") && API_KEY_BLOCKED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.json(
      {
        error: {
          code: "API_KEY_NOT_ALLOWED",
          message:
            "API keys cannot be used on billing, team, or API key management endpoints. Use JWT authentication.",
        },
      },
      { status: 403 },
    );
  }

  // ── Auth edge guard: protected pages only ─────────────────────────────────
  if (!PROTECTED_PAGE_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Must use request/response cookie pattern — edge runtime has no next/headers.
  let supabaseResponse = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() validates the JWT — never use getSession() in middleware (trusts cache).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Protected pages — session required
    "/dashboard/:path*",
    "/ideas/:path*",
    "/settings/:path*",
    "/admin/:path*",
    // FIX-8: API key scope enforcement
    "/api/v1/billing/:path*",
    "/api/v1/teams/:path*",
    "/api/v1/api-keys/:path*",
  ],
};
