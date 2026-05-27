"use client";

import { useState } from "react";
import Link from "next/link";

const CONSENT_KEY = "cookie_consent";
const CONSENT_EVENT = "pledgeoff:cookie_consent";
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

type Consent = "accepted" | "rejected";

function setConsentCookie(value: Consent) {
  localStorage.setItem(CONSENT_KEY, value);
  // Also set as a regular cookie so server components can read it if needed
  document.cookie = `${CONSENT_KEY}=${value}; Max-Age=${ONE_YEAR_SECONDS}; path=/; SameSite=Lax`;
  // Notify GoogleAnalytics component in the same session
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}

function clearGaCookies() {
  const domain = "." + window.location.hostname;
  // Clear _ga and all _ga_XXXXXXXX measurement cookies
  document.cookie.split(";").forEach((c) => {
    const name = c.trim().split("=")[0];
    if (name.startsWith("_ga")) {
      document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}`;
    }
  });
}

export function CookieBanner() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem(CONSENT_KEY);
  });

  const respond = (choice: Consent) => {
    setConsentCookie(choice);
    setVisible(false);
    if (choice === "rejected") clearGaCookies();
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-modal="false"
      className="fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{
        borderColor: "var(--border)",
        background: "var(--canvas)",
      }}
    >
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-[12px] leading-relaxed max-w-[680px]" style={{ color: "var(--t2)" }}>
          We use strictly necessary cookies to keep you signed in, and optional
          analytics cookies (Google Analytics 4) to understand how the platform
          is used — only with your consent. Your idea submissions are never used
          for advertising.{" "}
          <Link
            href="/privacy#s8"
            className="underline underline-offset-2 hover:opacity-80 transition-opacity"
            style={{ color: "var(--accent)" }}
          >
            Cookie policy
          </Link>
          .
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => respond("rejected")}
            className="h-9 px-4 rounded-md border text-[12px] transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--t2)" }}
          >
            Reject non-essential
          </button>
          <button
            onClick={() => respond("accepted")}
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

/** Call from Footer "Cookie preferences" link to reset consent and re-show banner */
export function resetCookieConsent() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CONSENT_KEY);
  document.cookie = `${CONSENT_KEY}=; Max-Age=0; path=/; SameSite=Lax`;
  window.location.reload();
}
