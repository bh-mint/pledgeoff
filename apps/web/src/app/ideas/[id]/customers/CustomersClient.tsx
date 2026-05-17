"use client";

import { useState } from "react";
import type { CustomerAnalysis, CustomerSegment } from "@pledgeoff/core";
import { createClient } from "@/lib/supabase/client";

interface Props {
  ideaId: string;
  initialAnalysis: CustomerAnalysis | null;
}

const SIZE_LABEL: Record<CustomerSegment["size"], string> = {
  small: "Niche",
  medium: "Mid-size",
  large: "Large",
};

const SIZE_COLOR: Record<CustomerSegment["size"], string> = {
  small: "var(--t3)",
  medium: "var(--accent)",
  large: "var(--validated)",
};

const SOURCE_LABEL: Record<string, string> = {
  reddit: "Reddit",
  github: "GitHub",
};

export function CustomersClient({ ideaId, initialAnalysis }: Props) {
  const [analysis, setAnalysis] = useState<CustomerAnalysis | null>(initialAnalysis);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("Not authenticated."); setLoading(false); return; }
      const res = await fetch(`/api/v1/ideas/${ideaId}/customers`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: { message?: string } }).error?.message ?? "Analysis failed. Try again.");
        return;
      }
      const body = await res.json() as { data: CustomerAnalysis };
      setAnalysis(body.data);
    } catch {
      setError("Network error. Check connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!analysis) {
    if (loading) {
      return (
        <div
          className="rounded-md border p-8 text-center"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <p className="mono text-[11px] animate-pulse mb-2" style={{ color: "var(--t3)" }}>
            Analyzing customer segments…
          </p>
          <p className="mono text-[10px]" style={{ color: "var(--t3)" }}>
            This may take 15–30 seconds
          </p>
        </div>
      );
    }

    return (
      <div
        className="rounded-md border p-8 text-center"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="mono text-[11px] mb-3" style={{ color: "var(--t3)" }}>
          Customer intelligence not yet generated
        </div>
        <p className="text-[14px] mb-6" style={{ color: "var(--t2)" }}>
          PledgeOFF will identify who wants this, their key pain points, and pull real quotes from your market signals.
        </p>
        {error && (
          <p className="mono text-[11px] mb-4" style={{ color: "var(--caution)" }}>{error}</p>
        )}
        <button
          onClick={runAnalysis}
          className="inline-flex items-center gap-2 h-10 px-6 rounded-md display text-[13px] font-semibold transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          Analyze customers →
        </button>
      </div>
    );
  }

  const totalSentiment = analysis.sentiment.positive + analysis.sentiment.negative + analysis.sentiment.neutral;
  const safeTotal = totalSentiment > 0 ? totalSentiment : 100;

  const rankColor = (rank: number) => {
    if (rank === 1) return "var(--accent)";
    if (rank === 2) return "var(--caution)";
    return "var(--t3)";
  };

  return (
    <div className="space-y-8" style={{ opacity: loading ? 0.5 : 1, transition: "opacity 0.2s" }}>
      {/* Segments */}
      <div>
        <div className="mono text-[10px] mb-4 uppercase tracking-[0.12em]" style={{ color: "var(--t3)" }}>
          Customer Segments
        </div>
        <div className="space-y-3">
          {analysis.segments.map((segment, i) => (
            <div
              key={i}
              className="rounded-md border p-5"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="display text-[16px] font-semibold" style={{ color: "var(--t1)" }}>
                  {segment.name}
                </div>
                <span
                  className="mono text-[10px] px-2 py-0.5 rounded shrink-0"
                  style={{
                    color: SIZE_COLOR[segment.size],
                    border: `1px solid ${SIZE_COLOR[segment.size]}40`,
                  }}
                >
                  {SIZE_LABEL[segment.size]}
                </span>
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--t2)" }}>
                {segment.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Pain Points */}
      <div>
        <div className="mono text-[10px] mb-4 uppercase tracking-[0.12em]" style={{ color: "var(--t3)" }}>
          Pain Points
        </div>
        <div className="space-y-2">
          {analysis.painPoints.map((point, i) => (
            <div
              key={i}
              className="flex items-start gap-4 rounded-md border px-4 py-3"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <span
                className="mono text-[11px] font-bold shrink-0 w-5 text-center mt-0.5"
                style={{ color: rankColor(point.rank) }}
              >
                #{point.rank}
              </span>
              <p className="text-[14px] leading-snug" style={{ color: point.rank === 1 ? "var(--t1)" : "var(--t2)" }}>
                {point.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Sentiment */}
      <div
        className="rounded-md border p-5"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="mono text-[10px] mb-4 uppercase tracking-[0.12em]" style={{ color: "var(--t3)" }}>
          Market Sentiment
        </div>
        <div className="space-y-3">
          {[
            { label: "Positive", value: analysis.sentiment.positive, color: "var(--validated)" },
            { label: "Negative", value: analysis.sentiment.negative, color: "var(--kill)" },
            { label: "Neutral", value: analysis.sentiment.neutral, color: "var(--t3)" },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1">
                <span className="mono text-[11px]" style={{ color: "var(--t2)" }}>{label}</span>
                <span className="mono text-[12px] font-semibold" style={{ color }}>
                  {Math.round((value / safeTotal) * 100)}%
                </span>
              </div>
              <div className="h-1 rounded-full" style={{ background: "var(--border)" }}>
                <div
                  className="h-1 rounded-full transition-all duration-700"
                  style={{ width: `${(value / safeTotal) * 100}%`, background: color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quotes */}
      {analysis.quotes.length > 0 && (
        <div>
          <div className="mono text-[10px] mb-4 uppercase tracking-[0.12em]" style={{ color: "var(--t3)" }}>
            From the community
          </div>
          <div className="space-y-3">
            {analysis.quotes.map((quote, i) => (
              <div
                key={i}
                className="rounded-md border px-5 py-4"
                style={{ borderColor: "var(--border)", background: "var(--surface)", borderLeft: "3px solid var(--accent)" }}
              >
                <p className="text-[14px] leading-relaxed mb-3" style={{ color: "var(--t1)" }}>
                  &ldquo;{quote.text}&rdquo;
                </p>
                <a
                  href={quote.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mono text-[10px] hover:underline"
                  style={{ color: "var(--t3)" }}
                >
                  {SOURCE_LABEL[quote.source] ?? quote.source} ↗
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 pt-2">
        {error && (
          <p className="mono text-[11px] text-right" style={{ color: "var(--caution)" }}>{error}</p>
        )}
        <div className="flex items-center justify-between">
          <p className="mono text-[10px]" style={{ color: "var(--t3)" }}>
            Analyzed {new Date(analysis.createdAt).toLocaleDateString()} · Based on {analysis.quotes.length} real signals
          </p>
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="mono text-[10px] px-3 py-1.5 rounded transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ border: "1px solid var(--border)", color: "var(--t2)" }}
          >
            {loading ? "Re-analyzing…" : "Re-analyze"}
          </button>
        </div>
      </div>
    </div>
  );
}
