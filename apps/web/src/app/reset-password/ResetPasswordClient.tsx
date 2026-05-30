"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type State = "verifying" | "ready" | "loading" | "error" | "success" | "invalid_token" | "no_token";

function Logo() {
  return (
    <div className="display text-[14px] font-semibold mb-4">
      Pledge<span style={{ color: "var(--accent)" }}>OFF</span>
    </div>
  );
}

const CARD_CLASS = "rounded-md border p-8 w-full max-w-sm reveal";
const CARD_STYLE = {
  borderColor: "var(--border)",
  background: "var(--surface)",
  animationDelay: "200ms",
};

export function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const hasValidParams = !!tokenHash && type === "recovery";

  const [uiState, setUiState] = useState<State>(hasValidParams ? "verifying" : "no_token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!hasValidParams || !tokenHash) return;

    const supabase = createSupabaseBrowserClient();
    supabase.auth
      .verifyOtp({ type: "recovery", token_hash: tokenHash })
      .then(({ error }) => {
        setUiState(error ? "invalid_token" : "ready");
      });
  }, [hasValidParams, tokenHash]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password !== confirm) {
      setErrorMsg("Passwords don't match.");
      setUiState("error");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      setUiState("error");
      return;
    }
    setUiState("loading");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErrorMsg(error.message);
      setUiState("error");
    } else {
      setUiState("success");
      setTimeout(() => router.push("/dashboard"), 2000);
    }
  };

  if (uiState === "verifying") {
    return (
      <div className={CARD_CLASS} style={CARD_STYLE}>
        <Logo />
        <div className="flex items-center gap-2 mt-2">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-black/30 border-t-black/90 animate-spin" />
          <span className="text-[13px]" style={{ color: "var(--t2)" }}>Verifying link…</span>
        </div>
      </div>
    );
  }

  if (uiState === "no_token" || uiState === "invalid_token") {
    return (
      <div className={CARD_CLASS} style={CARD_STYLE}>
        <Logo />
        <h1 className="display text-[24px] font-semibold leading-tight" style={{ color: "var(--t1)" }}>
          {uiState === "no_token" ? "No reset link." : "Link expired."}
        </h1>
        <p className="text-[13px] mt-2 leading-relaxed" style={{ color: "var(--t2)" }}>
          {uiState === "no_token"
            ? "This page is only accessible from a password reset email."
            : "This link has expired or already been used. Request a new one from the sign-in page."}
        </p>
        <button
          onClick={() => router.push("/login")}
          className="mt-6 w-full h-10 rounded-md display text-[13px] font-semibold flex items-center justify-center transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          Back to sign in →
        </button>
      </div>
    );
  }

  if (uiState === "success") {
    return (
      <div className={CARD_CLASS} style={CARD_STYLE}>
        <Logo />
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--validated)" }} />
          <span className="mono text-[10px]" style={{ color: "var(--validated)" }}>UPDATED</span>
        </div>
        <h1 className="display text-[24px] font-semibold leading-tight" style={{ color: "var(--t1)" }}>
          Password updated.
        </h1>
        <p className="text-[13px] mt-2 leading-relaxed" style={{ color: "var(--t2)" }}>
          Redirecting you to the dashboard…
        </p>
      </div>
    );
  }

  const isLoading = uiState === "loading";

  return (
    <div className={CARD_CLASS} style={CARD_STYLE}>
      <Logo />
      <h1 className="display text-[24px] font-semibold leading-tight" style={{ color: "var(--t1)" }}>
        Set new password.
      </h1>
      <p className="text-[13px] mt-1" style={{ color: "var(--t2)" }}>
        Choose a strong password for your account.
      </p>

      {uiState === "error" && errorMsg && (
        <div
          className="rounded-md border p-3 mt-5"
          style={{ borderColor: "rgba(229,91,60,0.4)", background: "rgba(229,91,60,0.06)" }}
        >
          <div className="text-[12px]" style={{ color: "var(--t1)" }}>{errorMsg}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <label className="block">
          <span className="mono text-[10px] uppercase" style={{ color: "var(--t3)" }}>New password</span>
          <div
            className="mt-1.5 rounded-md border px-3 h-10 flex items-center"
            style={{ borderColor: "var(--border)", background: "var(--canvas)" }}
          >
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (uiState === "error") setUiState("ready");
              }}
              placeholder="At least 8 characters"
              required
              minLength={8}
              disabled={isLoading}
              autoComplete="new-password"
              className="w-full text-[13px] bg-transparent outline-none placeholder:text-(--t3)"
              style={{ color: "var(--t1)" }}
            />
          </div>
        </label>

        <label className="block">
          <span className="mono text-[10px] uppercase" style={{ color: "var(--t3)" }}>Confirm password</span>
          <div
            className="mt-1.5 rounded-md border px-3 h-10 flex items-center"
            style={{ borderColor: "var(--border)", background: "var(--canvas)" }}
          >
            <input
              type="password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                if (uiState === "error") setUiState("ready");
              }}
              placeholder="Repeat password"
              required
              minLength={8}
              disabled={isLoading}
              autoComplete="new-password"
              className="w-full text-[13px] bg-transparent outline-none placeholder:text-(--t3)"
              style={{ color: "var(--t1)" }}
            />
          </div>
          <span className="mono text-[10px] mt-1.5 block" style={{ color: "var(--t3)" }}>
            8+ chars · 1 number · 1 symbol
          </span>
        </label>

        <button
          type="submit"
          disabled={isLoading}
          className="display w-full h-10 rounded-md text-[13px] font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          {isLoading ? (
            <>
              <span className="inline-block w-3 h-3 rounded-full border-2 border-black/30 border-t-black/90 animate-spin" />
              Updating…
            </>
          ) : (
            "Update password"
          )}
        </button>
      </form>

      <p className="mono text-[10px] mt-5" style={{ color: "var(--t3)" }}>
        Changed your mind?{" "}
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="underline"
          style={{ color: "var(--t2)" }}
        >
          Back to sign in
        </button>
      </p>
    </div>
  );
}
