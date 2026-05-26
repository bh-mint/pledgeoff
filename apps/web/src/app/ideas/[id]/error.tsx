"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

export default function IdeaError({
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
          Error loading idea
        </p>
        <p className="text-[14px]" style={{ color: "var(--t2)" }}>
          This idea could not be loaded. It may have been deleted or you may not have access.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="mono text-[11px] px-4 h-9 rounded border transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--t1)" }}
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="mono text-[11px] px-4 h-9 rounded border flex items-center transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--t2)" }}
          >
            Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
