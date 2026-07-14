"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type State = "verifying" | "ready" | "loading" | "error" | "success" | "invalid_token" | "no_token";

export function ResetPasswordClient() {
  const searchParams  = useSearchParams();
  const router        = useRouter();

  const tokenHash     = searchParams.get("token_hash");
  const type          = searchParams.get("type");
  const hasValidParams = !!tokenHash && type === "recovery";

  const [uiState,  setUiState]  = useState<State>(hasValidParams ? "verifying" : "no_token");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!hasValidParams || !tokenHash) return;
    const supabase = createSupabaseBrowserClient();
    supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash })
      .then(({ error }) => setUiState(error ? "invalid_token" : "ready"));
  }, [hasValidParams, tokenHash]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password !== confirm) { setErrorMsg("Passwords don't match."); setUiState("error"); return; }
    if (password.length < 8)  { setErrorMsg("Password must be at least 8 characters."); setUiState("error"); return; }
    setUiState("loading");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setErrorMsg(error.message); setUiState("error"); }
    else        { setUiState("success"); setTimeout(() => router.push("/dashboard"), 2000); }
  };

  if (uiState === "verifying") {
    return (
      <div className="auth-form">
        <p className="sc-eye">Account recovery</p>
        <p className="sc-sub" style={{ marginBottom: 0 }}>Verifying link…</p>
      </div>
    );
  }

  if (uiState === "no_token" || uiState === "invalid_token") {
    return (
      <div className="auth-form">
        <p className="sc-eye">Account recovery</p>
        <h1 className="sc-ttl">{uiState === "no_token" ? "No reset link." : "Link expired."}</h1>
        <p className="sc-sub">
          {uiState === "no_token"
            ? "This page is only accessible from a password reset email."
            : "This link has expired or already been used. Request a new one from the sign-in page."}
        </p>
        <button onClick={() => router.push("/login")} className="btn-p" style={{ width: "100%", justifyContent: "center" }}>
          Back to sign in →
        </button>
      </div>
    );
  }

  if (uiState === "success") {
    return (
      <div className="auth-form">
        <p className="sc-eye">Account recovery</p>
        <div className="stat-row" style={{ marginBottom: "16px" }}>
          <div className="stat-dot green" />
          <span className="stat-txt">Password updated successfully</span>
        </div>
        <h1 className="sc-ttl">Password updated.</h1>
        <p className="sc-sub">Redirecting you to the dashboard…</p>
      </div>
    );
  }

  const isLoading = uiState === "loading";

  return (
    <div className="auth-form">
      <p className="sc-eye">Account recovery</p>
      <h1 className="sc-ttl">Set new password.</h1>
      <p className="sc-sub">Choose a strong password for your account.</p>

      {uiState === "error" && errorMsg && <div className="auth-err">{errorMsg}</div>}

      <form onSubmit={handleSubmit}>
        <div className="auth-field">
          <label className="flbl" htmlFor="rp-new">New password</label>
          <input
            id="rp-new"
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (uiState === "error") setUiState("ready"); }}
            placeholder="At least 8 characters"
            required
            minLength={8}
            disabled={isLoading}
            autoComplete="new-password"
            className="finp"
          />
        </div>
        <div className="auth-field" style={{ marginBottom: "22px" }}>
          <label className="flbl" htmlFor="rp-confirm">Confirm password</label>
          <input
            id="rp-confirm"
            type="password"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); if (uiState === "error") setUiState("ready"); }}
            placeholder="Repeat password"
            required
            minLength={8}
            disabled={isLoading}
            autoComplete="new-password"
            className="finp"
          />
          <span className="mono" style={{ fontSize: "8px", letterSpacing: "0.08em", color: "var(--faint)", marginTop: "5px", display: "block" }}>
            At least 8 characters
          </span>
        </div>

        <button type="submit" disabled={isLoading} className="btn-p" style={{ width: "100%", justifyContent: "center", opacity: isLoading ? 0.6 : 1 }}>
          {isLoading ? "Updating…" : "Update password"}
        </button>
      </form>

      <p className="auth-fine">
        Changed your mind?{" "}
        <button type="button" onClick={() => router.push("/login")} className="auth-sl">
          Back to sign in
        </button>
      </p>
    </div>
  );
}
