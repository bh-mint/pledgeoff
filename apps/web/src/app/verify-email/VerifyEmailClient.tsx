"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const COOLDOWN_SECONDS = 60;

export function VerifyEmailClient({ email }: { email: string }) {
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/v1/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Request failed");
      setSent(true); setCooldown(COOLDOWN_SECONDS);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [email]);

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="auth-form">
      <p className="sc-eye">Account setup</p>
      <h1 className="sc-ttl">Verify your email.</h1>

      <div className="em-chip">
        <span>{email || "your email"}</span>
        <button onClick={handleSignOut}>Change</button>
      </div>

      <div className="stat-row" style={{ marginBottom: sent ? "16px" : 0 }}>
        <div className="stat-dot amber pulse" />
        <span className="stat-txt">Waiting for verification — check your spam folder</span>
      </div>

      {sent && <div className="auth-ok">New confirmation email sent. Check your inbox.</div>}
      {error && <div className="auth-err">{error}</div>}

      <div className="auth-foot" style={{ marginTop: "20px" }}>
        <button
          onClick={handleResend}
          disabled={loading || cooldown > 0}
          className="auth-sl"
        >
          {loading ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend verification email"}
        </button>
        <Link href="/login" className="auth-sl">Use a different account</Link>
      </div>
    </div>
  );
}
