"use client";

import { useState } from "react";
import { getAuthToken } from "@/lib/auth-client";
import { friendlyToolError } from "@/lib/tool-error-messages";
import type { FeatureAnalysis } from "@pledgeoff/core";

interface Props {
  ideaId: string;
  initialFeatures: FeatureAnalysis | null;
  isLocked: boolean;
}

function CoverageCell({ value }: { value: "yes" | "partial" | "no" }) {
  if (value === "yes")     return <span className="feat-cell feat-yes">✓</span>;
  if (value === "partial") return <span className="feat-cell feat-partial">~</span>;
  return <span className="feat-cell feat-no">✗</span>;
}

export function FeaturesClient({ ideaId, initialFeatures, isLocked }: Props) {
  const [data, setData] = useState<FeatureAnalysis | null>(initialFeatures);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/v1/ideas/${ideaId}/features`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { data?: FeatureAnalysis; error?: { code: string } };
      if (!res.ok || json.error) {
        setError(friendlyToolError(json.error?.code));
      } else if (json.data) {
        setData(json.data);
      }
    } catch {
      setError(friendlyToolError(undefined));
    } finally {
      setLoading(false);
    }
  }

  if (isLocked) return null;

  if (!data) {
    return (
      <div className="feat-empty">
        <p className="feat-empty-txt">Compare how your idea stacks up feature-by-feature against existing competitors.</p>
        <button className="btn-p" onClick={run} disabled={loading}>
          {loading ? "Analyzing…" : "Run Feature Analysis"}
        </button>
        {error && <p className="feat-err">{error}</p>}
      </div>
    );
  }

  const competitors = data.competitorNames;

  return (
    <div className="feat-wrap">
      <div className="feat-tbl-wrap">
        <table className="feat-tbl">
          <thead>
            <tr>
              <th className="feat-th feat-th-feature">Feature</th>
              <th className="feat-th feat-th-idea">Your Idea</th>
              {competitors.map((c) => (
                <th key={c} className="feat-th feat-th-comp">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.features.map((row, i) => (
              <tr key={i} className="feat-row">
                <td className="feat-td feat-td-feature">
                  {row.category && <span className="feat-cat">{row.category}</span>}
                  {row.feature}
                </td>
                <td className="feat-td feat-td-idea">
                  <CoverageCell value={row.idea} />
                </td>
                {competitors.map((c) => (
                  <td key={c} className="feat-td feat-td-comp">
                    <CoverageCell value={row.competitors[c] ?? "no"} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="feat-legend">
        <span className="feat-leg-item"><span className="feat-cell feat-yes">✓</span> Available</span>
        <span className="feat-leg-item"><span className="feat-cell feat-partial">~</span> Partial</span>
        <span className="feat-leg-item"><span className="feat-cell feat-no">✗</span> Missing</span>
      </div>
      <button
        className="btn-g"
        style={{ fontSize: 11, padding: "4px 12px", marginTop: 8 }}
        onClick={run}
        disabled={loading}
      >
        {loading ? "Re-analyzing…" : "Re-run"}
      </button>
      {error && <p className="feat-err">{error}</p>}
    </div>
  );
}
