"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "Authentication failed. Please try again.",
  auth_failed: "Authentication failed. Please try again.",
};

export function LoginClient() {
  const searchParams = useSearchParams();
  const errorKey = searchParams.get("error") ?? "";
  const errorMsg = ERROR_MESSAGES[errorKey] ?? "";

  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-lg p-8">
      <h1 className="display text-[22px] font-bold text-[var(--t1)] mb-2">
        Sign in
      </h1>
      <p className="text-[13px] text-[var(--t2)] mb-8 leading-relaxed">
        Access your dashboard and validate your ideas.
      </p>

      {errorMsg && (
        <div className="mb-6 px-4 py-3 bg-[var(--kill)]/10 border border-[var(--kill)]/30 rounded-md">
          <p className="text-[12px] text-[var(--kill)]">{errorMsg}</p>
        </div>
      )}

      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full h-11 flex items-center justify-center gap-3 rounded-md bg-white text-gray-800 text-[14px] font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <span className="text-[13px]">Redirecting…</span>
        ) : (
          <>
            <GoogleIcon />
            Continue with Google
          </>
        )}
      </button>

      <p className="text-[11px] mono text-[var(--t3)] text-center mt-6 leading-relaxed">
        By continuing, you agree to our{" "}
        <Link href="/terms" className="hover:text-[var(--t2)] transition-colors">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="hover:text-[var(--t2)] transition-colors">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
