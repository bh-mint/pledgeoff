"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "Authentication failed. Please try again.",
  auth_failed: "Authentication failed. Please try again.",
};

type Mode = "signin" | "signup";

export function LoginClient() {
  const searchParams = useSearchParams();
  const errorKey = searchParams.get("error") ?? "";
  const errorMsg = ERROR_MESSAGES[errorKey] ?? "";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSuccess("");
    setLoading(true);

    const supabase = createClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setFormError(error.message);
      } else {
        setSuccess("Check your email to confirm your account.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setFormError(error.message);
      } else {
        window.location.href = "/dashboard";
      }
    }

    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setFormError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-lg p-8">
      <h1 className="display text-[22px] font-bold text-[var(--t1)] mb-2">
        {mode === "signin" ? "Sign in" : "Create account"}
      </h1>
      <p className="text-[13px] text-[var(--t2)] mb-6 leading-relaxed">
        {mode === "signin"
          ? "Access your dashboard and validate your ideas."
          : "Start free. No credit card required."}
      </p>

      {/* Mode toggle */}
      <div className="flex border border-[var(--border)] rounded-md mb-6 p-0.5">
        {(["signin", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setFormError(""); setSuccess(""); }}
            className={`flex-1 h-8 rounded text-[12px] font-medium transition-colors ${
              mode === m
                ? "bg-[var(--accent)] text-black"
                : "text-[var(--t3)] hover:text-[var(--t2)]"
            }`}
          >
            {m === "signin" ? "Sign in" : "Sign up"}
          </button>
        ))}
      </div>

      {(errorMsg || formError) && (
        <div className="mb-4 px-4 py-3 bg-[var(--kill)]/10 border border-[var(--kill)]/30 rounded-md">
          <p className="text-[12px] text-[var(--kill)]">{errorMsg || formError}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 px-4 py-3 bg-[var(--validated)]/10 border border-[var(--validated)]/30 rounded-md">
          <p className="text-[12px] text-[var(--validated)]">{success}</p>
        </div>
      )}

      {/* Email form */}
      <form onSubmit={handleEmailAuth} className="space-y-3 mb-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full h-10 px-3 rounded-md bg-[var(--canvas)] border border-[var(--border)] text-[13px] text-[var(--t1)] placeholder:text-[var(--t3)] focus:outline-none focus:border-[var(--t3)] transition-colors"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full h-10 px-3 rounded-md bg-[var(--canvas)] border border-[var(--border)] text-[13px] text-[var(--t1)] placeholder:text-[var(--t3)] focus:outline-none focus:border-[var(--t3)] transition-colors"
        />
        <button
          type="submit"
          disabled={loading}
          className="display w-full h-10 rounded-md bg-[var(--accent)] text-black text-[13px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Loading…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-[var(--border)]" />
        <span className="mono text-[10px] text-[var(--t3)] uppercase tracking-[0.08em]">or</span>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>

      {/* Google */}
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full h-10 flex items-center justify-center gap-3 rounded-md border border-[var(--border)] text-[var(--t2)] text-[13px] hover:border-[var(--t3)] hover:text-[var(--t1)] transition-colors disabled:opacity-50"
      >
        <GoogleIcon />
        Continue with Google
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
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}
