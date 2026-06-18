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
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", issuer: "PledgeOFF" });
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
      <div>
        <div className="sec">
          <div className="sec-hd">
            Two-factor authentication
            <span className="r"><span className="bdg bdg-go">Enabled</span></span>
          </div>
          <div className="sec-bd">
            <p style={{ fontSize: 13, color: "var(--dim)", marginBottom: 16 }}>
              Two-factor authentication is now active. Your account requires a code from your authenticator app on every sign-in.
            </p>
            <button
              className="btn-xs"
              onClick={() => setEnrollState("idle")}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (enrollState === "unenrolling") {
    return (
      <div>
        <div className="sec danger-sec">
          <div className="sec-hd">Disable two-factor authentication</div>
          <div className="sec-bd">
            <p style={{ fontSize: 13, color: "var(--dim)", marginBottom: 16 }}>
              This will remove your authenticator app. Your account will be less secure.
            </p>
            {errorMsg && (
              <p style={{ fontSize: 12, color: "var(--kill)", marginBottom: 12 }}>{errorMsg}</p>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn-xs d"
                style={{ padding: "8px 16px" }}
                onClick={handleUnenroll}
                disabled={isLoading}
              >
                {isLoading ? "Removing…" : "Yes, disable 2FA"}
              </button>
              <button
                className="btn-xs"
                onClick={() => { setEnrollState("idle"); setUnenrollTargetId(""); setErrorMsg(""); }}
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (enrollState === "enrolling" || enrollState === "verifying") {
    return (
      <div>
        <div className="sec">
          <div className="sec-hd">Set up authenticator app</div>
          <div className="sec-bd">
            <p style={{ fontSize: 13, color: "var(--dim)", marginBottom: 18 }}>
              Open Google Authenticator (or any TOTP app) and scan the code below.
            </p>

            {qrCode && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ background: "#fff", border: "1px solid var(--line)", display: "inline-block", padding: 12, marginBottom: 12 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCode} alt="TOTP QR code" width={160} height={160} />
                </div>
                <div>
                  <p className="fine">Can&apos;t scan? Enter this key manually:</p>
                  <code
                    style={{
                      fontFamily: "var(--font-chivo-mono), monospace",
                      fontSize: 11,
                      padding: "4px 8px",
                      background: "var(--bg)",
                      border: "1px solid var(--line)",
                      color: "var(--ink)",
                      display: "inline-block",
                      marginTop: 4,
                      userSelect: "all",
                    }}
                  >
                    {secret}
                  </code>
                </div>
              </div>
            )}

            <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 18 }}>
              <p style={{ fontSize: 13, color: "var(--dim)", marginBottom: 12 }}>
                Enter the 6-digit code from your app to confirm setup.
              </p>
              {errorMsg && (
                <p style={{ fontSize: 12, color: "var(--kill)", marginBottom: 10 }}>{errorMsg}</p>
              )}
              <form onSubmit={handleVerify}>
                <div className="fg">
                  <label className="flbl">Verification code</label>
                  <input
                    className="finp"
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
                    style={{ letterSpacing: "0.2em", maxWidth: 200 }}
                  />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <button
                    type="submit"
                    className="btn-p"
                    disabled={isLoading || code.length !== 6}
                  >
                    {isLoading ? "Verifying…" : "Activate 2FA"}
                  </button>
                  <button
                    type="button"
                    className="btn-xs"
                    onClick={handleCancelEnroll}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="sec">
        <div className="sec-hd">
          Two-factor authentication
          <span className="r">
            {enabled
              ? <span className="bdg bdg-go">Enabled</span>
              : <span className="bdg bdg-faint">Disabled</span>
            }
          </span>
        </div>
        <div className="sec-bd">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ fontFamily: "var(--font-bitter), Georgia, serif", fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 2 }}>
                Authenticator app (TOTP)
              </div>
              <div className="fine" style={{ marginTop: 0 }}>
                {enabled
                  ? "Enabled · Compatible with Google Authenticator, Authy, 1Password"
                  : "Use Google Authenticator or any TOTP app to add a second layer of security."}
              </div>
            </div>
            {enabled ? (
              <button
                className="btn-xs d"
                onClick={() => {
                  const f = factors.find((x) => x.factor_type === "totp" && x.status === "verified");
                  if (f) { setUnenrollTargetId(f.id); setEnrollState("unenrolling"); }
                }}
              >
                Disable 2FA
              </button>
            ) : (
              <button className="btn-xs p" onClick={handleEnroll}>
                Enable
              </button>
            )}
          </div>
        </div>
      </div>

      {enrollState === "error" && errorMsg && (
        <p style={{ fontSize: 12, color: "var(--kill)", marginTop: 8 }}>{errorMsg}</p>
      )}
    </div>
  );
}
