"use client";

import { useEffect, useState } from "react";
import { getAuthToken } from "@/lib/auth-client";
import { diffCompetitors } from "@pledgeoff/core";
import type { CompetitorAnalysis, SnapshotDiff } from "@pledgeoff/core";
import { InfoTooltip } from "@/components/InfoTooltip";
import { CompetitorPositioningMap } from "../VerdictCharts";

interface CompetitorsClientProps {
  ideaId: string;
  initialAnalysis: CompetitorAnalysis | null;
}

export function CompetitorsClient({ ideaId, initialAnalysis }: CompetitorsClientProps) {
  const [analysis, setAnalysis] = useState<CompetitorAnalysis | null>(initialAnalysis);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changes, setChanges] = useState<SnapshotDiff[] | null>(null);
  const [changesOpen, setChangesOpen] = useState(false);

  useEffect(() => {
    if (!changesOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setChangesOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [changesOpen]);

  async function run(force = false) {
    if (loading) return;
    if (analysis && !force) return;
    setLoading(true);
    setError(null);

    const token = await getAuthToken();
    if (!token) { setError("Not authenticated"); setLoading(false); return; }

    const res = await fetch(`/api/v1/ideas/${ideaId}/competitors`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = (body as { error?: { message?: string } }).error?.message;
      setError(msg ?? "Analysis failed. Please try again.");
      setLoading(false);
      return;
    }

    const json = await res.json();
    const next = json.data as CompetitorAnalysis;
    // Same pure diff the server uses for competitor.changed.v1 — no extra API call
    if (force && analysis) {
      setChanges(diffCompetitors(analysis, next));
      setChangesOpen(false);
    }
    setAnalysis(next);
    setLoading(false);
  }

  if (!analysis && !loading) {
    return (
      <div
        className="rounded-md border p-8 text-center"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="mono text-[11px] mb-3" style={{ color: "var(--t3)" }}>
          No competitor analysis yet
        </div>
        <p className="text-[14px] mb-6" style={{ color: "var(--t2)" }}>
          Run competitor intelligence to discover who exists in this space and where the gaps are.
        </p>
        {error && <p className="mb-4 text-[12px]" style={{ color: "var(--caution)" }}>{error}</p>}
        <button
          onClick={() => run()}
          className="inline-flex items-center gap-2 h-10 px-6 rounded-md display text-[13px] font-semibold transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          Run analysis →
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="rounded-md border p-8 text-center"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <p className="mono text-[11px] animate-pulse mb-2" style={{ color: "var(--t3)" }}>
          Analyzing competitors…
        </p>
        <p className="mono text-[10px]" style={{ color: "var(--t3)" }}>
          This may take 15–30 seconds
        </p>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="space-y-10" style={{ opacity: loading ? 0.5 : 1, transition: "opacity 0.2s" }}>
      {/* Re-check bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 12px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 4 }}>
        <span className="mono text-[10px]" style={{ color: "var(--dim)" }}>
          Last checked {new Date(analysis.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {changes !== null && !loading && (
            changes.length > 0 ? (
              <button
                className="mono text-[10px]"
                style={{ padding: "3px 10px", background: "color-mix(in srgb, var(--caution) 12%, transparent)", color: "var(--caution)", border: "1px solid color-mix(in srgb, var(--caution) 35%, transparent)", borderRadius: 3, cursor: "pointer" }}
                onClick={() => setChangesOpen(true)}
              >
                {changes.length} change{changes.length > 1 ? "s" : ""}
                {changes.some((c) => c.significance === "major") ? " ▲" : ""}
              </button>
            ) : (
              <span className="mono text-[10px]" style={{ color: "var(--t3)" }}>No changes</span>
            )
          )}
          <button
            className="btn-g"
            style={{ fontSize: 11, padding: "3px 10px", opacity: loading ? 0.5 : 1 }}
            onClick={() => run(true)}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Re-check market →"}
          </button>
        </div>
      </div>

      {/* Changes modal */}
      {changesOpen && changes && changes.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Market changes since last check"
          style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", padding: 16 }}
          onClick={() => setChangesOpen(false)}
        >
          <div
            style={{ maxWidth: 520, width: "100%", maxHeight: "70vh", overflowY: "auto", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, padding: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span className="mono text-[10px] uppercase tracking-[0.12em]" style={{ color: "var(--t3)" }}>
                Changes since last check
              </span>
              <button
                aria-label="Close"
                className="mono text-[14px]"
                style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", lineHeight: 1 }}
                onClick={() => setChangesOpen(false)}
              >
                ✕
              </button>
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {changes.map((c, i) => (
                <li key={i} style={{ padding: "10px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none" }}>
                  <div className="mono text-[11px] mb-1" style={{ color: c.significance === "major" ? "var(--caution)" : "var(--t2)" }}>
                    {c.significance === "major" ? "▲" : "△"} {c.field}
                  </div>
                  <div className="text-[12px]" style={{ color: "var(--t2)" }}>
                    <span style={{ color: "var(--t3)" }}>{c.before}</span>
                    <span className="mono" style={{ color: "var(--validated)", margin: "0 6px" }}>→</span>
                    {c.after}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Positioning map */}
      <CompetitorPositioningMap competitors={analysis.competitors} />

      {/* Competitors list */}
      <section>
        <p className="mono text-[10px] uppercase tracking-[0.12em] mb-2" style={{ color: "var(--t3)" }}>
          Competitors · {analysis.competitors.length}
        </p>
        {analysis.competitors.some((c) => c.source === "knowledge") && (
          <p className="mono text-[10px] sm:hidden mb-4" style={{ color: "var(--t3)" }}>
            AI knowledge = not from live signals, from general AI knowledge
          </p>
        )}

        {analysis.competitors.length === 0 ? (
          <div
            className="rounded border px-4 py-5 text-[13px] leading-relaxed"
            style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--t2)" }}
          >
            No direct competitors found in the signals. This could mean an untapped market — or a market that doesn&apos;t exist yet.
          </div>
        ) : (
          <div className="space-y-3">
            {analysis.competitors.map((c, i) => (
              <div
                key={i}
                className="rounded border p-4"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="text-[14px] font-semibold" style={{ color: "var(--t1)" }}>{c.name}</span>
                    {c.url && (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mono text-[10px] hover:text-(--accent) transition-colors"
                        style={{ color: "var(--t3)" }}
                      >
                        {c.url.replace(/^https?:\/\//, '')} ↗
                      </a>
                    )}
                    {c.estimatedPrice && (
                      <span
                        className="mono text-[9px] px-1.5 py-0.5 rounded"
                        style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)", color: "var(--accent)" }}
                      >
                        {c.estimatedPrice}
                      </span>
                    )}
                    {c.source === "knowledge" && (
                      <InfoTooltip content="Found via AI general knowledge, not from your idea's live signals" align="left">
                        <span
                          className="mono text-[9px] px-1.5 py-0.5 rounded uppercase tracking-[0.06em] cursor-default"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--t3)" }}
                        >
                          AI knowledge
                        </span>
                      </InfoTooltip>
                    )}
                  </div>
                </div>

                {/* Positioning */}
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--t2)" }}>{c.positioning}</p>

                {/* Target segment */}
                {c.targetSegment && (
                  <p className="mono text-[10px] mt-1 mb-2" style={{ color: "var(--t3)" }}>
                    → {c.targetSegment}
                  </p>
                )}
                {!c.targetSegment && <div className="mb-3" />}

                {/* Strengths + Weaknesses */}
                {((c.strengths && c.strengths.length > 0) || (c.weaknesses && c.weaknesses.length > 0)) && (
                  <div className="comp-sw-grid">
                    {c.strengths && c.strengths.length > 0 && (
                      <div>
                        <p className="mono text-[9px] uppercase tracking-[0.08em] mb-1.5" style={{ color: "var(--validated)" }}>Strengths</p>
                        <ul className="space-y-1">
                          {c.strengths.map((s, j) => (
                            <li key={j} className="text-[11px] leading-snug flex gap-1.5" style={{ color: "var(--t2)" }}>
                              <span style={{ color: "var(--validated)", flexShrink: 0 }}>✓</span>{s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {c.weaknesses && c.weaknesses.length > 0 && (
                      <div>
                        <p className="mono text-[9px] uppercase tracking-[0.08em] mb-1.5" style={{ color: "var(--caution)" }}>Weaknesses</p>
                        <ul className="space-y-1">
                          {c.weaknesses.map((w, j) => (
                            <li key={j} className="text-[11px] leading-snug flex gap-1.5" style={{ color: "var(--t2)" }}>
                              <span style={{ color: "var(--caution)", flexShrink: 0 }}>✗</span>{w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Signals */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {c.signals.map((s, j) => (
                    <span
                      key={j}
                      className="mono text-[10px] px-2 py-0.5 rounded"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--t3)" }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Gaps / opportunities */}
      {analysis.gaps.length > 0 && (
        <section>
          <p className="mono text-[10px] uppercase tracking-[0.12em] mb-4" style={{ color: "var(--t3)" }}>
            → Gaps · {analysis.gaps.length} opportunities
          </p>
          <div className="space-y-3">
            {analysis.gaps.map((g, i) => (
              <div
                key={i}
                className="rounded border border-l-2 px-4 py-3"
                style={{ borderLeftColor: "var(--accent)", borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <p className="text-[13px] font-medium mb-1" style={{ color: "var(--t1)" }}>{g.title}</p>
                <p className="text-[12px] mb-2 leading-relaxed" style={{ color: "var(--t2)" }}>{g.description}</p>
                <p className="text-[12px]" style={{ color: "var(--validated)" }}>→ {g.opportunity}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <div className="flex flex-col gap-2">
        {error && (
          <p className="mono text-[11px] text-right" style={{ color: "var(--caution)" }}>{error}</p>
        )}
        <div className="flex items-center justify-between">
          <p className="mono text-[10px]" style={{ color: "var(--t3)" }}>
            Based on {analysis.signalCount} signal{analysis.signalCount !== 1 ? "s" : ""} · Generated {new Date(analysis.createdAt).toLocaleDateString()}
          </p>
          <button
            onClick={() => run(true)}
            disabled={loading}
            className="mono text-[10px] px-3 py-1.5 rounded transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ border: "1px solid var(--border)", color: "var(--t2)" }}
          >
            {loading ? "Regenerating…" : "Regenerate"}
          </button>
        </div>
      </div>
    </div>
  );
}
