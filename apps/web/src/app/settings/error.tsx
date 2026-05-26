"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--canvas)" }}>
      <div className="text-center space-y-4 max-w-sm px-4">
        <p className="mono text-[11px] uppercase tracking-[0.1em]" style={{ color: "var(--kill)" }}>
          Settings error
        </p>
        <p className="text-[14px]" style={{ color: "var(--t2)" }}>
          Could not load your settings. Please try again.
        </p>
        <button
          onClick={reset}
          className="mono text-[11px] px-4 h-9 rounded border transition-colors"
          style={{ borderColor: "var(--border)", color: "var(--t1)" }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
