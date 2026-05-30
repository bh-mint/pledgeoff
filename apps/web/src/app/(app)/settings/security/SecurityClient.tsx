"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Factor = { id: string; friendly_name?: string; factor_type: string; status: string };
type EnrollState = "idle" | "enrolling" | "verifying" | "unenrolling" | "success" | "error";

type Props = { initialFactors: Factor[] };

export function SecurityClient({ initialFactors }: Props) {
  const [factors, setFactors] = useState<Factor[]>(initialFactors);
  const [enrollState, setEnrollState] = useState<EnrollState>("idle");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [unenrollTargetId, setUnenrollTargetId] = useState("");

  const enabled = factors.some((f) => f.factor_type === "totp" && f.status === "verified");
  const isLoading = enrollState === "verifying";

  const handleEnroll = async () => {
    setEnrollState("enrolling");
    setErrorMsg("");
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      issuer: "PledgeOFF",
    });
    if (error || !data) {
      setErrorMsg(error?.message ?? "Failed to start enrollment.");
      setEnrollState("error");
      return;
    }
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setFactorId(data.id);
  };

  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEnrollState("verifying");
    setErrorMsg("");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) {
      setErrorMsg("Invalid code. Check your authenticator app and try again.");
      setEnrollState("enrolling");
      return;
    }
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    setFactors(factorsData?.totp ?? []);
    setEnrollState("success");
    setCode("");
  };

  const handleCancelEnroll = async () => {
    if (factorId) {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.mfa.unenroll({ factorId });
    }
    setEnrollState("idle");
    setQrCode("");
    setSecret("");
    setFactorId("");
    setCode("");
    setErrorMsg("");
  };

  const handleUnenroll = async () => {
    setEnrollState("verifying");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId: unenrollTargetId });
    if (error) {
      setErrorMsg(error.message);
      setEnrollState("unenrolling");
      return;
    }
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    setFactors(factorsData?.totp ?? []);
    setEnrollState("idle");
    setUnenrollTargetId("");
    setErrorMsg("");
  };

  if (enrollState === "success") {
    return (
      <div className="space-y-6">
        <SectionHeader />
        <div
          className="rounded-md border p-6"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--validated)" }} />
            <span className="mono text-[10px]" style={{ color: "var(--validated)" }}>ENABLED</span>
          </div>
          <p className="text-[13px]" style={{ color: "var(--t2)" }}>
            Two-factor authentication is active. Your account now requires a code from your authenticator app on every sign-in.
          </p>
          <button
            onClick={() => setEnrollState("idle")}
            className="mt-4 h-9 px-4 rounded-md border mono text-[11px] transition-colors hover:bg-white/5"
            style={{ borderColor: "var(--border)", color: "var(--t2)" }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  if (enrollState === "unenrolling") {
    return (
      <div className="space-y-6">
        <SectionHeader />
        <div
          className="rounded-md border p-6"
          style={{ borderColor: "rgba(229,91,60,0.4)", background: "var(--surface)" }}
        >
          <h3 className="display text-[15px] font-semibold mb-2" style={{ color: "var(--t1)" }}>
            Disable two-factor authentication?
          </h3>
          <p className="text-[13px] mb-4" style={{ color: "var(--t2)" }}>
            This will remove your authenticator app. Your account will be less secure.
          </p>
          {errorMsg && (
            <p className="text-[12px] mb-3" style={{ color: "var(--kill)" }}>{errorMsg}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleUnenroll}
              disabled={isLoading}
              className="h-9 px-4 rounded-md display text-[12px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--kill)", color: "#fff" }}
            >
              {isLoading ? "Removing…" : "Yes, disable 2FA"}
            </button>
            <button
              onClick={() => { setEnrollState("idle"); setUnenrollTargetId(""); setErrorMsg(""); }}
              disabled={isLoading}
              className="h-9 px-4 rounded-md border mono text-[11px] transition-colors hover:bg-white/5 disabled:opacity-50"
              style={{ borderColor: "var(--border)", color: "var(--t2)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (enrollState === "enrolling" || enrollState === "verifying") {
    return (
      <div className="space-y-6">
        <SectionHeader />
        <div
          className="rounded-md border p-6 space-y-5"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div>
            <h3 className="display text-[15px] font-semibold mb-1" style={{ color: "var(--t1)" }}>
              Scan this QR code
            </h3>
            <p className="text-[13px]" style={{ color: "var(--t2)" }}>
              Open Google Authenticator (or any TOTP app) and scan the code below.
            </p>
          </div>

          {qrCode && (
            <div className="flex flex-col items-start gap-4">
              {/* QR code */}
              <div
                className="rounded-md border p-3 inline-block"
                style={{ borderColor: "var(--border)", background: "#fff" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCode} alt="TOTP QR code" width={160} height={160} />
              </div>

              {/* Manual entry fallback */}
              <div>
                <p className="mono text-[10px] mb-1" style={{ color: "var(--t3)" }}>
                  Can&apos;t scan? Enter this key manually:
                </p>
                <code
                  className="mono text-[11px] px-2 py-1 rounded select-all"
                  style={{ background: "var(--canvas)", color: "var(--t1)", border: "1px solid var(--border)" }}
                >
                  {secret}
                </code>
              </div>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-3 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
            <p className="text-[13px]" style={{ color: "var(--t2)" }}>
              Enter the 6-digit code from your app to confirm setup.
            </p>
            {errorMsg && (
              <p className="text-[12px]" style={{ color: "var(--kill)" }}>{errorMsg}</p>
            )}
            <label className="block">
              <span className="mono text-[10px] uppercase" style={{ color: "var(--t3)" }}>Verification code</span>
              <div
                className="mt-1.5 rounded-md border px-3 h-10 flex items-center"
                style={{ borderColor: "var(--border)", background: "var(--canvas)" }}
              >
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  required
                  disabled={isLoading}
                  autoComplete="one-time-code"
                  className="w-full text-[13px] tracking-[0.25em] bg-transparent outline-none placeholder:text-(--t3) placeholder:tracking-normal"
                  style={{ color: "var(--t1)" }}
                />
              </div>
            </label>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isLoading || code.length !== 6}
                className="h-9 px-4 rounded-md display text-[13px] font-semibold flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
              >
                {isLoading ? (
                  <>
                    <span className="inline-block w-3 h-3 rounded-full border-2 border-black/30 border-t-black/90 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  "Activate 2FA"
                )}
              </button>
              <button
                type="button"
                onClick={handleCancelEnroll}
                disabled={isLoading}
                className="h-9 px-4 rounded-md border mono text-[11px] transition-colors hover:bg-white/5 disabled:opacity-50"
                style={{ borderColor: "var(--border)", color: "var(--t2)" }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader />

      <div
        className="rounded-md border divide-y"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        {/* 2FA status row */}
        <div className="p-5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="display text-[13px] font-semibold" style={{ color: "var(--t1)" }}>
                Authenticator app
              </span>
              {enabled ? (
                <span
                  className="mono text-[9px] px-1.5 py-0.5 rounded"
                  style={{ background: "color-mix(in srgb, var(--validated) 12%, transparent)", color: "var(--validated)", border: "1px solid color-mix(in srgb, var(--validated) 30%, transparent)" }}
                >
                  ON
                </span>
              ) : (
                <span
                  className="mono text-[9px] px-1.5 py-0.5 rounded"
                  style={{ background: "var(--canvas)", color: "var(--t3)", border: "1px solid var(--border)" }}
                >
                  OFF
                </span>
              )}
            </div>
            <p className="text-[12px]" style={{ color: "var(--t2)" }}>
              {enabled
                ? "Your account is protected. A code from Google Authenticator is required on every sign-in."
                : "Use Google Authenticator or any TOTP app to add a second layer of security."}
            </p>
          </div>

          {enabled ? (
            <button
              onClick={() => {
                const f = factors.find((x) => x.factor_type === "totp" && x.status === "verified");
                if (f) { setUnenrollTargetId(f.id); setEnrollState("unenrolling"); }
              }}
              className="shrink-0 h-9 px-4 rounded-md border mono text-[11px] transition-colors hover:bg-white/5"
              style={{ borderColor: "var(--border)", color: "var(--t2)" }}
            >
              Remove
            </button>
          ) : (
            <button
              onClick={handleEnroll}
              className="shrink-0 h-9 px-4 rounded-md display text-[13px] font-semibold transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              Enable
            </button>
          )}
        </div>

        {/* Info row */}
        <div className="px-5 py-3">
          <p className="mono text-[10px]" style={{ color: "var(--t3)" }}>
            Compatible with Google Authenticator, Authy, 1Password, and any TOTP app.
          </p>
        </div>
      </div>

      {enrollState === "error" && errorMsg && (
        <p className="text-[12px]" style={{ color: "var(--kill)" }}>{errorMsg}</p>
      )}
    </div>
  );
}

function SectionHeader() {
  return (
    <div>
      <h2 className="display text-[18px] font-semibold" style={{ color: "var(--t1)" }}>
        Security
      </h2>
      <p className="text-[13px] mt-1" style={{ color: "var(--t2)" }}>
        Manage two-factor authentication and account security.
      </p>
    </div>
  );
}
