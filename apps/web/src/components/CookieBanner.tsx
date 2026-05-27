"use client";

import { useState } from "react";
import Link from "next/link";
import { CookieModal } from "@/components/CookieModal";
import {
  getPreferences,
  savePreferences,
  clearPreferences,
} from "@/lib/cookie-consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return getPreferences() === null;
  });
  const [modalOpen, setModalOpen] = useState(false);

  const respond = (analytics: boolean) => {
    savePreferences({ analytics });
    setVisible(false);
  };

  if (!visible && !modalOpen) return null;

  return (
    <>
      {visible && (
        <div
          role="dialog"
          aria-label="Cookie consent"
          aria-modal="false"
          className="fixed bottom-0 left-0 right-0 z-50 border-t"
          style={{ borderColor: "var(--border)", background: "var(--canvas)" }}
        >
          <div className="max-w-[1440px] mx-auto px-6 sm:px-10 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-[12px] leading-relaxed max-w-[600px]" style={{ color: "var(--t2)" }}>
              We use strictly necessary cookies to keep you signed in, and optional
              analytics cookies (Google Analytics 4) to understand how the platform
              is used — only with your consent.{" "}
              <Link
                href="/privacy#s8"
                className="underline underline-offset-2 hover:opacity-80 transition-opacity"
                style={{ color: "var(--accent)" }}
              >
                Cookie policy
              </Link>
              .
            </p>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                onClick={() => setModalOpen(true)}
                className="h-9 px-4 rounded-md text-[12px] transition-colors"
                style={{ color: "var(--t3)" }}
              >
                Manage preferences
              </button>
              <button
                onClick={() => respond(false)}
                className="h-9 px-4 rounded-md border text-[12px] transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--t2)" }}
              >
                Reject non-essential
              </button>
              <button
                onClick={() => respond(true)}
                className="h-9 px-4 rounded-md text-[12px] font-semibold transition-opacity hover:opacity-90"
                style={{ background: "var(--accent)", color: "var(--canvas)" }}
              >
                Accept all
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <CookieModal
          onClose={() => {
            setModalOpen(false);
            setVisible(false);
          }}
        />
      )}
    </>
  );
}

/** Call from Footer "Cookie preferences" to reset consent and re-show banner */
export function resetCookieConsent() {
  if (typeof window === "undefined") return;
  clearPreferences();
  window.location.reload();
}
