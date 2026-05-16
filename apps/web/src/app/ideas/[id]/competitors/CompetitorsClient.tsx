"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CompetitorAnalysis } from "@pledgeoff/core";

interface CompetitorsClientProps {
  ideaId: string;
  initialAnalysis: CompetitorAnalysis | null;
}

export function CompetitorsClient({ ideaId, initialAnalysis }: CompetitorsClientProps) {
  const [analysis, setAnalysis] = useState<CompetitorAnalysis | null>(initialAnalysis);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(force = false) {
    if (loading) return;
    if (analysis && !force) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError("Not authenticated"); setLoading(false); return; }

    const res = await fetch(`/api/v1/ideas/${ideaId}/competitors`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = (body as { error?: { message?: string } }).error?.message;
      setError(msg ?? "Analysis failed. Please try again.");
      setLoading(false);
      return;
    }

    const json = await res.json();
    setAnalysis(json.data);
    setLoading(false);
  }

  if (!analysis && !loading) {
    return (
      <div className="text-center py-16">
        <p className="text-[14px] mb-6" style={{ color: "var(--t2)" }}>
          Run competitor intelligence to discover who exists in this space and where the gaps are.
        </p>
        <button
          onClick={() => run()}
          className="mono text-[12px] px-5 py-2.5 rounded border transition-colors hover:border-(--accent) hover:text-(--accent)"
          style={{ borderColor: "var(--border)", color: "var(--t1)" }}
        >
          Run analysis →
        </button>
        {error && <p className="mt-4 text-[12px]" style={{ color: "var(--caution)" }}>{error}</p>}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-16">
        <p className="mono text-[11px] animate-pulse" style={{ color: "var(--t3)" }}>
          Analyzing competitors…
        </p>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="space-y-10">
      {/* Competitors list */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <p className="mono text-[10px] uppercase tracking-[0.12em]" style={{ color: "var(--t3)" }}>
            Competitors · {analysis.competitors.length}
          </p>
          <button
            onClick={() => run(true)}
            className="mono text-[10px] px-2.5 py-1 rounded border transition-colors hover:border-(--accent) hover:text-(--accent)"
            style={{ borderColor: "var(--border)", color: "var(--t3)" }}
          >
            Regenerate
          </button>
        </div>

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
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="text-[14px] font-semibold" style={{ color: "var(--t1)" }}>{c.name}</span>
                    {c.url && (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 mono text-[10px] hover:text-(--accent) transition-colors"
                        style={{ color: "var(--t3)" }}
                      >
                        {c.url.replace(/^https?:\/\//, '')} ↗
                      </a>
                    )}
                  </div>
                </div>
                <p className="text-[13px] mb-3 leading-relaxed" style={{ color: "var(--t2)" }}>{c.positioning}</p>
                <div className="flex flex-wrap gap-1.5">
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
            Gaps · {analysis.gaps.length} opportunities
          </p>
          <div className="space-y-3">
            {analysis.gaps.map((g, i) => (
              <div
                key={i}
                className="rounded border-l-2 border px-4 py-3"
                style={{ borderLeftColor: "var(--accent)", borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <p className="text-[13px] font-medium mb-1" style={{ color: "var(--t1)" }}>{g.title}</p>
                <p className="text-[12px] mb-2 leading-relaxed" style={{ color: "var(--t2)" }}>{g.description}</p>
                <p className="mono text-[11px]" style={{ color: "var(--accent)" }}>→ {g.opportunity}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer meta */}
      <p className="mono text-[10px]" style={{ color: "var(--t3)" }}>
        Based on {analysis.signalCount} signal{analysis.signalCount !== 1 ? "s" : ""} · Generated {new Date(analysis.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}
