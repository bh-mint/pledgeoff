"use client";

import { useEffect, useState } from "react";
import { getAuthToken } from "@/lib/auth-client";
import type { DecisionTimeline, DecisionTimelineEntry } from "@pledgeoff/core";

type Plan = "free" | "founder" | "team" | "studio" | "enterprise";

interface Props {
  ideaId: string;
  plan: Plan;
}

const VERDICT_STYLE: Record<string, { bg: string; text: string }> = {
  GO:    { bg: "rgba(125,214,107,0.12)", text: "var(--validated)" },
  PIVOT: { bg: "rgba(232,179,65,0.12)",  text: "var(--caution)" },
  KILL:  { bg: "rgba(239,68,68,0.12)",   text: "var(--kill)" },
};

function DeltaBadge({ entry }: { entry: DecisionTimelineEntry }) {
  const { delta } = entry;
  if (!delta) return null;

  if (delta.verdictChanged) {
    return (
      <span
        className="mono text-[9px] px-1.5 py-0.5 rounded border"
        style={{ borderColor: "var(--line)", color: "var(--faint)" }}
      >
        {delta.previousVerdict} → {entry.decision.verdict}
      </span>
    );
  }

  if (delta.scoreDelta != null && delta.scoreDelta !== 0) {
    const positive = delta.scoreDelta > 0;
    return (
      <span
        className="mono text-[9px] px-1.5 py-0.5 rounded"
        style={{
          background: positive ? "rgba(125,214,107,0.1)" : "rgba(239,68,68,0.1)",
          color: positive ? "var(--validated)" : "var(--kill)",
        }}
      >
        {positive ? "+" : ""}{delta.scoreDelta} pts
      </span>
    );
  }

  return (
    <span className="mono text-[9px]" style={{ color: "var(--faint)" }}>
      no change
    </span>
  );
}

export function AuditTrailClient({ ideaId, plan }: Props) {
  const [timeline, setTimeline] = useState<DecisionTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  const canExportPdf = plan === "studio" || plan === "enterprise";

  useEffect(() => {
    async function load() {
      const token = await getAuthToken();
      if (!token) { setLoading(false); return; }

      const res = await fetch(`/api/v1/ideas/${ideaId}/report`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json() as { data: DecisionTimeline };
        setTimeline(json.data);
      }
      setLoading(false);
    }
    void load();
  }, [ideaId]);

  async function handleExportPdf() {
    setExportLoading(true);
    const token = await getAuthToken();
    if (!token) { setExportLoading(false); return; }

    const res = await fetch(`/api/v1/ideas/${ideaId}/report/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${ideaId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setExportLoading(false);
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="rounded border p-4 animate-pulse" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
            <div className="h-3 w-16 rounded mb-2" style={{ background: "var(--line)" }} />
            <div className="h-2 w-full rounded" style={{ background: "var(--line)" }} />
          </div>
        ))}
      </div>
    );
  }

  if (!timeline || timeline.entries.length === 0) {
    return (
      <div
        className="rounded border px-4 py-6 text-center"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <p className="mono text-[10px] uppercase tracking-[0.1em] mb-1" style={{ color: "var(--faint)" }}>
          No history yet
        </p>
        <p className="text-[13px]" style={{ color: "var(--dim)" }}>
          Each time you validate this idea, a new decision entry appears here.
        </p>
      </div>
    );
  }

  const reversed = [...timeline.entries].reverse();

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <p className="mono text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--faint)" }}>
          {timeline.entries.length} decision{timeline.entries.length !== 1 ? "s" : ""} recorded
        </p>
        {canExportPdf ? (
          <button
            onClick={handleExportPdf}
            disabled={exportLoading}
            className="mono text-[10px] px-3 py-1.5 rounded border transition-colors hover:border-(--t2) disabled:opacity-50"
            style={{ borderColor: "var(--line)", color: "var(--dim)" }}
          >
            {exportLoading ? "Generating…" : "Export PDF →"}
          </button>
        ) : (
          <span className="mono text-[10px]" style={{ color: "var(--faint)" }}>
            PDF export · Studio plan
          </span>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {reversed.map((entry, i) => {
          const vs = VERDICT_STYLE[entry.decision.verdict] ?? VERDICT_STYLE["KILL"]!;
          const isLatest = i === 0;

          return (
            <div
              key={entry.decision.id}
              className="rounded border p-4"
              style={{
                borderColor: isLatest ? "color-mix(in srgb, var(--accent) 30%, transparent)" : "var(--line)",
                background: "var(--surface)",
              }}
            >
              {/* Top row */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span
                  className="mono text-[10px] font-bold px-2 py-0.5 rounded"
                  style={{ background: vs.bg, color: vs.text }}
                >
                  {entry.decision.verdict}
                </span>
                {entry.decision.score != null && (
                  <span className="mono text-[10px] font-bold" style={{ color: "var(--ink)" }}>
                    {entry.decision.score}/100
                  </span>
                )}
                <span className="mono text-[10px]" style={{ color: "var(--faint)" }}>
                  {Math.round(entry.decision.confidence * 100)}% confidence
                </span>
                <DeltaBadge entry={entry} />
                {isLatest && (
                  <span
                    className="mono text-[9px] px-1.5 py-0.5 rounded ml-auto"
                    style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)" }}
                  >
                    latest
                  </span>
                )}
              </div>

              {/* Date */}
              <p className="mono text-[9px] mb-3" style={{ color: "var(--faint)" }}>
                {new Date(entry.decision.createdAt).toLocaleDateString("en-GB", {
                  day: "2-digit", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
                {" · "}{entry.decision.signalIds.length} signals
              </p>

              {/* Reasoning */}
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--dim)" }}>
                {entry.decision.reasoning.length > 280
                  ? entry.decision.reasoning.slice(0, 280) + "…"
                  : entry.decision.reasoning}
              </p>

              {/* Feedback */}
              {(entry.feedbackCounts.thumbsUp > 0 || entry.feedbackCounts.thumbsDown > 0) && (
                <div className="flex items-center gap-3 mt-3 pt-3 border-t" style={{ borderColor: "var(--line)" }}>
                  <span className="mono text-[10px]" style={{ color: "var(--faint)" }}>
                    Feedback:
                  </span>
                  {entry.feedbackCounts.thumbsUp > 0 && (
                    <span className="mono text-[10px]" style={{ color: "var(--validated)" }}>
                      👍 {entry.feedbackCounts.thumbsUp}
                    </span>
                  )}
                  {entry.feedbackCounts.thumbsDown > 0 && (
                    <span className="mono text-[10px]" style={{ color: "var(--kill)" }}>
                      👎 {entry.feedbackCounts.thumbsDown}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
