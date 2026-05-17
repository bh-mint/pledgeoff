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

type SectionId = "account" | "billing" | "notifications" | "api" | "danger";

const SECTIONS: Array<{ id: SectionId; label: string }> = [
  { id: "account", label: "Account" },
  { id: "billing", label: "Billing" },
  { id: "notifications", label: "Notifications" },
  { id: "api", label: "API" },
  { id: "danger", label: "Danger zone" },
];

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

const NOTIFICATION_ITEMS = [
  {
    key: "goldmine",
    label: "Daily Goldmine digest",
    desc: "Sent every day at 09:00 UTC. The 12 niches with one-line previews.",
  },
  {
    key: "weekly",
    label: "Weekly progress summary",
    desc: "Mondays — what you validated, what you killed, what's launch-ready.",
  },
  {
    key: "score",
    label: "Score reveal notification",
    desc: "When a long-running validation finishes.",
  },
];

export function SettingsClient({
  email,
  fullName,
  plan,
  ideasThisMonth,
  renewsAt,
  stripeCustomerId,
}: SettingsClientProps) {
  const router = useRouter();
  const [section, setSection] = useState<SectionId>("account");
  const [name, setName] = useState(fullName ?? "");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [portalLoading, setPortalLoading] = useState(false);
  const [notifState, setNotifState] = useState<Record<string, boolean>>({
    goldmine: false,
    weekly: false,
    score: false,
  });

  const ideasLimit = PLAN_LIMITS[plan].verificationsPerMonth;
  const isUnlimited = ideasLimit === Infinity;
  const usagePct = isUnlimited ? 0 : Math.min(1, ideasThisMonth / ideasLimit);
  const isPaid = plan !== "free";

  const initials = (fullName ?? email)
    .split(/[\s@]/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

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
    <div className="grid grid-cols-12 gap-10 mt-6">

      {/* Mobile: horizontal tab row */}
      <div className="col-span-12 md:hidden flex gap-1 overflow-x-auto pb-2 border-b" style={{ borderColor: "var(--border)" }}>
        {SECTIONS.map((s) => {
          const active = section === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className="mono text-[10px] whitespace-nowrap px-3 py-1.5 rounded-md shrink-0 transition-colors"
              style={{
                background: active ? "var(--accent)" : "var(--surface)",
                color: active ? "#000" : "var(--t2)",
                border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:block col-span-3">
        <div
          className="mono text-[10px] uppercase tracking-[0.14em] mb-4"
          style={{ color: "var(--t3)" }}
        >
          settings
        </div>
        <nav className="flex flex-col">
          {SECTIONS.map((s) => {
            const active = section === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className="text-left text-[13px] py-2.5 border-b flex items-center justify-between transition-colors"
                style={{
                  borderColor: "var(--border)",
                  color: active ? "var(--t1)" : "var(--t2)",
                }}
              >
                {s.label}
                {active && <span style={{ color: "var(--accent)" }}>→</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Content area */}
      <main className="col-span-12 md:col-span-9 max-w-170">

        {/* ── Account ── */}
        {section === "account" && (
          <div>
            <h1 className="display text-[28px] font-semibold tracking-tight text-(--t1) mb-1">Account</h1>
            <p className="text-[13px] mb-8" style={{ color: "var(--t2)" }}>Your identity. Kept minimal on purpose.</p>

            {/* Avatar + name summary */}
            <div className="flex items-center gap-4 mb-8">
              <div
                className="w-14 h-14 rounded-full border display text-[18px] font-semibold flex items-center justify-center shrink-0"
                style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--t1)" }}
              >
                {initials}
              </div>
              <div>
                <div className="text-[13px] text-(--t1)">{fullName ?? email}</div>
                <div className="mono text-[10px] mt-0.5" style={{ color: "var(--t3)" }}>{email}</div>
              </div>
            </div>

            <div className="border rounded-md overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              {/* Name row */}
              <div className="grid grid-cols-12 gap-4 px-5 py-4 border-b items-center" style={{ borderColor: "var(--border)" }}>
                <div className="col-span-3 mono text-[10px] uppercase tracking-[0.12em]" style={{ color: "var(--t3)" }}>Name</div>
                <div className="col-span-6">
                  <input
                    value={name}
                    onChange={(e) => { setName(e.target.value); setSaveStatus("idle"); }}
                    placeholder="Your name"
                    className="w-full bg-(--canvas) border rounded-md px-3 h-9 text-[13px] text-(--t1) outline-none focus:border-(--accent) transition-colors"
                    style={{ borderColor: "var(--border)" }}
                  />
                </div>
                <div className="col-span-3 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saveStatus === "saving" || !name.trim()}
                    className="mono text-[11px] h-8 px-4 rounded-md border transition-colors disabled:opacity-50"
                    style={{
                      borderColor: saveStatus === "saved" ? "var(--validated)" : "var(--border)",
                      color: saveStatus === "saved" ? "var(--validated)" : "var(--t2)",
                    }}
                  >
                    {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : saveStatus === "error" ? "Error" : "Save"}
                  </button>
                </div>
              </div>

              {/* Email row */}
              <div className="grid grid-cols-12 gap-4 px-5 py-4 border-b items-start" style={{ borderColor: "var(--border)" }}>
                <div className="col-span-3 mono text-[10px] uppercase tracking-[0.12em] pt-0.5" style={{ color: "var(--t3)" }}>Email</div>
                <div className="col-span-9">
                  <div className="text-[13px] text-(--t1)">{email}</div>
                  <div className="mono text-[10px] mt-0.5" style={{ color: "var(--t3)" }}>Managed by Google — change in your Google account.</div>
                </div>
              </div>

              {/* Plan row */}
              <div className="grid grid-cols-12 gap-4 px-5 py-4 items-center">
                <div className="col-span-3 mono text-[10px] uppercase tracking-[0.12em]" style={{ color: "var(--t3)" }}>Plan</div>
                <div className="col-span-6">
                  <span
                    className="mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded border"
                    style={{
                      color: PLAN_COLORS[plan],
                      borderColor: PLAN_COLORS[plan] + "40",
                      background: PLAN_COLORS[plan] + "10",
                    }}
                  >
                    {PLAN_LABELS[plan]}
                  </span>
                </div>
                <div className="col-span-3 flex justify-end">
                  {!isPaid && (
                    <Link
                      href="/pricing"
                      className="mono text-[11px] h-8 px-4 rounded-md border hover:border-(--accent) transition-colors inline-flex items-center"
                      style={{ borderColor: "var(--border)", color: "var(--t2)" }}
                    >
                      Upgrade →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Billing ── */}
        {section === "billing" && (
          <div>
            <h1 className="display text-[28px] font-semibold tracking-tight text-(--t1) mb-1">Billing</h1>
            <p className="text-[13px] mb-8" style={{ color: "var(--t2)" }}>
              {isPaid ? `${PLAN_LABELS[plan]} plan · billed monthly` : "Free plan · no credit card required"}
            </p>

            {/* Plan summary card */}
            <div className="border rounded-md p-5 mb-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="mono text-[10px] uppercase tracking-[0.12em] mb-1" style={{ color: "var(--t3)" }}>Current plan</div>
                  <div className="display text-[22px] font-semibold text-(--t1)">{PLAN_LABELS[plan]}</div>
                  {renewsAt && (
                    <div className="mono text-[10px] mt-1" style={{ color: "var(--t3)" }}>
                      Renews {formatDate(renewsAt)} · cancel anytime
                    </div>
                  )}
                  {!isPaid && (
                    <div className="mono text-[10px] mt-1" style={{ color: "var(--t3)" }}>
                      1 validation / month · no credit card required
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {!isPaid ? (
                    <Link
                      href="/pricing"
                      className="display text-[13px] font-semibold px-5 h-9 rounded-md inline-flex items-center transition-opacity hover:opacity-90"
                      style={{ background: "var(--accent)", color: "#000" }}
                    >
                      Upgrade to Pro →
                    </Link>
                  ) : (
                    stripeCustomerId && (
                      <button
                        onClick={handleManageBilling}
                        disabled={portalLoading}
                        className="mono text-[11px] h-9 px-4 rounded-md border transition-colors disabled:opacity-50"
                        style={{ borderColor: "var(--border)", color: "var(--t2)" }}
                      >
                        {portalLoading ? "Loading…" : "Manage subscription →"}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Usage */}
            <div className="border rounded-md p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <div className="mono text-[10px] uppercase tracking-[0.12em] mb-4" style={{ color: "var(--t3)" }}>Usage this month</div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] text-(--t2)">Validations</span>
                <span className="mono text-[11px] tnum text-(--t1)">
                  {ideasThisMonth} / {isUnlimited ? "∞" : ideasLimit}
                </span>
              </div>
              {!isUnlimited && (
                <div className="h-0.75 rounded-full" style={{ background: "var(--border)" }}>
                  <div
                    className="h-0.75 rounded-full transition-all"
                    style={{
                      width: `${usagePct * 100}%`,
                      background: usagePct >= 0.9 ? "var(--kill)" : usagePct >= 0.6 ? "var(--caution)" : "var(--accent)",
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Notifications ── */}
        {section === "notifications" && (
          <div>
            <h1 className="display text-[28px] font-semibold tracking-tight text-(--t1) mb-1">Notifications</h1>
            <p className="text-[13px] mb-8" style={{ color: "var(--t2)" }}>
              Email preferences. Off by default for everything non-essential.
            </p>

            <div className="border rounded-md overflow-hidden" style={{ borderColor: "var(--border)" }}>
              {NOTIFICATION_ITEMS.map((item, i) => (
                <div
                  key={item.key}
                  className={`px-5 py-4 flex items-start gap-5${i < NOTIFICATION_ITEMS.length - 1 ? " border-b" : ""}`}
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex-1">
                    <div className="display text-[14px] font-semibold text-(--t1)">{item.label}</div>
                    <div className="text-[12px] mt-1" style={{ color: "var(--t2)" }}>{item.desc}</div>
                  </div>
                  <button
                    onClick={() => setNotifState((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                    className="relative w-9 h-5 rounded-full border shrink-0 mt-0.5"
                    style={{
                      borderColor: "var(--border)",
                      background: notifState[item.key] ? "rgba(214,255,61,0.15)" : "var(--surface)",
                    }}
                  >
                    <span
                      className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                      style={{
                        left: notifState[item.key] ? "calc(100% - 18px)" : "2px",
                        background: notifState[item.key] ? "var(--accent)" : "var(--t3)",
                      }}
                    />
                  </button>
                </div>
              ))}
            </div>
            <p className="mono text-[10px] mt-4" style={{ color: "var(--t3)" }}>
              Email delivery coming in a future update. Preferences are saved locally for now.
            </p>
          </div>
        )}

        {/* ── API ── */}
        {section === "api" && (
          <div>
            <h1 className="display text-[28px] font-semibold tracking-tight text-(--t1) mb-1">API</h1>
            <p className="text-[13px] mb-8" style={{ color: "var(--t2)" }}>
              Programmatic access to your validations and decisions.
            </p>

            <div
              className="border rounded-md p-6 text-center"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <div className="mono text-[10px] uppercase tracking-[0.12em] mb-3" style={{ color: "var(--t3)" }}>
                Coming soon
              </div>
              <p className="text-[14px] mb-2 text-(--t1)">API access is in development.</p>
              <p className="text-[13px] max-w-xs mx-auto" style={{ color: "var(--t2)" }}>
                Pro accounts will get read access. Agency tier adds write access and webhooks.
              </p>
            </div>
          </div>
        )}

        {/* ── Danger zone ── */}
        {section === "danger" && (
          <div>
            <h1 className="display text-[28px] font-semibold tracking-tight mb-1" style={{ color: "var(--kill)" }}>
              Danger zone
            </h1>
            <p className="text-[13px] mb-8" style={{ color: "var(--t2)" }}>
              Irreversible actions. Proceed with care.
            </p>

            <div
              className="border rounded-md p-5"
              style={{ borderColor: "rgba(229,91,60,0.3)", background: "rgba(229,91,60,0.02)" }}
            >
              <div className="display text-[15px] font-semibold mb-1" style={{ color: "var(--kill)" }}>
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
                    <span className="font-semibold text-(--t1)">{email}</span>{" "}
                    to confirm:
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
                        background: deleteInput === email ? "var(--kill)" : "var(--surface)",
                        color: deleteInput === email ? "#fff" : "var(--t3)",
                        border: `1px solid ${deleteInput === email ? "var(--kill)" : "var(--border)"}`,
                      }}
                    >
                      Confirm delete
                    </button>
                    <button
                      onClick={() => { setDeleteConfirm(false); setDeleteInput(""); }}
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
        )}

      </main>
    </div>
  );
}
