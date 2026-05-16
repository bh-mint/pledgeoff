"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Plan } from "@pledgeoff/core";
import { PLAN_LIMITS } from "@pledgeoff/core";

interface SettingsClientProps {
  email: string;
  fullName: string | null;
  plan: Plan;
  ideasThisMonth: number;
  renewsAt?: string | null;
  stripeCustomerId?: string | null;
}

const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  pro: "Pro",
  pro_plus: "Pro+",
};

const PLAN_COLORS: Record<Plan, string> = {
  free: "var(--t3)",
  pro: "var(--accent)",
  pro_plus: "var(--validated)",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function SettingsClient({
  email,
  fullName,
  plan,
  ideasThisMonth,
  renewsAt,
  stripeCustomerId,
}: SettingsClientProps) {
  const router = useRouter();
  const [name, setName] = useState(fullName ?? "");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [portalLoading, setPortalLoading] = useState(false);

  const ideasLimit = PLAN_LIMITS[plan].verificationsPerMonth;
  const isUnlimited = ideasLimit === Infinity;
  const usagePct = isUnlimited ? 0 : Math.min(1, ideasThisMonth / ideasLimit);
  const isPaid = plan !== "free";

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
    await fetch("/api/v1/profile", { method: "DELETE" });
    router.push("/");
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch("/api/v1/billing/portal", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const { data } = await res.json() as { data: { url: string } };
        router.push(data.url);
      }
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="space-y-8">

      {/* Account */}
      <section
        className="border rounded-md"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="display text-[15px] font-semibold tracking-tight text-(--t1)">Account</h2>
        </div>
        <div className="px-6 py-5 space-y-5">

          {/* Full name */}
          <div>
            <label className="mono text-[10px] uppercase tracking-[0.12em] text-(--t3) block mb-2">
              Full name
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                value={name}
                onChange={(e) => { setName(e.target.value); setSaveStatus("idle"); }}
                placeholder="Your name"
                className="flex-1 bg-(--canvas) border rounded-md px-3 h-9 text-[13px] text-(--t1) outline-none focus:border-(--accent) transition-colors"
                style={{ borderColor: "var(--border)" }}
              />
              <button
                onClick={handleSave}
                disabled={saveStatus === "saving" || !name.trim()}
                className="mono text-[11px] h-9 px-4 rounded-md border transition-colors sm:flex-shrink-0"
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
            <label className="mono text-[10px] uppercase tracking-[0.12em] text-(--t3) block mb-2">
              Email
            </label>
            <div
              className="flex items-center px-3 h-9 rounded-md border text-[13px]"
              style={{ borderColor: "var(--border)", background: "var(--canvas)", color: "var(--t3)" }}
            >
              {email}
            </div>
            <p className="mono text-[10px] text-(--t3) mt-1.5">Managed by Google — change it in your Google account.</p>
          </div>

          {/* Plan badge */}
          <div>
            <label className="mono text-[10px] uppercase tracking-[0.12em] text-(--t3) block mb-2">
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
          <h2 className="display text-[15px] font-semibold tracking-tight text-(--t1)">Plan & Usage</h2>
        </div>
        <div className="px-6 py-5 space-y-5">

          {/* Validations */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="mono text-[10px] uppercase tracking-[0.12em] text-(--t3)">
                Validations this month
              </span>
              <span className="mono text-[11px] tnum text-(--t1)">
                {ideasThisMonth} / {isUnlimited ? "∞" : ideasLimit}
              </span>
            </div>
            {!isUnlimited && (
              <div className="h-[3px] rounded-full" style={{ background: "var(--border)" }}>
                <div
                  className="h-[3px] rounded-full transition-all"
                  style={{
                    width: `${usagePct * 100}%`,
                    background: usagePct >= 0.9 ? "var(--kill)" : usagePct >= 0.6 ? "var(--caution)" : "var(--accent)",
                  }}
                />
              </div>
            )}
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
                <div className="mono text-[9px] uppercase tracking-[0.1em] text-(--t3) mb-1">{item.label}</div>
                <div className="text-[12px] text-(--t1)">{item.value}</div>
              </div>
            ))}
          </div>

          {!isPaid && (
            <Link
              href="/pricing"
              className="flex items-center justify-between px-4 py-3 rounded-md border transition-colors hover:border-(--accent)"
              style={{ borderColor: "var(--border)", background: "var(--canvas)" }}
            >
              <div>
                <div className="text-[13px] font-semibold text-(--t1)">Upgrade to Pro</div>
                <div className="mono text-[10px] text-(--t3) mt-0.5">Unlimited validations · all sources · clean PDF</div>
              </div>
              <span className="mono text-[11px] text-(--accent)">→</span>
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
          <h2 className="display text-[15px] font-semibold tracking-tight text-(--t1)">Billing</h2>
        </div>
        <div className="px-6 py-5">
          {!isPaid ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <div>
                <div className="text-[13px] text-(--t1)">Free plan · <span className="text-(--validated)">$0 / month</span></div>
                <div className="mono text-[10px] text-(--t3) mt-1">No credit card required.</div>
              </div>
              <Link
                href="/pricing"
                className="mono text-[11px] h-8 px-4 rounded-md border hover:border-(--t2) transition-colors inline-flex items-center self-start sm:self-auto"
                style={{ borderColor: "var(--border)", color: "var(--t2)" }}
              >
                View plans →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <div>
                <div className="text-[13px] text-(--t1)">{PLAN_LABELS[plan]} plan</div>
                <div className="mono text-[10px] text-(--t3) mt-1">
                  {renewsAt ? `Renews on ${formatDate(renewsAt)}` : "Renews automatically"} · cancel anytime
                </div>
              </div>
              {stripeCustomerId && (
                <button
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  className="mono text-[11px] h-8 px-4 rounded-md border hover:border-(--t2) transition-colors self-start sm:self-auto"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--t2)",
                    opacity: portalLoading ? 0.5 : 1,
                  }}
                >
                  {portalLoading ? "Loading…" : "Manage subscription →"}
                </button>
              )}
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <div>
                <div className="text-[13px] text-(--t1)">Delete account</div>
                <div className="mono text-[10px] text-(--t3) mt-1">Permanently delete your account and all your data. Irreversible.</div>
              </div>
              <button
                onClick={() => setDeleteConfirm(true)}
                className="mono text-[11px] h-8 px-4 rounded-md border transition-colors hover:border-(--kill) hover:text-(--kill) self-start sm:self-auto"
                style={{ borderColor: "var(--border)", color: "var(--t3)" }}
              >
                Delete account
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[13px] text-(--t2)">
                Type your email <span className="font-semibold text-(--t1)">{email}</span> to confirm deletion:
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
                  className="mono text-[11px] h-9 px-4 rounded-md border transition-colors hover:border-(--t2)"
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
