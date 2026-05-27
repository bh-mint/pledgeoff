"use client";

import { useState } from "react";
import {
  getPreferences,
  savePreferences,
  type CookiePreferences,
} from "@/lib/cookie-consent";

type Tab = "overview" | "necessary" | "analytics";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Your preferences" },
  { id: "necessary", label: "Strictly necessary" },
  { id: "analytics", label: "Analytics cookies" },
];

interface Props {
  onClose: () => void;
}

export function CookieModal({ onClose }: Props) {
  const existing = getPreferences();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [analytics, setAnalytics] = useState(existing?.analytics ?? false);

  const handleSave = (prefs: CookiePreferences) => {
    savePreferences(prefs);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cookie preferences"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
    >
      <div
        className="w-full max-w-[720px] rounded-lg border shadow-2xl flex flex-col"
        style={{
          background: "var(--canvas)",
          borderColor: "var(--border)",
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <span className="font-semibold text-[15px]" style={{ color: "var(--t1)" }}>
            Cookie preferences
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 rounded flex items-center justify-center transition-colors"
            style={{ color: "var(--t3)" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <nav
            className="w-48 shrink-0 border-r py-3"
            style={{ borderColor: "var(--border)" }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="w-full text-left px-4 py-2.5 text-[13px] transition-colors"
                style={{
                  color: activeTab === tab.id ? "var(--t1)" : "var(--t2)",
                  background: activeTab === tab.id ? "var(--surface)" : "transparent",
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  borderLeft: activeTab === tab.id ? "2px solid var(--accent)" : "2px solid transparent",
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Panel */}
          <div className="flex-1 px-6 py-5 overflow-y-auto">
            {activeTab === "overview" && (
              <OverviewPanel analytics={analytics} />
            )}
            {activeTab === "necessary" && <NecessaryPanel />}
            {activeTab === "analytics" && (
              <AnalyticsPanel value={analytics} onChange={setAnalytics} />
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            onClick={() => handleSave({ analytics: false })}
            className="h-9 px-4 rounded-md border text-[12px] transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--t2)" }}
          >
            Reject all
          </button>
          <button
            onClick={() => handleSave({ analytics })}
            className="h-9 px-4 rounded-md border text-[12px] font-medium transition-colors"
            style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
          >
            Save preferences
          </button>
          <button
            onClick={() => handleSave({ analytics: true })}
            className="h-9 px-4 rounded-md text-[12px] font-semibold transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)", color: "var(--canvas)" }}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}

function OverviewPanel({ analytics }: { analytics: boolean }) {
  return (
    <div className="space-y-4">
      <h2 className="text-[14px] font-semibold" style={{ color: "var(--t1)" }}>
        Your preferences
      </h2>
      <p className="text-[13px] leading-relaxed" style={{ color: "var(--t2)" }}>
        We use cookies to keep you signed in and to understand how the platform is
        used. You can manage each category individually using the menu on the left.
      </p>
      <div className="space-y-2">
        <StatusRow label="Strictly necessary" active={true} always />
        <StatusRow label="Analytics cookies" active={analytics} />
      </div>
      <p className="text-[12px]" style={{ color: "var(--t3)" }}>
        For more details, see our{" "}
        <a
          href="/privacy#s8"
          className="underline underline-offset-2"
          style={{ color: "var(--accent)" }}
        >
          cookie policy
        </a>
        .
      </p>
    </div>
  );
}

function NecessaryPanel() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold" style={{ color: "var(--t1)" }}>
          Strictly necessary cookies
        </h2>
        <span
          className="mono text-[10px] px-2 py-1 rounded"
          style={{ background: "var(--surface)", color: "var(--t3)" }}
        >
          Always on
        </span>
      </div>
      <p className="text-[13px] leading-relaxed" style={{ color: "var(--t2)" }}>
        These cookies are required for the platform to function. They manage your
        authentication session and store your cookie preferences. They cannot be
        disabled.
      </p>
      <CookieTable
        rows={[
          { name: "sb-*", purpose: "Supabase authentication session", duration: "Session / 1 week" },
          { name: "cookie_preferences", purpose: "Stores your cookie consent choices", duration: "1 year" },
        ]}
      />
    </div>
  );
}

function AnalyticsPanel({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold" style={{ color: "var(--t1)" }}>
          Analytics cookies
        </h2>
        <Toggle value={value} onChange={onChange} />
      </div>
      <p className="text-[13px] leading-relaxed" style={{ color: "var(--t2)" }}>
        These cookies help us understand how the platform is used through Google
        Analytics 4. All data is aggregated and anonymised — we can see trends but
        not individual behaviour. Disabling them has no effect on your experience.
      </p>
      <ul className="text-[13px] space-y-1 pl-4" style={{ color: "var(--t2)" }}>
        <li className="list-disc">Understand which features are most used</li>
        <li className="list-disc">Measure page performance and load times</li>
        <li className="list-disc">Identify and fix navigation issues</li>
      </ul>
      <CookieTable
        rows={[
          { name: "_ga", purpose: "Google Analytics — distinguishes users", duration: "2 years" },
          { name: "_ga_*", purpose: "Google Analytics — session state", duration: "2 years" },
        ]}
      />
      <p className="text-[12px]" style={{ color: "var(--t3)" }}>
        Provider: Google LLC · Data anonymised with{" "}
        <code className="text-[11px]">anonymize_ip: true</code>
      </p>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="relative w-11 h-6 rounded-full transition-colors shrink-0"
      style={{ background: value ? "var(--accent)" : "var(--border)" }}
    >
      <span
        className="absolute top-1 w-4 h-4 rounded-full transition-all"
        style={{
          left: value ? "calc(100% - 18px)" : "2px",
          background: "var(--canvas)",
        }}
      />
    </button>
  );
}

function StatusRow({
  label,
  active,
  always,
}: {
  label: string;
  active: boolean;
  always?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2 rounded-md text-[13px]"
      style={{ background: "var(--surface)" }}
    >
      <span style={{ color: "var(--t2)" }}>{label}</span>
      {always ? (
        <span className="mono text-[10px]" style={{ color: "var(--t3)" }}>
          Always on
        </span>
      ) : (
        <span
          className="mono text-[10px] font-semibold"
          style={{ color: active ? "var(--go)" : "var(--t3)" }}
        >
          {active ? "On" : "Off"}
        </span>
      )}
    </div>
  );
}

function CookieTable({
  rows,
}: {
  rows: { name: string; purpose: string; duration: string }[];
}) {
  return (
    <div
      className="rounded-md border overflow-hidden text-[12px]"
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="grid grid-cols-3 px-3 py-2 mono text-[10px] uppercase tracking-wider"
        style={{ background: "var(--surface)", color: "var(--t3)" }}
      >
        <span>Cookie</span>
        <span>Purpose</span>
        <span>Duration</span>
      </div>
      {rows.map((row) => (
        <div
          key={row.name}
          className="grid grid-cols-3 px-3 py-2 border-t"
          style={{ borderColor: "var(--border)", color: "var(--t2)" }}
        >
          <code className="text-[11px]">{row.name}</code>
          <span>{row.purpose}</span>
          <span>{row.duration}</span>
        </div>
      ))}
    </div>
  );
}
