"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface SettingsClientProps {
  email: string;
  fullName: string | null;
  plan: "free" | "pro" | "agency";
  ideasThisMonth: number;
  ideasLimit: number;
}

const PLAN_LABELS: Record<string, string> = { free: "Free", pro: "Pro", agency: "Agency" };
const PLAN_COLORS: Record<string, string> = {
  free: "var(--t3)",
  pro: "var(--accent)",
  agency: "var(--validated)",
};

export function SettingsClient({
  email,
  fullName,
  plan,
  ideasThisMonth,
  ideasLimit,
}: SettingsClientProps) {
  const router = useRouter();
  const [name, setName] = useState(fullName ?? "");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaveStatus("saving");
    const res = await fetch("/api/v1/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: name }),
    });
    setSaveStatus(res.ok ? "saved" : "error");
    if (res.ok) setTimeout(() => setSaveStatus("idle"), 2000);
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== email) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const usagePct = ideasLimit > 0 ? Math.min(1, ideasThisMonth / ideasLimit) : 0;

  return (
    <div className="space-y-8">

      {/* Account */}
      <section
        className="border rounded-md"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="display text-[15px] font-semibold tracking-tight text-[var(--t1)]">Account</h2>
        </div>
        <div className="px-6 py-5 space-y-5">

          {/* Full name */}
          <div>
            <label className="mono text-[10px] uppercase tracking-[0.12em] text-[var(--t3)] block mb-2">
              Full name
            </label>
            <div className="flex items-center gap-3">
              <input
                value={name}
                onChange={(e) => { setName(e.target.value); setSaveStatus("idle"); }}
                placeholder="Your name"
                className="flex-1 bg-[var(--canvas)] border rounded-md px-3 h-9 text-[13px] text-[var(--t1)] outline-none focus:border-[var(--accent)] transition-colors"
                style={{ borderColor: "var(--border)" }}
              />
              <button
                onClick={handleSave}
                disabled={saveStatus === "saving" || !name.trim()}
                className="mono text-[11px] h-9 px-4 rounded-md border transition-colors"
                style={{
                  borderColor: saveStatus === "saved" ? "var(--validated)" : "var(--border)",
                  color: saveStatus === "saved" ? "var(--validated)" : "var(--t2)",
                  background: "transparent",
                }}
              >
                {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : saveStatus === "error" ? "Error" : "Save"}
              </button>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="mono text-[10px] uppercase tracking-[0.12em] text-[var(--t3)] block mb-2">
              Email
            </label>
            <div
              className="flex items-center px-3 h-9 rounded-md border text-[13px]"
              style={{ borderColor: "var(--border)", background: "var(--canvas)", color: "var(--t3)" }}
            >
              {email}
            </div>
            <p className="mono text-[10px] text-[var(--t3)] mt-1.5">Managed by Google — change it in your Google account.</p>
          </div>

          {/* Plan badge */}
          <div>
            <label className="mono text-[10px] uppercase tracking-[0.12em] text-[var(--t3)] block mb-2">
              Plan
            </label>
            <span
              className="mono text-[10px] uppercase tracking-[0.1em] px-2.5 py-1 rounded border"
              style={{
                color: PLAN_COLORS[plan],
                borderColor: PLAN_COLORS[plan] + "40",
                background: PLAN_COLORS[plan] + "10",
              }}
            >
              {PLAN_LABELS[plan]}
            </span>
          </div>
        </div>
      </section>

      {/* Plan & Usage */}
      <section
        className="border rounded-md"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="display text-[15px] font-semibold tracking-tight text-[var(--t1)]">Plan & Usage</h2>
        </div>
        <div className="px-6 py-5 space-y-5">

          {/* Validations */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="mono text-[10px] uppercase tracking-[0.12em] text-[var(--t3)]">
                Validations this month
              </span>
              <span className="mono text-[11px] tnum text-[var(--t1)]">
                {ideasThisMonth} / {ideasLimit === 999 ? "∞" : ideasLimit}
              </span>
            </div>
            <div className="h-[3px] rounded-full" style={{ background: "var(--border)" }}>
              <div
                className="h-[3px] rounded-full transition-all"
                style={{
                  width: `${usagePct * 100}%`,
                  background: usagePct >= 0.9 ? "var(--kill)" : usagePct >= 0.6 ? "var(--caution)" : "var(--accent)",
                }}
              />
            </div>
          </div>

          {/* Sources */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Sources scraped", value: plan === "free" ? "Reddit + Trends" : "All sources" },
              { label: "Evidence per run", value: plan === "free" ? "6 posts" : "Unlimited" },
              { label: "Competitor matrix", value: plan === "free" ? "—" : plan === "pro" ? "Up to 14" : "Up to 50" },
              { label: "PDF export", value: plan === "free" ? "Watermarked" : "Clean" },
            ].map((item) => (
              <div key={item.label} className="border rounded-md px-3 py-2.5" style={{ borderColor: "var(--border)", background: "var(--canvas)" }}>
                <div className="mono text-[9px] uppercase tracking-[0.1em] text-[var(--t3)] mb-1">{item.label}</div>
                <div className="text-[12px] text-[var(--t1)]">{item.value}</div>
              </div>
            ))}
          </div>

          {plan === "free" && (
            <Link
              href="/pricing"
              className="flex items-center justify-between px-4 py-3 rounded-md border transition-colors hover:border-[var(--accent)]"
              style={{ borderColor: "var(--border)", background: "var(--canvas)" }}
            >
              <div>
                <div className="text-[13px] font-semibold text-[var(--t1)]">Upgrade to Pro</div>
                <div className="mono text-[10px] text-[var(--t3)] mt-0.5">Unlimited validations · all sources · clean PDF</div>
              </div>
              <span className="mono text-[11px] text-[var(--accent)]">→</span>
            </Link>
          )}
        </div>
      </section>

      {/* Billing */}
      <section
        className="border rounded-md"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="display text-[15px] font-semibold tracking-tight text-[var(--t1)]">Billing</h2>
        </div>
        <div className="px-6 py-5">
          {plan === "free" ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] text-[var(--t1)]">Free plan · <span className="text-[var(--validated)]">$0 / month</span></div>
                <div className="mono text-[10px] text-[var(--t3)] mt-1">No credit card required.</div>
              </div>
              <Link
                href="/pricing"
                className="mono text-[11px] h-8 px-4 rounded-md border hover:border-[var(--t2)] transition-colors flex items-center"
                style={{ borderColor: "var(--border)", color: "var(--t2)" }}
              >
                View plans →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] text-[var(--t1)]">{PLAN_LABELS[plan]} plan</div>
                  <div className="mono text-[10px] text-[var(--t3)] mt-1">Renews automatically · cancel anytime</div>
                </div>
                <button
                  disabled
                  className="mono text-[11px] h-8 px-4 rounded-md border opacity-40 cursor-not-allowed"
                  style={{ borderColor: "var(--border)", color: "var(--t2)" }}
                >
                  Manage subscription
                </button>
              </div>
              <p className="mono text-[10px] text-[var(--t3)]">Billing portal available soon — contact support@pledgeoff.com for changes.</p>
            </div>
          )}
        </div>
      </section>

      {/* Danger zone */}
      <section
        className="border rounded-md"
        style={{ borderColor: "rgba(229,91,60,0.3)", background: "rgba(229,91,60,0.02)" }}
      >
        <div className="px-6 py-4 border-b" style={{ borderColor: "rgba(229,91,60,0.2)" }}>
          <h2 className="display text-[15px] font-semibold tracking-tight" style={{ color: "var(--kill)" }}>Danger zone</h2>
        </div>
        <div className="px-6 py-5">
          {!deleteConfirm ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] text-[var(--t1)]">Delete account</div>
                <div className="mono text-[10px] text-[var(--t3)] mt-1">Permanently delete your account and all your data. Irreversible.</div>
              </div>
              <button
                onClick={() => setDeleteConfirm(true)}
                className="mono text-[11px] h-8 px-4 rounded-md border transition-colors hover:border-[var(--kill)] hover:text-[var(--kill)]"
                style={{ borderColor: "var(--border)", color: "var(--t3)" }}
              >
                Delete account
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[13px] text-[var(--t2)]">
                Type your email <span className="font-semibold text-[var(--t1)]">{email}</span> to confirm deletion:
              </p>
              <div className="flex items-center gap-3">
                <input
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder={email}
                  className="flex-1 bg-[var(--canvas)] border rounded-md px-3 h-9 text-[13px] text-[var(--t1)] outline-none"
                  style={{ borderColor: "rgba(229,91,60,0.4)" }}
                />
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteInput !== email}
                  className="mono text-[11px] h-9 px-4 rounded-md transition-colors"
                  style={{
                    background: deleteInput === email ? "var(--kill)" : "var(--surface)",
                    color: deleteInput === email ? "#fff" : "var(--t3)",
                    border: `1px solid ${deleteInput === email ? "var(--kill)" : "var(--border)"}`,
                    cursor: deleteInput === email ? "pointer" : "not-allowed",
                  }}
                >
                  Confirm delete
                </button>
                <button
                  onClick={() => { setDeleteConfirm(false); setDeleteInput(""); }}
                  className="mono text-[11px] h-9 px-4 rounded-md border transition-colors hover:border-[var(--t2)]"
                  style={{ borderColor: "var(--border)", color: "var(--t3)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
