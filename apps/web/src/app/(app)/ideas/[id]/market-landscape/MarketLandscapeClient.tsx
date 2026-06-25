"use client";

import { useState } from "react";
import { getAuthToken } from "@/lib/auth-client";
import type { MarketLandscape } from "@pledgeoff/core";

interface Props {
  ideaId: string;
  initialLandscape: MarketLandscape | null;
}

const SITUATION_META: Record<
  "competitive" | "growing" | "opportunity",
  { label: string; color: string; bg: string }
> = {
  competitive: { label: "Competitive", color: "var(--kill)",      bg: "color-mix(in srgb, var(--kill) 10%, transparent)" },
  growing:     { label: "Growing",     color: "var(--pivot)",     bg: "color-mix(in srgb, var(--pivot) 10%, transparent)" },
  opportunity: { label: "Opportunity", color: "var(--validated)", bg: "color-mix(in srgb, var(--validated) 10%, transparent)" },
};

export function MarketLandscapeClient({ ideaId, initialLandscape }: Props) {
  const [landscape, setLandscape] = useState<MarketLandscape | null>(initialLandscape);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    const token = await getAuthToken();
    if (!token) { setLoading(false); return; }

    const res = await fetch(`/api/v1/ideas/${ideaId}/market-landscape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = await res.json() as { data: MarketLandscape };
      setLandscape(json.data);
    }
    setLoading(false);
  }

  if (!landscape) {
    return (
      <div
        className="rounded border px-4 py-8 text-center"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <p className="text-[13px] mb-1" style={{ color: "var(--t1)" }}>
          Generate market landscape
        </p>
        <p className="mono text-[10px] mb-5" style={{ color: "var(--t3)" }}>
          Segments · trends · uncovered opportunities
        </p>
        <button
          onClick={generate}
          disabled={loading}
          className="mono text-[11px] px-4 py-2 rounded border transition-colors hover:border-(--t2) disabled:opacity-50"
          style={{ borderColor: "var(--border)", color: "var(--t2)" }}
        >
          {loading ? "Analyzing…" : "Generate →"}
        </button>
      </div>
    );
  }

  return (
    <div className="mktl-wrap">
      {/* Segments table */}
      <section>
        <p className="mono text-[10px] uppercase tracking-[0.12em] mb-3" style={{ color: "var(--t3)" }}>
          Market segments · {landscape.segments.length}
        </p>
        <div className="mktl-segments">
          {landscape.segments.map((seg, i) => {
            const meta = SITUATION_META[seg.situation];
            return (
              <div key={i} className="mktl-seg">
                <div className="mktl-seg-hd">
                  <span className="mktl-seg-name">{seg.name}</span>
                  <span
                    className="mktl-seg-badge"
                    style={{ color: meta.color, background: meta.bg, border: `1px solid color-mix(in srgb, ${meta.color} 25%, transparent)` }}
                  >
                    {meta.label}
                  </span>
                </div>
                <p className="mktl-seg-desc">{seg.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Trends */}
      <section>
        <p className="mono text-[10px] uppercase tracking-[0.12em] mb-3" style={{ color: "var(--t3)" }}>
          Macro trends
        </p>
        <ul className="mktl-list">
          {landscape.trends.map((t, i) => (
            <li key={i} className="mktl-list-item">
              <span className="mktl-bullet" style={{ color: "var(--accent)" }}>→</span>
              <span style={{ color: "var(--t2)" }}>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Uncovered Opportunities */}
      <section>
        <p className="mono text-[10px] uppercase tracking-[0.12em] mb-3" style={{ color: "var(--t3)" }}>
          Uncovered opportunities
        </p>
        <ul className="mktl-opps">
          {landscape.uncoveredOpportunities.map((opp, i) => (
            <li key={i} className="mktl-opp">
              <span className="mktl-opp-bullet">✦</span>
              <span style={{ color: "var(--t1)" }}>{opp}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex justify-end mt-2">
        <button
          onClick={generate}
          disabled={loading}
          className="mono text-[10px] px-3 py-1.5 rounded transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ border: "1px solid var(--border)", color: "var(--t3)" }}
        >
          {loading ? "Regenerating…" : "Regenerate"}
        </button>
      </div>
    </div>
  );
}
