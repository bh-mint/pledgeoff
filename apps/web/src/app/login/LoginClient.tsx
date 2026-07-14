"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "Authentication failed. Please try again.",
  auth_failed:  "Authentication failed. Please try again.",
};

type Mode  = "signin" | "signup";
type State = "idle" | "loading" | "error" | "check_email" | "reset_sent" | "mfa_required";

const GOOGLE_SVG = (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const GITHUB_SVG = (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" style={{ fill: "currentColor" }}>
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

export function LoginClient() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const errorKey    = searchParams.get("error") ?? "";
  const urlError    = ERROR_MESSAGES[errorKey] ?? "";

  const [mode,        setMode]        = useState<Mode>(searchParams.get("mode") === "signup" ? "signup" : "signin");
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [uiState,     setUiState]     = useState<State>(urlError ? "error" : "idle");
  const [errorMsg,    setErrorMsg]    = useState(urlError);
  const [mfaCode,     setMfaCode]     = useState("");
  const [mfaFactorId, setMfaFactorId] = useState("");

  const handleEmailAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    setUiState("loading");
    const supabase = createSupabaseBrowserClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
      });
      if (error) { setErrorMsg(error.message); setUiState("error"); }
      else        { setUiState("check_email"); }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          router.push(`/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }
        const isCreds = error.message.toLowerCase().includes("invalid login") || error.message.toLowerCase().includes("invalid credentials");
        setErrorMsg(isCreds ? "Sign-in failed. If you registered with Google, use 'Continue with Google' below." : error.message);
        setUiState("error");
      } else {
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aalData?.nextLevel === "aal2" && aalData.nextLevel !== aalData.currentLevel) {
          const { data: factorsData } = await supabase.auth.mfa.listFactors();
          const totpFactor = factorsData?.totp?.[0];
          if (totpFactor) { setMfaFactorId(totpFactor.id); setUiState("mfa_required"); return; }
        }
        router.push(searchParams.get("next") ?? "/dashboard");
        router.refresh();
      }
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    setUiState("loading");
    const supabase    = createSupabaseBrowserClient();
    const nextParam   = searchParams.get("next");
    const redirectTo  = nextParam
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextParam)}`
      : `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) { setErrorMsg(error.message); setUiState("error"); }
  };

  const handleForgotPassword = async () => {
    if (!email) { setErrorMsg("Enter your email address above, then click Forgot."); setUiState("error"); return; }
    setUiState("loading");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { setErrorMsg(error.message); setUiState("error"); }
    else        { setUiState("reset_sent"); }
  };

  const handleMfaVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUiState("loading");
    const supabase = createSupabaseBrowserClient();
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
    if (challengeError || !challengeData) {
      setErrorMsg(challengeError?.message ?? "Failed to start MFA challenge.");
      setUiState("mfa_required"); return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: challengeData.id, code: mfaCode });
    if (verifyError) { setErrorMsg("Invalid code. Try again."); setUiState("mfa_required"); return; }
    router.push(searchParams.get("next") ?? "/dashboard");
    router.refresh();
  };

  const switchMode = (m: Mode) => { setMode(m); setErrorMsg(""); setUiState("idle"); };

  /* ── MFA screen ───────────────────────────────────── */
  if (uiState === "mfa_required") {
    return (
      <div className="auth-form">
        <p className="sc-eye">Authentication · Step 2</p>
        <h1 className="sc-ttl">Two-factor verification.</h1>
        <p className="sc-sub">Enter the 6-digit code from your authenticator app.</p>
        {errorMsg && <div className="auth-err">{errorMsg}</div>}
        <form onSubmit={handleMfaVerify}>
          <div className="auth-field">
            <label className="flbl" htmlFor="mfa-code">Authenticator code</label>
            <input
              id="mfa-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={mfaCode}
              onChange={(e) => { setMfaCode(e.target.value.replace(/\D/g, "")); setErrorMsg(""); }}
              placeholder="000000"
              required
              autoFocus
              autoComplete="one-time-code"
              className="finp"
              style={{ letterSpacing: "0.25em" }}
            />
          </div>
          <button type="submit" disabled={mfaCode.length !== 6} className="btn-p" style={{ width: "100%", justifyContent: "center", opacity: mfaCode.length !== 6 ? 0.5 : 1 }}>
            Verify →
          </button>
        </form>
        <p className="auth-fine">
          <button type="button" onClick={() => { setUiState("idle"); setMfaCode(""); setErrorMsg(""); }} className="auth-sl">
            ← Back to sign in
          </button>
        </p>
        <p className="auth-fine" style={{ marginTop: "8px" }}>
          Lost access to your authenticator? Email{" "}
          <a href="mailto:hello@pledgeoff.com" className="auth-sl">hello@pledgeoff.com</a> from the address on your account.
        </p>
      </div>
    );
  }

  /* ── Reset sent screen ────────────────────────────── */
  if (uiState === "reset_sent") {
    return (
      <div className="auth-form">
        <p className="sc-eye">Account recovery</p>
        <h1 className="sc-ttl">Check your inbox.</h1>
        <p className="sc-sub" style={{ marginBottom: "20px" }}>
          We sent a reset link to <strong style={{ color: "var(--ink)" }}>{email}</strong>. It expires in 30 minutes.
        </p>
        <div className="stat-row">
          <div className="stat-dot green" />
          <span className="stat-txt">Email sent — check your spam folder if you don&apos;t see it</span>
        </div>
        <div className="auth-foot">
          <button className="auth-sl" onClick={() => void handleForgotPassword()}>Resend link</button>
          <button className="auth-sl" onClick={() => switchMode("signin")}>Back to sign in</button>
        </div>
      </div>
    );
  }

  /* ── Check email screen ───────────────────────────── */
  if (uiState === "check_email") {
    return (
      <div className="auth-form">
        <p className="sc-eye">Account setup</p>
        <h1 className="sc-ttl">Check your email.</h1>
        <div className="em-chip">
          <span>{email}</span>
          <button onClick={() => switchMode("signup")}>Change</button>
        </div>
        <div className="stat-row" style={{ marginBottom: 0 }}>
          <div className="stat-dot amber pulse" />
          <span className="stat-txt">Waiting for verification — check your spam folder</span>
        </div>
        <div className="auth-foot" style={{ marginTop: "20px" }}>
          <button className="auth-sl" onClick={() => setUiState("idle")}>Back to sign in</button>
          <button className="auth-sl" onClick={() => switchMode("signup")}>Use a different email</button>
        </div>
      </div>
    );
  }

  const isLoading = uiState === "loading";

  /* ── Main form (signin / signup) ──────────────────── */
  return (
    <div className="auth-form">
      {/* Tab switcher */}
      <div className="auth-tabs">
        {(["signin", "signup"] as Mode[]).map((m) => (
          <button key={m} onClick={() => switchMode(m)} disabled={isLoading} className={`auth-tab${mode === m ? " active" : ""}`}>
            {m === "signin" ? "Sign in" : "Sign up"}
          </button>
        ))}
      </div>

      <p className="sc-eye">{mode === "signin" ? "Authentication" : "Create account"}</p>
      <h1 className="sc-ttl">{mode === "signin" ? "Welcome back." : "Start free."}</h1>
      <p className="sc-sub">
        {mode === "signin"
          ? <>No account? <button className="lnk" onClick={() => switchMode("signup")}>Start free.</button></>
          : <>Already have an account? <button className="lnk" onClick={() => switchMode("signin")}>Sign in.</button></>}
      </p>

      {uiState === "error" && errorMsg && <div className="auth-err">{errorMsg}</div>}

      {/* OAuth */}
      <div className="oa-stack">
        <button onClick={() => handleOAuth("google")} disabled={isLoading} className="oa-btn">
          {GOOGLE_SVG} Continue with Google
        </button>
        <button onClick={() => handleOAuth("github")} disabled={isLoading} className="oa-btn">
          {GITHUB_SVG} Continue with GitHub
        </button>
      </div>

      {/* Divider */}
      <div className="oa-div">
        <div className="oa-div-line" />
        <span className="oa-div-txt">{mode === "signin" ? "or continue with email" : "or sign up with email"}</span>
        <div className="oa-div-line" />
      </div>

      {/* Email + password form */}
      <form onSubmit={handleEmailAuth}>
        <div className="auth-field">
          <label className="flbl" htmlFor="auth-email">Email address</label>
          <input id="auth-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" disabled={isLoading} className="finp" />
        </div>
        <div className="auth-field" style={{ marginBottom: "22px" }}>
          <label className="flbl" htmlFor="auth-password">Password</label>
          <input id="auth-password" type="password" required minLength={mode === "signup" ? 8 : 6} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "signup" ? "Minimum 8 characters" : "••••••••"} disabled={isLoading} className="finp" />
          {mode === "signup" && <span className="mono" style={{ fontSize: "8px", letterSpacing: "0.08em", color: "var(--faint)", marginTop: "5px", display: "block" }}>Minimum 8 characters</span>}
        </div>

        <button type="submit" disabled={isLoading} className="btn-p" style={{ width: "100%", justifyContent: "center", opacity: isLoading ? 0.6 : 1, marginBottom: mode === "signin" ? "16px" : "4px" }}>
          {isLoading
            ? (mode === "signin" ? "Signing in…" : "Creating account…")
            : (mode === "signin" ? "Sign in" : "Create account")}
        </button>
      </form>

      {mode === "signin" && (
        <div className="auth-foot">
          <button className="auth-sl" onClick={handleForgotPassword} disabled={isLoading}>Forgot password</button>
        </div>
      )}

      {mode === "signup" && (
        <p className="auth-fine">
          By creating an account you agree to our{" "}
          <Link href="/terms">Terms of Service</Link> and <Link href="/privacy">Privacy Policy</Link>.
        </p>
      )}
    </div>
  );
}
