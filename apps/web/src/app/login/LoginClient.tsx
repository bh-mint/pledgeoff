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
type State = "idle" | "loading" | "error" | "check_email";

export function LoginClient() {
  const searchParams = useSearchParams();
  const errorKey = searchParams.get("error") ?? "";
  const urlError = ERROR_MESSAGES[errorKey] ?? "";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [uiState, setUiState] = useState<State>(urlError ? "error" : "idle");
  const [errorMsg, setErrorMsg] = useState(urlError);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setUiState("loading");

    const supabase = createClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
      });
      if (error) {
        setErrorMsg(error.message);
        setUiState("error");
      } else {
        setUiState("check_email");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMsg(error.message);
        setUiState("error");
      } else {
        window.location.href = "/dashboard";
      }
    }
  };

  const handleGoogleLogin = async () => {
    setUiState("loading");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    });
    if (error) {
      setErrorMsg(error.message);
      setUiState("error");
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setErrorMsg("");
    setUiState("idle");
  };

  if (uiState === "check_email") {
    return (
      <div
        className="rounded-md border p-8 w-full max-w-sm reveal"
        style={{ borderColor: "var(--border)", background: "var(--surface)", animationDelay: "200ms" }}
      >
        <div className="display text-[14px] font-semibold mb-4">
          Pledge<span style={{ color: "var(--accent)" }}>OFF</span>
        </div>

        <div
          className="rounded-md border p-4 mb-5"
          style={{ borderColor: "var(--border)", background: "var(--canvas)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--validated)" }} />
            <span className="mono text-[10px]" style={{ color: "var(--validated)" }}>SENT</span>
            <span className="mono text-[10px] ml-auto" style={{ color: "var(--t3)" }}>
              {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} UTC
            </span>
          </div>
          <div className="mono text-[11px]" style={{ color: "var(--t2)" }}>to: {email}</div>
          <div className="mono text-[11px]" style={{ color: "var(--t3)" }}>subj: Confirm your PledgeOFF account</div>
        </div>

        <h1 className="display text-[24px] font-semibold leading-tight" style={{ color: "var(--t1)" }}>
          Check your email.
        </h1>
        <p className="text-[13px] mt-2 leading-relaxed" style={{ color: "var(--t2)" }}>
          We sent a confirmation link to{" "}
          <span style={{ color: "var(--t1)" }}>{email}</span>. Click it to activate your account, then sign in.
        </p>

        <div className="grid grid-cols-2 gap-2 mt-6">
          <button
            onClick={() => setUiState("idle")}
            className="h-10 rounded-md border display text-[13px] transition-colors hover:bg-white/5"
            style={{ borderColor: "var(--border)", color: "var(--t1)" }}
          >
            Back to sign in
          </button>
          <a
            href="https://mail.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="h-10 rounded-md display text-[13px] font-semibold flex items-center justify-center transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            Open inbox →
          </a>
        </div>

        <p className="mono text-[10px] mt-5" style={{ color: "var(--t3)" }}>
          Didn&apos;t get it? Check spam, or{" "}
          <button onClick={() => switchMode("signup")} className="underline" style={{ color: "var(--t2)" }}>
            use a different email
          </button>.
        </p>
      </div>
    );
  }

  const isLoading = uiState === "loading";

  return (
    <div
      className="rounded-md border p-8 w-full max-w-sm reveal"
      style={{ borderColor: "var(--border)", background: "var(--surface)", animationDelay: "200ms" }}
    >
      {/* Tab switcher */}
      <div
        className="grid grid-cols-2 rounded-md border p-1 mb-6"
        style={{ borderColor: "var(--border)", background: "var(--canvas)" }}
      >
        {(["signin", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            disabled={isLoading}
            className="rounded-[4px] py-1.5 text-[12px] font-semibold display transition-colors"
            style={
              mode === m
                ? { background: "var(--accent)", color: "#000" }
                : { color: "var(--t2)" }
            }
          >
            {m === "signin" ? "Sign in" : "Sign up"}
          </button>
        ))}
      </div>

      <h1 className="display text-[24px] font-semibold leading-tight" style={{ color: "var(--t1)" }}>
        {mode === "signin" ? "Welcome back." : "Start validating."}
      </h1>
      <p className="text-[13px] mt-1" style={{ color: "var(--t2)" }}>
        {mode === "signin"
          ? "Validate your next idea in 15 seconds."
          : "3 free validations every month. No card."}
      </p>

      {/* Error banner */}
      {uiState === "error" && errorMsg && (
        <div
          className="rounded-md border p-3 flex gap-3 mt-5"
          style={{ borderColor: "rgba(229,91,60,0.4)", background: "rgba(229,91,60,0.06)" }}
        >
          <span className="mono text-[10px] mt-0.5" style={{ color: "var(--kill)" }}>err_auth</span>
          <div className="flex-1">
            <div className="text-[12px]" style={{ color: "var(--t1)" }}>{errorMsg}</div>
          </div>
        </div>
      )}

      <form onSubmit={handleEmailAuth} className="mt-6 space-y-3">
        <label className="block">
          <span className="mono text-[10px] uppercase" style={{ color: "var(--t3)" }}>Email</span>
          <div
            className="mt-1.5 rounded-md border px-3 h-10 flex items-center"
            style={
              uiState === "error"
                ? { borderColor: "rgba(229,91,60,0.5)", background: "var(--canvas)" }
                : { borderColor: "var(--border)", background: "var(--canvas)" }
            }
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isLoading}
              className="w-full text-[13px] bg-transparent outline-none placeholder:text-(--t3)"
              style={{ color: "var(--t1)" }}
            />
          </div>
        </label>

        <label className="block">
          <div className="flex items-center justify-between">
            <span className="mono text-[10px] uppercase" style={{ color: "var(--t3)" }}>Password</span>
            {mode === "signin" && (
              <span className="mono text-[10px]" style={{ color: "var(--t3)" }}>Forgot</span>
            )}
          </div>
          <div
            className="mt-1.5 rounded-md border px-3 h-10 flex items-center"
            style={{ borderColor: "var(--border)", background: "var(--canvas)" }}
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "At least 8 characters" : "••••••••••"}
              required
              minLength={mode === "signup" ? 8 : 6}
              disabled={isLoading}
              className="w-full text-[13px] bg-transparent outline-none placeholder:text-(--t3)"
              style={{ color: "var(--t1)" }}
            />
          </div>
          {mode === "signup" && (
            <span className="mono text-[10px] mt-1.5 block" style={{ color: "var(--t3)" }}>
              8+ chars · 1 number · 1 symbol
            </span>
          )}
        </label>

        <button
          type="submit"
          disabled={isLoading}
          className="display w-full h-10 rounded-md text-[13px] font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          {isLoading ? (
            <>
              <span className="inline-block w-3 h-3 rounded-full border-2 border-black/30 border-t-black/90 animate-spin" />
              {mode === "signin" ? "Signing in…" : "Creating account…"}
            </>
          ) : (
            mode === "signin" ? "Sign in" : "Create account"
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        <span className="mono text-[10px]" style={{ color: "var(--t3)" }}>OR</span>
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
      </div>

      {/* Google OAuth */}
      <button
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="w-full h-10 rounded-md border flex items-center justify-center gap-2 text-[13px] transition-colors hover:bg-white/5 disabled:opacity-50"
        style={{ borderColor: "var(--border)", color: "var(--t1)" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <p className="mono text-[10px] mt-6 leading-relaxed" style={{ color: "var(--t3)" }}>
        By continuing, you agree to our{" "}
        <Link href="/terms" className="underline" style={{ color: "var(--t2)" }}>Terms</Link>
        {" "}and{" "}
        <Link href="/privacy" className="underline" style={{ color: "var(--t2)" }}>Privacy Policy</Link>.
      </p>
    </div>
  );
}
