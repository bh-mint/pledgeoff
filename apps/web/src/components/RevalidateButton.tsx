"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface RevalidateResult {
  oldScore: number | null;
  oldVerdict: string | null;
  newScore: number | null;
  newVerdict: string;
  scoreDiff: number | null;
}

interface Props {
  ideaId: string;
  signalAgedays: number;
  onDone?: () => void;
}

export function RevalidateButton({ ideaId, signalAgedays, onDone }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<RevalidateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRevalidate() {
    setState("loading");
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setState("error");
      setError("Not authenticated");
      return;
    }

    const res = await fetch(`/api/v1/ideas/${ideaId}/revalidate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!res.ok) {
      setState("error");
      setError("Re-validation failed. Please try again.");
      return;
    }

    const json = await res.json() as { data: RevalidateResult };
    setResult(json.data);
    setState("done");
    onDone?.();
  }

  const labelAge = signalAgedays === 1 ? "1 day old" : `${signalAgedays} days old`;

  if (state === "done" && result) {
    const diffLabel =
      result.scoreDiff !== null && result.scoreDiff !== 0
        ? result.scoreDiff > 0
          ? `+${result.scoreDiff}`
          : `${result.scoreDiff}`
        : null;

    return (
      <span
        className="mono text-[11px] px-3 h-8 rounded border flex items-center gap-1.5 shrink-0"
        style={{
          borderColor: "rgba(125,214,107,0.4)",
          color: "var(--validated)",
          background: "rgba(125,214,107,0.06)",
        }}
      >
        ✓{" "}
        {diffLabel
          ? `Score: ${result.oldScore ?? "?"} → ${result.newScore ?? "?"} (${diffLabel})`
          : `Re-scanned · ${result.newVerdict}`}
      </span>
    );
  }

  if (state === "error") {
    return (
      <button
        onClick={handleRevalidate}
        className="mono text-[11px] px-3 h-8 rounded border flex items-center gap-1.5 shrink-0"
        style={{
          borderColor: "rgba(255,100,100,0.4)",
          color: "var(--kill)",
          background: "rgba(255,100,100,0.06)",
        }}
      >
        {error ?? "Failed"} · Retry
      </button>
    );
  }

  return (
    <button
      onClick={handleRevalidate}
      disabled={state === "loading"}
      className="mono text-[11px] px-3 h-8 rounded border transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50"
      style={{
        borderColor: "var(--border)",
        color: "var(--t2)",
        background: "var(--surface)",
      }}
    >
      {state === "loading" ? (
        <>
          <span
            className="inline-block w-3 h-3 rounded-full border-2 border-t-transparent animate-spin shrink-0"
            style={{ borderColor: "var(--t2)", borderTopColor: "transparent" }}
          />
          <span>Scanning…</span>
        </>
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M1.5 8A6.5 6.5 0 1 0 8 1.5M1.5 8V3.5M1.5 8H6"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Signals {labelAge} · Re-scan?</span>
        </>
      )}
    </button>
  );
}
