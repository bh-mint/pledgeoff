"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const STORAGE_KEY = "weekly_digest_banner_dismissed";

export function WeeklyDigestBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      const t = setTimeout(() => setVisible(true), 0);
      return () => clearTimeout(t);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-md border text-[13px]"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <span className="shrink-0 text-[16px]" aria-hidden="true">📬</span>
      <span style={{ color: "var(--t2)" }}>
        Get a weekly summary of your validation activity.
      </span>
      <Link
        href="/settings?section=notifications"
        onClick={dismiss}
        className="mono text-[11px] shrink-0 hover:underline"
        style={{ color: "var(--accent)" }}
      >
        Enable →
      </Link>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="ml-auto shrink-0 text-[16px] leading-none hover:opacity-60 transition-opacity"
        style={{ color: "var(--t3)" }}
      >
        ×
      </button>
    </div>
  );
}
