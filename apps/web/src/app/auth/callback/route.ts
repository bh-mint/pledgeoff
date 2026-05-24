import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAuthClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createSupabaseAuthClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error({ msg: "auth_callback_error", error: error.message });
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  if (next) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  // No explicit next param — determine redirect based on whether user is new.
  // New user: created_at and last_sign_in_at are within 10 seconds of each other.
  const user = data.session?.user;
  const createdAt = user?.created_at ? new Date(user.created_at).getTime() : 0;
  const lastSignIn = user?.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
  const isNewUser = Math.abs(lastSignIn - createdAt) < 10_000;

  return NextResponse.redirect(`${origin}${isNewUser ? "/onboarding" : "/dashboard"}`);
}
