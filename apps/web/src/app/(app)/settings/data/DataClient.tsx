"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { email: string };

export function DataClient({ email }: Props) {
  const router = useRouter();
  const [exportState, setExportState] = useState<
    "idle" | "loading" | "done" | "error"
  >("idle");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  const handleDeleteAccount = async () => {
    if (deleteInput !== email) return;
    await fetch("/api/v1/profile", { method: "DELETE" });
    router.push("/");
  };

  return (
    <div>
      <h1
        className="display text-[28px] font-semibold tracking-tight mb-1"
        style={{ color: "var(--kill)" }}
      >
        Danger zone
      </h1>
      <p className="text-[13px] mb-8" style={{ color: "var(--t2)" }}>
        Irreversible actions. Proceed with care.
      </p>

      {/* Data export */}
      <div
        className="border rounded-md p-5 mb-4"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="display text-[15px] font-semibold mb-1 text-(--t1)">
          Export my data
        </div>
        <p className="text-[12px] mb-4" style={{ color: "var(--t2)" }}>
          Download a JSON file with all your ideas, decisions, signals, and
          profile data.
        </p>
        {exportState === "done" ? (
          <span className="mono text-[11px]" style={{ color: "var(--validated)" }}>
            ✓ Download started
          </span>
        ) : exportState === "error" ? (
          <span className="mono text-[11px]" style={{ color: "var(--kill)" }}>
            Export failed. Try again.
          </span>
        ) : (
          <button
            disabled={exportState === "loading"}
            onClick={async () => {
              setExportState("loading");
              try {
                const res = await fetch("/api/v1/data-export", {
                  method: "POST",
                });
                if (!res.ok) {
                  setExportState("error");
                  return;
                }
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
            className="mono text-[11px] h-9 px-4 rounded-md border transition-colors disabled:opacity-50"
            style={{
              borderColor: "var(--border)",
              color: "var(--t2)",
              background: "var(--surface)",
            }}
          >
            {exportState === "loading" ? "Preparing…" : "Export all data (JSON)"}
          </button>
        )}
      </div>

      {/* Delete account */}
      <div
        className="border rounded-md p-5"
        style={{
          borderColor: "rgba(229,91,60,0.3)",
          background: "rgba(229,91,60,0.02)",
        }}
      >
        <div
          className="display text-[15px] font-semibold mb-1"
          style={{ color: "var(--kill)" }}
        >
          Delete account
        </div>
        <p className="text-[12px] mb-4" style={{ color: "var(--t2)" }}>
          Permanently deletes your account and all data. Irreversible.
        </p>

        {!deleteConfirm ? (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="mono text-[11px] h-9 px-4 rounded-md border transition-colors hover:border-(--kill) hover:text-(--kill)"
            style={{ borderColor: "var(--border)", color: "var(--t3)" }}
          >
            Delete account
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-[13px] text-(--t2)">
              Type your email{" "}
              <span className="font-semibold text-(--t1)">{email}</span> to
              confirm:
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder={email}
                className="flex-1 bg-(--canvas) border rounded-md px-3 h-9 text-[13px] text-(--t1) outline-none"
                style={{ borderColor: "rgba(229,91,60,0.4)" }}
              />
              <button
                onClick={handleDeleteAccount}
                disabled={deleteInput !== email}
                className="mono text-[11px] h-9 px-4 rounded-md transition-colors disabled:cursor-not-allowed"
                style={{
                  background:
                    deleteInput === email ? "var(--kill)" : "var(--surface)",
                  color: deleteInput === email ? "#fff" : "var(--t3)",
                  border: `1px solid ${deleteInput === email ? "var(--kill)" : "var(--border)"}`,
                }}
              >
                Confirm delete
              </button>
              <button
                onClick={() => {
                  setDeleteConfirm(false);
                  setDeleteInput("");
                }}
                className="mono text-[11px] h-9 px-4 rounded-md border"
                style={{ borderColor: "var(--border)", color: "var(--t3)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
