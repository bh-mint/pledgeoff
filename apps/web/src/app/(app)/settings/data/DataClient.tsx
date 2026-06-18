"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { email: string };

export function DataClient({ email }: Props) {
  const router = useRouter();
  const [exportState, setExportState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  const handleDeleteAccount = async () => {
    if (deleteInput !== email) return;
    await fetch("/api/v1/profile", { method: "DELETE" });
    router.push("/");
  };

  return (
    <div>
      {/* Export */}
      <div className="sec">
        <div className="sec-hd">
          Export your data
          <span className="r">GDPR</span>
        </div>
        <div className="sec-bd">
          <p style={{ fontSize: 13, color: "var(--dim)", marginBottom: 14, maxWidth: "56ch" }}>
            Download a zip archive of all your ideas, verdicts, and intelligence tool results. We&apos;ll email you a link when it&apos;s ready — usually within a few minutes.
          </p>

          {exportState === "done" ? (
            <span className="fine" style={{ color: "var(--go)" }}>✓ Export requested — check your email shortly.</span>
          ) : exportState === "error" ? (
            <span className="fine" style={{ color: "var(--kill)" }}>Export failed. Try again.</span>
          ) : (
            <button
              className="btn-p"
              disabled={exportState === "loading"}
              onClick={async () => {
                setExportState("loading");
                try {
                  const res = await fetch("/api/v1/data-export", { method: "POST" });
                  if (!res.ok) { setExportState("error"); return; }
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  const cd = res.headers.get("Content-Disposition") ?? "";
                  const match = /filename="([^"]+)"/.exec(cd);
                  a.download = match?.[1] ?? "pledgeoff-export.json";
                  a.click();
                  URL.revokeObjectURL(url);
                  setExportState("done");
                  setTimeout(() => setExportState("idle"), 4000);
                } catch {
                  setExportState("error");
                }
              }}
            >
              {exportState === "loading" ? "Preparing…" : "Request data export"}
            </button>
          )}
        </div>
      </div>

      {/* Audit log gate */}
      <div className="sec">
        <div className="sec-hd">
          Audit log
          <span className="r">Studio+</span>
        </div>
        <div className="sec-bd">
          <div className="plan-gate">
            <span className="pg-tag">Studio+</span>
            <div>
              <div className="pg-ttl">Requires Studio or Enterprise</div>
              <p className="pg-desc">A tamper-evident log of every action on your account — who ran what, when, and from which IP. Exportable as a signed PDF.</p>
              <a href="/pricing" className="btn-xs p">Upgrade to Studio</a>
            </div>
          </div>
        </div>
      </div>

      {/* Delete account */}
      <div className="sec danger-sec">
        <div className="sec-hd">Delete account</div>
        <div className="sec-bd">
          <p style={{ fontSize: 13, color: "var(--dim)", marginBottom: 16, maxWidth: "56ch" }}>
            Permanently delete your account and all associated data — ideas, verdicts, tool results, and billing history. This cannot be undone. If you are a team owner, transfer ownership before deleting.
          </p>

          {!deleteConfirm ? (
            <button
              className="btn-xs d"
              style={{ padding: "8px 16px" }}
              onClick={() => setDeleteConfirm(true)}
            >
              Delete my account
            </button>
          ) : (
            <div>
              <button
                className="btn-xs d"
                style={{ padding: "8px 16px", marginBottom: 14 }}
                onClick={() => { setDeleteConfirm(false); setDeleteInput(""); }}
              >
                Cancel
              </button>
              <div style={{ background: "var(--bg)", border: "1px solid rgba(158,42,26,0.22)", padding: 14 }}>
                <div
                  style={{
                    fontFamily: "var(--font-chivo-mono), monospace",
                    fontSize: "8.5px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--kill)",
                    marginBottom: 8,
                  }}
                >
                  Type your email to confirm
                </div>
                <div className="finp-row">
                  <input
                    className="finp"
                    type="email"
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    placeholder={email}
                    style={{ flex: 1, borderColor: "rgba(158,42,26,0.3)" }}
                  />
                  <button
                    className="btn-xs d"
                    style={{ padding: "10px 14px" }}
                    onClick={handleDeleteAccount}
                    disabled={deleteInput !== email}
                  >
                    Permanently delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
