"use client";

import { useState } from "react";
import { AvatarUpload } from "@/components/AvatarUpload";
import { NotificationsClient } from "../notifications/NotificationsClient";
import { getAuthToken } from "@/lib/auth-client";

type Props = {
  email: string;
  provider?: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  companyName: string | null;
  avatarUrl: string | null;
  marketingEmailsConsent: boolean;
  marketingEmailsConsentedAt: string | null;
  isProfilePublic: boolean;
};

export function ProfileClient({
  email,
  provider,
  firstName,
  lastName,
  username,
  companyName,
  avatarUrl,
  marketingEmailsConsent,
  marketingEmailsConsentedAt,
  isProfilePublic,
}: Props) {
  const [first, setFirst] = useState(firstName ?? "");
  const [last, setLast] = useState(lastName ?? "");
  const [uname, setUname] = useState(username ?? "");
  const [company, setCompany] = useState(companyName ?? "");
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(avatarUrl);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [profilePublic, setProfilePublic] = useState(isProfilePublic);
  const [profilePublicSaving, setProfilePublicSaving] = useState(false);

  const handleProfilePublicToggle = async () => {
    const next = !profilePublic;
    setProfilePublic(next);
    setProfilePublicSaving(true);
    try {
      const token = await getAuthToken();
      await fetch("/api/v1/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ is_profile_public: next }),
      });
    } finally {
      setProfilePublicSaving(false);
    }
  };

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
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setSaveError(body.error ?? "Error saving. Try again.");
      setSaveStatus("error");
    }
  };

  return (
    <div>
      {/* Your account */}
      <div className="sec">
        <div className="sec-hd">
          Your account
          <span className="r">{email}</span>
        </div>
        <div className="sec-bd">
          {/* Avatar upload */}
          <div className="av-upload">
            <AvatarUpload
              initials={initials}
              currentAvatarUrl={currentAvatarUrl}
              onUploaded={(url) => setCurrentAvatarUrl(url)}
            />
            <div>
              <div className="av-nm">{fullName ?? email}</div>
              <div className="av-sub">JPG or PNG · max 2 MB</div>
            </div>
          </div>

          {/* Name fields */}
          <div className="fg2">
            <div className="fg">
              <label className="flbl" htmlFor="p-first">First name</label>
              <input
                id="p-first"
                className="finp"
                type="text"
                value={first}
                onChange={(e) => { setFirst(e.target.value); setSaveStatus("idle"); }}
                placeholder="First name"
                autoComplete="given-name"
              />
            </div>
            <div className="fg">
              <label className="flbl" htmlFor="p-last">Last name</label>
              <input
                id="p-last"
                className="finp"
                type="text"
                value={last}
                onChange={(e) => { setLast(e.target.value); setSaveStatus("idle"); }}
                placeholder="Last name"
                autoComplete="family-name"
              />
            </div>
          </div>

          {/* Username */}
          <div className="fg">
            <label className="flbl" htmlFor="p-uname">Username</label>
            <div className="finp-row">
              <span
                style={{
                  fontFamily: "var(--font-chivo-mono), monospace",
                  fontSize: 13,
                  padding: "10px 14px",
                  background: "var(--bg)",
                  border: "1px solid var(--line)",
                  borderRight: "none",
                  color: "var(--faint)",
                  flexShrink: 0,
                }}
              >
                @
              </span>
              <input
                id="p-uname"
                className="finp"
                type="text"
                value={uname}
                onChange={(e) => { setUname(e.target.value.toLowerCase()); setSaveStatus("idle"); }}
                placeholder="your_handle"
                autoComplete="username"
                style={{ borderLeft: "none" }}
              />
            </div>
            <p className="fine" style={{ marginTop: 4 }}>3–30 chars · letters, numbers, _ or -</p>
            <p className="fine" style={{ marginTop: 2, color: "var(--caution)" }}>
              A username creates a public page at pledgeoff.com/@{uname || "your-handle"} showing your idea history, including verdicts — control it below.
            </p>
          </div>

          {/* Public profile visibility */}
          <div className="nrow" style={{ marginTop: 4 }}>
            <div>
              <div className="nrow-ttl">Public profile</div>
              <div className="nrow-desc">
                When on, anyone with your link can see your idea history and verdicts at pledgeoff.com/@{uname || "your-handle"}. When off, that page returns not-found.
              </div>
            </div>
            <button
              className="tog"
              onClick={() => { void handleProfilePublicToggle(); }}
              disabled={profilePublicSaving}
              role="switch"
              aria-checked={profilePublic}
              aria-label="Public profile"
            >
              <div className={`tog-t${profilePublic ? " on" : ""}`}>
                <div className="tog-th" />
              </div>
            </button>
          </div>

          {/* Company */}
          <div className="fg">
            <label className="flbl" htmlFor="p-company">Company</label>
            <input
              id="p-company"
              className="finp"
              type="text"
              value={company}
              onChange={(e) => { setCompany(e.target.value); setSaveStatus("idle"); }}
              placeholder="Your company name (used in PDF reports)"
              autoComplete="organization"
            />
          </div>

          {/* Email (read-only) */}
          <div className="fg">
            <label className="flbl">Email address</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                className="finp"
                type="email"
                value={email}
                readOnly
                style={{ flex: 1, opacity: 0.65 }}
              />
              <span className="bdg bdg-go">Verified</span>
            </div>
            {provider === "google" && (
              <p className="fine" style={{ marginTop: 4 }}>Managed by Google — change in your Google account.</p>
            )}
          </div>

          {/* Save */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
            <div>
              {saveError && (
                <span
                  style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 11, color: "var(--kill)" }}
                >
                  {saveError}
                </span>
              )}
            </div>
            <button
              className="btn-p"
              onClick={handleSave}
              disabled={saveStatus === "saving" || !first.trim()}
            >
              {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : "Save changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="sec">
        <div className="sec-hd">Notifications</div>
        <div className="sec-bd">
          <NotificationsClient
            marketingEmailsConsent={marketingEmailsConsent}
            marketingEmailsConsentedAt={marketingEmailsConsentedAt}
          />
        </div>
      </div>
    </div>
  );
}
