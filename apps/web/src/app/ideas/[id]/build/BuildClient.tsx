"use client";

import { useState } from "react";
import type { BuildAnalysis, TechComponent } from "@pledgeoff/core";
import { MIN_GITHUB_SIGNALS } from "@pledgeoff/core";
import { createClient } from "@/lib/supabase/client";

interface Props {
  ideaId: string;
  initialAnalysis: BuildAnalysis | null;
}

const DECISION_LABEL: Record<TechComponent["decision"], string> = {
  build: "Build",
  buy: "Buy",
  oss: "OSS",
};

const DECISION_COLOR: Record<TechComponent["decision"], string> = {
  build: "var(--accent)",
  buy: "var(--caution)",
  oss: "var(--validated)",
};

export function BuildClient({ ideaId, initialAnalysis }: Props) {
  const [analysis, setAnalysis] = useState<BuildAnalysis | null>(initialAnalysis);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("Not authenticated."); setLoading(false); return; }
      const res = await fetch(`/api/v1/ideas/${ideaId}/build`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: { message?: string } }).error?.message ?? "Analysis failed. Try again.");
        return;
      }
      const body = await res.json() as { data: BuildAnalysis };
      setAnalysis(body.data);
    } catch {
      setError("Network error. Check connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!analysis) {
    return (
      <div
        className="rounded-md border p-8 text-center"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <p className="mono text-[11px] uppercase tracking-[0.08em] mb-2" style={{ color: "var(--t3)" }}>
          No engineering analysis yet
        </p>
        <p className="text-[13px] mb-6" style={{ color: "var(--t2)" }}>
          Analyze GitHub signals to generate a recommended tech stack and identify technical gaps.
        </p>
        {error && (
          <p className="text-[12px] mb-4" style={{ color: "var(--caution)" }}>{error}</p>
        )}
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="mono text-[11px] uppercase tracking-[0.08em] px-4 py-2 rounded transition-opacity"
          style={{ background: "var(--accent)", color: "#fff", opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "Analyzing…" : "Analyze engineering signals →"}
        </button>
      </div>
    );
  }

  const hasEnoughGithubSignals = analysis.signalCount >= MIN_GITHUB_SIGNALS;

  return (
    <div className="space-y-10">
      {/* Signal count warning */}
      {!hasEnoughGithubSignals && (
        <div
          className="rounded-md border px-4 py-3 text-[13px] space-y-1"
          style={{ borderColor: "var(--caution)", background: "rgba(255,165,0,0.05)", color: "var(--caution)" }}
        >
          <p className="font-medium">Limited GitHub engineering signals</p>
          <p style={{ color: "var(--t2)" }}>
            {analysis.signalCount === 0
              ? "No GitHub issues were found for this idea. The stack recommendations are based on your idea description and general engineering patterns — they are still useful, but may be less specific to your niche."
              : `Only ${analysis.signalCount} GitHub signal${analysis.signalCount !== 1 ? "s" : ""} found (${MIN_GITHUB_SIGNALS} recommended). Recommendations may be less precise for your specific context.`}
          </p>
        </div>
      )}

      {/* Tech stack */}
      <section>
        <h2
          className="mono text-[10px] uppercase tracking-[0.1em] mb-4"
          style={{ color: "var(--t3)" }}
        >
          Recommended stack
        </h2>
        <div className="space-y-4">
          {analysis.stack.map((component) => (
            <div
              key={component.name}
              className="rounded-md border p-5"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <span className="text-[15px] font-semibold" style={{ color: "var(--t1)" }}>
                    {component.name}
                  </span>
                  <p className="text-[13px] mt-1" style={{ color: "var(--t2)" }}>
                    {component.description}
                  </p>
                </div>
                <span
                  className="mono text-[10px] uppercase tracking-[0.08em] px-2 py-1 rounded shrink-0"
                  style={{
                    color: DECISION_COLOR[component.decision],
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${DECISION_COLOR[component.decision]}`,
                  }}
                >
                  {DECISION_LABEL[component.decision]}
                </span>
              </div>
              <p className="text-[12px] mb-3" style={{ color: "var(--t3)" }}>
                {component.rationale}
              </p>
              {component.libraries.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {component.libraries.map((lib) => (
                    lib.githubUrl ? (
                      <a
                        key={lib.name}
                        href={lib.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mono text-[10px] px-2 py-1 rounded transition-colors hover:opacity-80"
                        style={{ background: "rgba(255,255,255,0.06)", color: "var(--accent)", border: "1px solid var(--border)" }}
                        title={lib.purpose}
                      >
                        {lib.name}{lib.stars ? ` ★${(lib.stars / 1000).toFixed(0)}k` : ""}
                      </a>
                    ) : (
                      <span
                        key={lib.name}
                        className="mono text-[10px] px-2 py-1 rounded"
                        style={{ background: "rgba(255,255,255,0.06)", color: "var(--t2)", border: "1px solid var(--border)" }}
                        title={lib.purpose}
                      >
                        {lib.name}
                      </span>
                    )
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Technical gaps */}
      {analysis.gaps.length > 0 && (
        <section>
          <h2
            className="mono text-[10px] uppercase tracking-[0.1em] mb-4"
            style={{ color: "var(--t3)" }}
          >
            Technical gaps — opportunities
          </h2>
          <div className="space-y-3">
            {analysis.gaps.map((gap, i) => (
              <div
                key={i}
                className="border-l-2 pl-4 py-2"
                style={{ borderColor: "var(--accent)" }}
              >
                <p className="text-[14px] font-medium mb-1" style={{ color: "var(--t1)" }}>
                  {gap.title}
                </p>
                <p className="text-[13px] mb-1" style={{ color: "var(--t2)" }}>
                  {gap.description}
                </p>
                <p className="text-[12px]" style={{ color: "var(--validated)" }}>
                  → {gap.opportunity}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Regenerate */}
      <div className="pt-4 border-t border-(--border) flex items-center justify-between">
        <span className="mono text-[10px]" style={{ color: "var(--t3)" }}>
          {analysis.signalCount === 0
            ? "Based on idea description · no GitHub signals"
            : `Based on ${analysis.signalCount} GitHub signal${analysis.signalCount !== 1 ? "s" : ""}`}
        </span>
        {error && (
          <p className="text-[12px]" style={{ color: "var(--caution)" }}>{error}</p>
        )}
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="mono text-[10px] uppercase tracking-[0.08em] px-3 py-1.5 rounded transition-opacity"
          style={{ background: "rgba(255,255,255,0.06)", color: "var(--t2)", border: "1px solid var(--border)", opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "Regenerating…" : "Regenerate"}
        </button>
      </div>
    </div>
  );
}
