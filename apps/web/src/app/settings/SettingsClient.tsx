"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Plan, SubscriptionStatus } from "@pledgeoff/core";
import { PLAN_LIMITS } from "@pledgeoff/core";
import { TeamSection } from "./TeamSection";

type AvailablePlan = {
  id: 'pro' | 'pro_plus';
  label: string;
  monthlyEur: number;
  annualEquivalentEur: number;
  annualTotalEur: number;
  monthlyPriceId: string;
  annualPriceId: string;
};

interface SettingsClientProps {
  email: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  companyName: string | null;
  plan: Plan;
  subscriptionStatus?: SubscriptionStatus | null;
  ideasThisMonth: number;
  renewsAt?: string | null;
  stripeCustomerId?: string | null;
  extraSeats?: number;
  cancelAtPeriodEnd?: boolean;
  billingInterval?: 'monthly' | 'annual';
  availablePlans?: AvailablePlan[];
}

type SectionId = "account" | "billing" | "team" | "notifications" | "api" | "danger";

const SECTIONS: Array<{ id: SectionId; label: string }> = [
  { id: "account", label: "Account" },
  { id: "billing", label: "Billing" },
  { id: "team", label: "Team" },
  { id: "notifications", label: "Notifications" },
  { id: "api", label: "API" },
  { id: "danger", label: "Danger zone" },
];

const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  pro: "Pro",
  pro_plus: "Pro+",
  agency: "Agency",
};

const PLAN_COLORS: Record<Plan, string> = {
  free: "var(--t3)",
  pro: "var(--accent)",
  pro_plus: "var(--validated)",
  agency: "var(--validated)",
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
  firstName,
  lastName,
  username,
  companyName,
  plan,
  subscriptionStatus,
  ideasThisMonth,
  renewsAt,
  extraSeats: initialExtraSeats = 0,
  cancelAtPeriodEnd: initialCancelAtPeriodEnd = false,
  billingInterval = 'monthly',
  availablePlans = [],
}: SettingsClientProps) {
  const router = useRouter();
  const [section, setSection] = useState<SectionId>("account");
  const [first, setFirst] = useState(firstName ?? "");
  const [last, setLast] = useState(lastName ?? "");
  const [uname, setUname] = useState(username ?? "");
  const [company, setCompany] = useState(companyName ?? "");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [seatExtra, setSeatExtra] = useState(initialExtraSeats);
  const [seatState, setSeatState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [billingAction, setBillingAction] = useState<"idle" | "loading" | "error">("idle");
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(initialCancelAtPeriodEnd);
  const [modifyOpen, setModifyOpen] = useState(false);
  const currentPriceId = (() => {
    const ap = availablePlans.find((p) => p.id === plan);
    if (!ap) return '';
    return billingInterval === 'annual' ? ap.annualPriceId : ap.monthlyPriceId;
  })();
  const [selectedPriceId, setSelectedPriceId] = useState(currentPriceId);
  const [notifState, setNotifState] = useState<Record<string, boolean>>({
    goldmine: false,
    weekly: false,
    score: false,
  });

  const ideasLimit = PLAN_LIMITS[plan].verificationsPerMonth;
  const isUnlimited = ideasLimit === Infinity;
  const usagePct = isUnlimited ? 0 : Math.min(1, ideasThisMonth / ideasLimit);
  const isPaid = plan !== "free";

  const fullName = [first, last].filter(Boolean).join(" ") || null;
  const initials = (fullName ?? email)
    .split(/[\s@]/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  const handleSave = async () => {
    if (!first.trim()) return;
    setSaveStatus("saving");
    setSaveError(null);
    const res = await fetch("/api/v1/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ first_name: first, last_name: last, username: uname, company_name: company }),
    });
    if (res.ok) {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } else {
      const body = await res.json().catch(() => ({})) as { error?: string };
      setSaveError(body.error ?? "Error saving. Try again.");
      setSaveStatus("error");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== email) return;
    await fetch("/api/v1/profile", { method: "DELETE" });
    router.push("/");
  };

  const getToken = async () => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  };

  const handleChangePlan = async (priceId: string) => {
    setBillingAction("loading");
    const token = await getToken();
    const res = await fetch("/api/v1/billing/change-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ priceId }),
    });
    if (res.ok) {
      setBillingAction("idle");
      router.refresh();
    } else {
      setBillingAction("error");
    }
  };

  const handleCancel = async () => {
    setBillingAction("loading");
    setCancelConfirm(false);
    const token = await getToken();
    const res = await fetch("/api/v1/billing/cancel", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      setCancelAtPeriodEnd(true);
      setBillingAction("idle");
    } else {
      setBillingAction("error");
    }
  };

  const handleReactivate = async () => {
    setBillingAction("loading");
    const token = await getToken();
    const res = await fetch("/api/v1/billing/reactivate", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      setCancelAtPeriodEnd(false);
      setBillingAction("idle");
    } else {
      setBillingAction("error");
    }
  };

  const handleCheckout = async (priceId: string) => {
    setBillingAction("loading");
    const token = await getToken();
    const res = await fetch("/api/v1/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ priceId }),
    });
    if (res.ok) {
      const { data } = await res.json() as { data: { url: string } };
      router.push(data.url);
    } else {
      setBillingAction("error");
    }
  };

  const handleUpdateSeats = async () => {
    setSeatState("loading");
    const supabase = createSupabaseBrowserClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const res = await fetch("/api/v1/billing/seats", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ extraSeats: seatExtra }),
    });
    if (res.ok) {
      setSeatState("success");
      setTimeout(() => setSeatState("idle"), 2500);
    } else {
      setSeatState("error");
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
                {uname && <div className="mono text-[10px] mt-0.5" style={{ color: "var(--accent)" }}>@{uname}</div>}
                <div className="mono text-[10px] mt-0.5" style={{ color: "var(--t3)" }}>{email}</div>
              </div>
            </div>

            <div className="border rounded-md overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              {/* First name row */}
              <div className="grid grid-cols-12 gap-4 px-5 py-4 border-b items-center" style={{ borderColor: "var(--border)" }}>
                <div className="col-span-3 mono text-[10px] uppercase tracking-[0.12em]" style={{ color: "var(--t3)" }}>First name</div>
                <div className="col-span-9">
                  <input
                    value={first}
                    onChange={(e) => { setFirst(e.target.value); setSaveStatus("idle"); }}
                    placeholder="First name"
                    className="w-full bg-(--canvas) border rounded-md px-3 h-9 text-[13px] text-(--t1) outline-none focus:border-(--accent) transition-colors"
                    style={{ borderColor: "var(--border)" }}
                  />
                </div>
              </div>

              {/* Last name row */}
              <div className="grid grid-cols-12 gap-4 px-5 py-4 border-b items-center" style={{ borderColor: "var(--border)" }}>
                <div className="col-span-3 mono text-[10px] uppercase tracking-[0.12em]" style={{ color: "var(--t3)" }}>Last name</div>
                <div className="col-span-9">
                  <input
                    value={last}
                    onChange={(e) => { setLast(e.target.value); setSaveStatus("idle"); }}
                    placeholder="Last name"
                    className="w-full bg-(--canvas) border rounded-md px-3 h-9 text-[13px] text-(--t1) outline-none focus:border-(--accent) transition-colors"
                    style={{ borderColor: "var(--border)" }}
                  />
                </div>
              </div>

              {/* Username row */}
              <div className="grid grid-cols-12 gap-4 px-5 py-4 border-b items-center" style={{ borderColor: "var(--border)" }}>
                <div className="col-span-3 mono text-[10px] uppercase tracking-[0.12em]" style={{ color: "var(--t3)" }}>Username</div>
                <div className="col-span-9">
                  <div className="flex items-center gap-0">
                    <span className="mono text-[13px] px-3 h-9 flex items-center rounded-l-md border border-r-0" style={{ borderColor: "var(--border)", color: "var(--t3)", background: "var(--surface)" }}>@</span>
                    <input
                      value={uname}
                      onChange={(e) => { setUname(e.target.value.toLowerCase()); setSaveStatus("idle"); }}
                      placeholder="your_handle"
                      className="flex-1 bg-(--canvas) border rounded-r-md px-3 h-9 text-[13px] text-(--t1) outline-none focus:border-(--accent) transition-colors"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </div>
                  <p className="mono text-[10px] mt-1" style={{ color: "var(--t3)" }}>3–30 chars · letters, numbers, _ or -</p>
                </div>
              </div>

              {/* Save row */}
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
                <div>
                  {saveError && <p className="mono text-[11px]" style={{ color: "var(--caution)" }}>{saveError}</p>}
                </div>
                <button
                  onClick={handleSave}
                  disabled={saveStatus === "saving" || !first.trim()}
                  className="mono text-[11px] h-8 px-4 rounded-md border transition-colors disabled:opacity-50"
                  style={{
                    borderColor: saveStatus === "saved" ? "var(--validated)" : "var(--border)",
                    color: saveStatus === "saved" ? "var(--validated)" : "var(--t2)",
                  }}
                >
                  {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : "Save changes"}
                </button>
              </div>

              {/* Company name row */}
              <div className="grid grid-cols-12 gap-4 px-5 py-4 border-b items-center" style={{ borderColor: "var(--border)" }}>
                <div className="col-span-3 mono text-[10px] uppercase tracking-[0.12em]" style={{ color: "var(--t3)" }}>Company</div>
                <div className="col-span-9">
                  <input
                    value={company}
                    onChange={(e) => { setCompany(e.target.value); setSaveStatus("idle"); }}
                    placeholder="Your company name (used in PDF reports)"
                    className="w-full bg-(--canvas) border rounded-md px-3 h-9 text-[13px] text-(--t1) outline-none focus:border-(--accent) transition-colors"
                    style={{ borderColor: "var(--border)" }}
                  />
                  <p className="mono text-[10px] mt-1" style={{ color: "var(--t3)" }}>
                    Appears as the brand in exported PDF reports. Leave blank to show PledgeOFF.
                  </p>
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
              {isPaid
                ? `${PLAN_LABELS[plan]} · billed ${billingInterval}`
                : "Free plan · no credit card required"}
            </p>

            {/* Cancel-at-period-end banner */}
            {cancelAtPeriodEnd && renewsAt && (
              <div className="border rounded-md p-4 mb-5 flex items-center justify-between gap-4"
                style={{ borderColor: "var(--caution)", background: "color-mix(in srgb, var(--caution) 8%, transparent)" }}>
                <span className="mono text-[11px]" style={{ color: "var(--caution)" }}>
                  Cancels on {formatDate(renewsAt)} — you&apos;ll drop to Free.
                </span>
                <button
                  onClick={handleReactivate}
                  disabled={billingAction === "loading"}
                  className="mono text-[11px] h-8 px-4 rounded-md transition-opacity hover:opacity-80 disabled:opacity-50 shrink-0"
                  style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                >
                  Reactivate
                </button>
              </div>
            )}

            {/* Error banner */}
            {billingAction === "error" && (
              <div className="border rounded-md p-3 mb-5 mono text-[11px]"
                style={{ borderColor: "var(--kill)", color: "var(--kill)", background: "color-mix(in srgb, var(--kill) 8%, transparent)" }}>
                Something went wrong. Please try again.
              </div>
            )}

            {/* Current plan card */}
            <div className="border rounded-md p-5 mb-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="mono text-[10px] uppercase tracking-[0.12em] mb-1" style={{ color: "var(--t3)" }}>Current plan</div>
                  <div className="display text-[22px] font-semibold text-(--t1)">{PLAN_LABELS[plan]}</div>
                  {isPaid && renewsAt && !cancelAtPeriodEnd && (
                    <div className="mono text-[10px] mt-1" style={{ color: "var(--t3)" }}>
                      Billed {billingInterval} · renews {formatDate(renewsAt)}
                    </div>
                  )}
                  {!isPaid && (
                    <div className="mono text-[10px] mt-1" style={{ color: "var(--t3)" }}>
                      1 validation / month · no credit card required
                    </div>
                  )}
                </div>

                {/* Actions for paid users */}
                {isPaid && !cancelAtPeriodEnd && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => { setModifyOpen((v) => !v); setSelectedPriceId(currentPriceId); }}
                      disabled={billingAction === "loading"}
                      className="mono text-[11px] h-9 px-4 rounded-md border transition-colors hover:border-[var(--accent)] disabled:opacity-50"
                      style={{ borderColor: "var(--border)", color: "var(--t2)" }}
                    >
                      Modify plan
                    </button>
                    {cancelConfirm ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCancel}
                          disabled={billingAction === "loading"}
                          className="mono text-[11px] h-9 px-4 rounded-md disabled:opacity-50"
                          style={{ background: "var(--kill)", color: "#fff" }}
                        >
                          Yes, cancel
                        </button>
                        <button
                          onClick={() => setCancelConfirm(false)}
                          className="mono text-[11px] h-9 px-3 rounded-md border"
                          style={{ borderColor: "var(--border)", color: "var(--t3)" }}
                        >
                          Never mind
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setCancelConfirm(true)}
                        className="mono text-[11px] h-9 px-4 rounded-md border transition-colors hover:border-[var(--kill)] hover:text-[var(--kill)]"
                        style={{ borderColor: "var(--border)", color: "var(--t3)" }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )}

                {/* Actions for free users */}
                {!isPaid && (
                  <Link
                    href="/pricing"
                    className="display text-[13px] font-semibold px-5 h-9 rounded-md inline-flex items-center transition-opacity hover:opacity-90 shrink-0"
                    style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                  >
                    Upgrade →
                  </Link>
                )}
              </div>

              {/* Modify panel — inline plan selector */}
              {modifyOpen && isPaid && (
                <div className="mt-5 pt-5 border-t" style={{ borderColor: "var(--border)" }}>
                  <div className="mono text-[10px] uppercase tracking-[0.12em] mb-3" style={{ color: "var(--t3)" }}>
                    Select plan
                  </div>
                  <div className="flex flex-col gap-2 mb-4">
                    {availablePlans.flatMap((ap) => [
                      {
                        priceId: ap.monthlyPriceId,
                        label: `${ap.label} — Monthly`,
                        price: `€${ap.monthlyEur}/mo`,
                      },
                      {
                        priceId: ap.annualPriceId,
                        label: `${ap.label} — Annual`,
                        price: `€${ap.annualEquivalentEur}/mo · €${ap.annualTotalEur}/yr · save 18%`,
                      },
                    ]).map((opt) => {
                      const isSelected = selectedPriceId === opt.priceId;
                      const isCurrent = currentPriceId === opt.priceId;
                      return (
                        <label
                          key={opt.priceId}
                          className="flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors"
                          style={{
                            borderColor: isSelected ? "var(--accent)" : "var(--border)",
                            background: isSelected ? "color-mix(in srgb, var(--accent) 6%, transparent)" : "transparent",
                          }}
                        >
                          <input
                            type="radio"
                            name="plan-select"
                            value={opt.priceId}
                            checked={isSelected}
                            onChange={() => setSelectedPriceId(opt.priceId)}
                            className="accent-[var(--accent)]"
                          />
                          <div className="flex-1">
                            <span className="text-[13px] text-(--t1)">{opt.label}</span>
                            {isCurrent && (
                              <span className="mono text-[9px] ml-2 px-1.5 py-0.5 rounded"
                                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}>
                                current
                              </span>
                            )}
                            <div className="mono text-[10px] mt-0.5" style={{ color: "var(--t3)" }}>{opt.price}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        if (selectedPriceId && selectedPriceId !== currentPriceId) {
                          await handleChangePlan(selectedPriceId);
                          setModifyOpen(false);
                        }
                      }}
                      disabled={billingAction === "loading" || !selectedPriceId || selectedPriceId === currentPriceId}
                      className="mono text-[11px] h-9 px-5 rounded-md transition-opacity hover:opacity-80 disabled:opacity-40"
                      style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                    >
                      {billingAction === "loading" ? "Applying…" : "Apply changes"}
                    </button>
                    <button
                      onClick={() => setModifyOpen(false)}
                      className="mono text-[11px] h-9 px-4 rounded-md border"
                      style={{ borderColor: "var(--border)", color: "var(--t3)" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Free users: plan option cards */}
            {!isPaid && (
              <div className="flex flex-col gap-3 mb-3">
                {availablePlans.map((ap) => (
                  <div key={ap.id} className="border rounded-md p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="display text-[17px] font-semibold text-(--t1) mb-0.5">{ap.label}</div>
                        <div className="mono text-[11px]" style={{ color: "var(--t2)" }}>
                          €{ap.monthlyEur}/mo · or €{ap.annualEquivalentEur}/mo billed annually (€{ap.annualTotalEur}/yr)
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleCheckout(ap.monthlyPriceId)}
                          disabled={billingAction === "loading" || !ap.monthlyPriceId}
                          className="mono text-[11px] h-8 px-4 rounded-md transition-opacity hover:opacity-80 disabled:opacity-50"
                          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                        >
                          Monthly →
                        </button>
                        <button
                          onClick={() => handleCheckout(ap.annualPriceId)}
                          disabled={billingAction === "loading" || !ap.annualPriceId}
                          className="mono text-[11px] h-8 px-4 rounded-md border transition-colors hover:border-[var(--accent)] disabled:opacity-50"
                          style={{ borderColor: "var(--border)", color: "var(--t2)" }}
                        >
                          Annual →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}


            {/* Usage */}
            <div className="border rounded-md p-5 mb-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
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

            {/* Seat add-ons — Pro+ only */}
            {plan === "pro_plus" && (
              <div className="border rounded-md p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <div className="mono text-[10px] uppercase tracking-[0.12em] mb-1" style={{ color: "var(--t3)" }}>Team seats</div>
                <p className="text-[12px] mb-5" style={{ color: "var(--t2)" }}>
                  Pro+ includes 10 seats. Add extra seats at €7/seat/month, billed to your subscription.
                </p>

                <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-5">
                  {/* Seat breakdown */}
                  <div className="flex-1 flex items-center gap-3">
                    <div className="text-center">
                      <div className="mono text-[22px] font-semibold text-(--t1)">{10 + seatExtra}</div>
                      <div className="mono text-[9px] uppercase tracking-[0.12em] mt-0.5" style={{ color: "var(--t3)" }}>total seats</div>
                    </div>
                    <div className="text-(--t3) text-[18px]">=</div>
                    <div className="text-center">
                      <div className="mono text-[16px] text-(--t2)">10</div>
                      <div className="mono text-[9px] uppercase tracking-[0.12em] mt-0.5" style={{ color: "var(--t3)" }}>included</div>
                    </div>
                    <div className="text-(--t3)">+</div>
                    <div className="text-center">
                      <div className="mono text-[16px]" style={{ color: "var(--accent)" }}>{seatExtra}</div>
                      <div className="mono text-[9px] uppercase tracking-[0.12em] mt-0.5" style={{ color: "var(--t3)" }}>extra</div>
                    </div>
                  </div>

                  {/* Stepper */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSeatExtra((n) => Math.max(0, n - 1))}
                      disabled={seatExtra === 0}
                      className="w-8 h-8 rounded-md border mono text-[16px] flex items-center justify-center transition-colors disabled:opacity-30"
                      style={{ borderColor: "var(--border)", color: "var(--t2)" }}
                    >
                      −
                    </button>
                    <span className="mono text-[15px] w-8 text-center tnum text-(--t1)">{seatExtra}</span>
                    <button
                      onClick={() => setSeatExtra((n) => Math.min(97, n + 1))}
                      disabled={seatExtra >= 97}
                      className="w-8 h-8 rounded-md border mono text-[16px] flex items-center justify-center transition-colors disabled:opacity-30"
                      style={{ borderColor: "var(--border)", color: "var(--t2)" }}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Price preview + action */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                  <div>
                    {seatExtra > 0 ? (
                      <span className="mono text-[12px] text-(--t2)">
                        {seatExtra} × €7 ={" "}
                        <span className="text-(--t1) font-semibold">€{seatExtra * 7}/month</span>
                        {" "}added to your subscription
                      </span>
                    ) : (
                      <span className="mono text-[12px]" style={{ color: "var(--t3)" }}>No extra seats — only the 10 included ones.</span>
                    )}
                  </div>
                  <button
                    onClick={handleUpdateSeats}
                    disabled={seatState === "loading" || seatExtra === initialExtraSeats}
                    className="mono text-[11px] h-9 px-5 rounded-md border transition-colors disabled:opacity-40 shrink-0"
                    style={{
                      borderColor: seatState === "success" ? "var(--validated)" : "var(--border)",
                      color: seatState === "success" ? "var(--validated)" : seatState === "error" ? "var(--kill)" : "var(--t2)",
                    }}
                  >
                    {seatState === "loading" ? "Updating…" : seatState === "success" ? "Updated ✓" : seatState === "error" ? "Error — retry" : "Update seats"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Team ── */}
        {section === "team" && (
          <div>
            <h1 className="display text-[28px] font-semibold tracking-tight text-(--t1) mb-1">Team</h1>
            <p className="text-[13px] mb-8" style={{ color: "var(--t2)" }}>
              Invite colleagues to validate ideas together.
              {plan === "free" && " Upgrade to Pro for 3 seats, Pro+ for 10."}
            </p>
            <TeamSection plan={plan} subscriptionStatus={subscriptionStatus ?? null} />
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
                      background: notifState[item.key] ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "var(--surface)",
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
