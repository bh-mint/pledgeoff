"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const COOLDOWN_SECONDS = 60;

export function VerifyEmailClient({ email }: { email: string }) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Request failed");
      setSent(true);
      setCooldown(COOLDOWN_SECONDS);
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
    <div
      className="rounded-md border p-8 w-full max-w-sm reveal"
      style={{ borderColor: "var(--border)", background: "var(--surface)", animationDelay: "200ms" }}
    >
      <div className="display text-[14px] font-semibold mb-6">
        Pledge<span style={{ color: "var(--accent)" }}>OFF</span>
      </div>

      <div
        className="rounded-md border p-4 mb-5"
        style={{ borderColor: "var(--border)", background: "var(--canvas)" }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--validated)" }} />
          <span className="mono text-[10px]" style={{ color: "var(--validated)" }}>SENT</span>
        </div>
        <div className="mono text-[11px]" style={{ color: "var(--t2)" }}>to: {email || "your email"}</div>
        <div className="mono text-[11px]" style={{ color: "var(--t3)" }}>subj: Confirm your PledgeOFF account</div>
      </div>

      <h1 className="display text-[24px] font-semibold leading-tight" style={{ color: "var(--t1)" }}>
        Verify your email.
      </h1>
      <p className="text-[13px] mt-2 leading-relaxed" style={{ color: "var(--t2)" }}>
        Click the link we sent to{" "}
        <span style={{ color: "var(--t1)" }}>{email || "your email address"}</span>{" "}
        to activate your account.
      </p>

      {sent && (
        <div
          className="rounded-md border p-3 mt-4"
          style={{ borderColor: "rgba(74,222,128,0.3)", background: "rgba(74,222,128,0.06)" }}
        >
          <p className="text-[12px]" style={{ color: "var(--validated)" }}>
            New confirmation email sent. Check your inbox.
          </p>
        </div>
      )}

      {error && (
        <div
          className="rounded-md border p-3 mt-4"
          style={{ borderColor: "rgba(229,91,60,0.4)", background: "rgba(229,91,60,0.06)" }}
        >
          <p className="text-[12px]" style={{ color: "var(--t1)" }}>{error}</p>
        </div>
      )}

      <button
        onClick={handleResend}
        disabled={loading || cooldown > 0}
        className="mt-5 w-full h-10 rounded-md border display text-[13px] transition-colors hover:bg-white/5 disabled:opacity-50"
        style={{ borderColor: "var(--border)", color: "var(--t1)" }}
      >
        {loading
          ? "Sending…"
          : cooldown > 0
            ? `Resend in ${cooldown}s`
            : "Resend confirmation email"}
      </button>

      <p className="mono text-[10px] mt-5 leading-relaxed" style={{ color: "var(--t3)" }}>
        Wrong email?{" "}
        <button onClick={handleSignOut} className="underline" style={{ color: "var(--t2)" }}>
          Sign out
        </button>{" "}
        and create a new account, or{" "}
        <Link href="/login" className="underline" style={{ color: "var(--t2)" }}>
          sign in
        </Link>{" "}
        with a different address.
      </p>
    </div>
  );
}
