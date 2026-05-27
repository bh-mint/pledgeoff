"use client";

import { useState } from "react";
import Link from "next/link";
import type { Plan } from "@pledgeoff/core";
import { AvatarUpload } from "@/components/AvatarUpload";

type Props = {
  email: string;
  provider?: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  companyName: string | null;
  avatarUrl: string | null;
  plan: Plan;
};

const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  founder: "Founder",
  team: "Team",
  studio: "Studio",
  enterprise: "Enterprise",
};

const PLAN_COLORS: Record<Plan, string> = {
  free: "var(--t3)",
  founder: "var(--accent)",
  team: "var(--validated)",
  studio: "var(--validated)",
  enterprise: "var(--validated)",
};

export function ProfileClient({
  email,
  provider,
  firstName,
  lastName,
  username,
  companyName,
  avatarUrl,
  plan,
}: Props) {
  const [first, setFirst] = useState(firstName ?? "");
  const [last, setLast] = useState(lastName ?? "");
  const [uname, setUname] = useState(username ?? "");
  const [company, setCompany] = useState(companyName ?? "");
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(avatarUrl);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

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
      body: JSON.stringify({
        first_name: first,
        last_name: last,
        username: uname,
        company_name: company,
      }),
    });
    if (res.ok) {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } else {
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      setSaveError(body.error ?? "Error saving. Try again.");
      setSaveStatus("error");
    }
  };

  return (
    <div>
      <h1 className="display text-[28px] font-semibold tracking-tight text-(--t1) mb-1">
        Account
      </h1>
      <p className="text-[13px] mb-8" style={{ color: "var(--t2)" }}>
        Your identity. Kept minimal on purpose.
      </p>

      {/* Avatar upload */}
      <div className="mb-8">
        <AvatarUpload
          initials={initials}
          currentAvatarUrl={currentAvatarUrl}
          onUploaded={(url) => setCurrentAvatarUrl(url)}
        />
        <div className="mt-3">
          <div className="text-[13px] text-(--t1)">{fullName ?? email}</div>
          {uname && (
            <div
              className="mono text-[10px] mt-0.5"
              style={{ color: "var(--accent)" }}
            >
              @{uname}
            </div>
          )}
          <div
            className="mono text-[10px] mt-0.5"
            style={{ color: "var(--t3)" }}
          >
            {email}
          </div>
        </div>
      </div>

      <div
        className="border rounded-md overflow-hidden"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        {/* First name */}
        <div
          className="grid grid-cols-12 gap-4 px-5 py-4 border-b items-center"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="col-span-3 mono text-[10px] uppercase tracking-[0.12em]"
            style={{ color: "var(--t3)" }}
          >
            First name
          </div>
          <div className="col-span-9">
            <input
              value={first}
              onChange={(e) => {
                setFirst(e.target.value);
                setSaveStatus("idle");
              }}
              placeholder="First name"
              autoComplete="given-name"
              className="w-full bg-(--canvas) border rounded-md px-3 h-9 text-[13px] text-(--t1) outline-none focus:border-(--accent) transition-colors"
              style={{ borderColor: "var(--border)" }}
            />
          </div>
        </div>

        {/* Last name */}
        <div
          className="grid grid-cols-12 gap-4 px-5 py-4 border-b items-center"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="col-span-3 mono text-[10px] uppercase tracking-[0.12em]"
            style={{ color: "var(--t3)" }}
          >
            Last name
          </div>
          <div className="col-span-9">
            <input
              value={last}
              onChange={(e) => {
                setLast(e.target.value);
                setSaveStatus("idle");
              }}
              placeholder="Last name"
              autoComplete="family-name"
              className="w-full bg-(--canvas) border rounded-md px-3 h-9 text-[13px] text-(--t1) outline-none focus:border-(--accent) transition-colors"
              style={{ borderColor: "var(--border)" }}
            />
          </div>
        </div>

        {/* Username */}
        <div
          className="grid grid-cols-12 gap-4 px-5 py-4 border-b items-center"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="col-span-3 mono text-[10px] uppercase tracking-[0.12em]"
            style={{ color: "var(--t3)" }}
          >
            Username
          </div>
          <div className="col-span-9">
            <div className="flex items-center gap-0">
              <span
                className="mono text-[13px] px-3 h-9 flex items-center rounded-l-md border border-r-0"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--t3)",
                  background: "var(--surface)",
                }}
              >
                @
              </span>
              <input
                value={uname}
                onChange={(e) => {
                  setUname(e.target.value.toLowerCase());
                  setSaveStatus("idle");
                }}
                placeholder="your_handle"
                autoComplete="username"
                className="flex-1 bg-(--canvas) border rounded-r-md px-3 h-9 text-[13px] text-(--t1) outline-none focus:border-(--accent) transition-colors"
                style={{ borderColor: "var(--border)" }}
              />
            </div>
            <p
              className="mono text-[10px] mt-1"
              style={{ color: "var(--t3)" }}
            >
              3–30 chars · letters, numbers, _ or -
            </p>
          </div>
        </div>

        {/* Save row */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div>
            {saveError && (
              <p
                className="mono text-[11px]"
                style={{ color: "var(--caution)" }}
              >
                {saveError}
              </p>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saveStatus === "saving" || !first.trim()}
            className="mono text-[11px] h-10 px-4 rounded-md border transition-colors disabled:opacity-50"
            style={{
              borderColor:
                saveStatus === "saved" ? "var(--validated)" : "var(--border)",
              color:
                saveStatus === "saved" ? "var(--validated)" : "var(--t2)",
            }}
          >
            {saveStatus === "saving"
              ? "Saving…"
              : saveStatus === "saved"
                ? "Saved ✓"
                : "Save changes"}
          </button>
        </div>

        {/* Company */}
        <div
          className="grid grid-cols-12 gap-4 px-5 py-4 border-b items-center"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="col-span-3 mono text-[10px] uppercase tracking-[0.12em]"
            style={{ color: "var(--t3)" }}
          >
            Company
          </div>
          <div className="col-span-9">
            <input
              value={company}
              onChange={(e) => {
                setCompany(e.target.value);
                setSaveStatus("idle");
              }}
              placeholder="Your company name (used in PDF reports)"
              autoComplete="organization"
              className="w-full bg-(--canvas) border rounded-md px-3 h-9 text-[13px] text-(--t1) outline-none focus:border-(--accent) transition-colors"
              style={{ borderColor: "var(--border)" }}
            />
            <p
              className="mono text-[10px] mt-1"
              style={{ color: "var(--t3)" }}
            >
              Appears as the brand in exported PDF reports. Leave blank to show
              PledgeOFF.
            </p>
          </div>
        </div>

        {/* Email */}
        <div
          className="grid grid-cols-12 gap-4 px-5 py-4 border-b items-start"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="col-span-3 mono text-[10px] uppercase tracking-[0.12em] pt-0.5"
            style={{ color: "var(--t3)" }}
          >
            Email
          </div>
          <div className="col-span-9">
            <div className="text-[13px] text-(--t1)">{email}</div>
            <div
              className="mono text-[10px] mt-0.5"
              style={{ color: "var(--t3)" }}
            >
              {provider === "google"
                ? "Managed by Google — change in your Google account."
                : "Contact support to change your email."}
            </div>
          </div>
        </div>

        {/* Plan */}
        <div className="grid grid-cols-12 gap-4 px-5 py-4 items-center">
          <div
            className="col-span-3 mono text-[10px] uppercase tracking-[0.12em]"
            style={{ color: "var(--t3)" }}
          >
            Plan
          </div>
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
  );
}
