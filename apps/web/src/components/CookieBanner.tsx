"use client";

import { useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "cookie_consent";

type Consent = "accepted" | "rejected";

export function CookieBanner() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem(STORAGE_KEY);
  });

  const respond = (choice: Consent) => {
    localStorage.setItem(STORAGE_KEY, choice);
    setVisible(false);

    if (choice === "rejected") {
      // Remove GA cookies if user rejects
      document.cookie = "_ga=; Max-Age=0; path=/; domain=." + window.location.hostname;
      document.cookie = "_ga_=; Max-Age=0; path=/; domain=." + window.location.hostname;
    }
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm"
    >
      <div className="max-w-[1320px] mx-auto px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-[12px] text-[var(--t2)] leading-relaxed max-w-[640px]">
          We use strictly necessary cookies to keep you signed in, and optional analytics
          cookies (Google Analytics) to understand how the product is used. Your idea
          submissions are never used for advertising.{" "}
          <Link href="/privacy#cookies" className="text-[var(--accent)] hover:opacity-80 transition-opacity">
            Cookie policy
          </Link>
          .
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => respond("rejected")}
            className="h-8 px-4 rounded-md border border-[var(--border)] text-[12px] text-[var(--t3)] hover:text-[var(--t2)] hover:border-[var(--t3)] transition-colors"
          >
            Reject non-essential
          </button>
          <button
            onClick={() => respond("accepted")}
            className="h-8 px-4 rounded-md bg-[var(--accent)] text-black text-[12px] font-semibold hover:opacity-90 transition-opacity"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
