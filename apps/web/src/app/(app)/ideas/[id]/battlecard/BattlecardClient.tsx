"use client";

import { useState } from "react";
import { getAuthToken } from "@/lib/auth-client";
import type { Battlecard } from "@pledgeoff/core";

interface Props {
  ideaId: string;
  initialBattlecard: Battlecard | null;
}

export function BattlecardClient({ ideaId, initialBattlecard }: Props) {
  const [data, setData] = useState<Battlecard | null>(initialBattlecard);
  const [open, setOpen] = useState<Set<number>>(new Set([0]));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleEntry(i: number) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/v1/ideas/${ideaId}/battlecard`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { data?: Battlecard; error?: { code: string } };
      if (!res.ok || json.error) {
        setError(json.error?.code ?? "INTERNAL");
      } else if (json.data) {
        setData(json.data);
        setOpen(new Set([0]));
      }
    } catch {
      setError("INTERNAL");
    } finally {
      setLoading(false);
    }
  }

  if (!data) {
    return (
      <div className="bc-empty">
        <p className="bc-empty-txt">Generate objection-handling scripts and competitive talking points for each competitor.</p>
        <button className="btn-p" onClick={run} disabled={loading}>
          {loading ? "Generating…" : "Generate Battlecard"}
        </button>
        {error && <p className="bc-err">Error: {error}</p>}
      </div>
    );
  }

  return (
    <div className="bc-wrap">
      {data.entries.map((entry, i) => (
        <div key={i} className="bc-entry">
          <button
            className={`bc-entry-hd${open.has(i) ? " open" : ""}`}
            onClick={() => toggleEntry(i)}
          >
            <span className="bc-entry-name">{entry.competitorName}</span>
            <span className="bc-entry-chevron">{open.has(i) ? "▲" : "▼"}</span>
          </button>

          {open.has(i) && (
            <div className="bc-entry-bd">
              <div className="bc-block bc-objection">
                <span className="bc-block-lbl">Common objection</span>
                <p className="bc-block-txt">&ldquo;{entry.objection}&rdquo;</p>
              </div>

              <div className="bc-block bc-response">
                <span className="bc-block-lbl">Your response</span>
                <p className="bc-block-txt">{entry.response}</p>
              </div>

              <div className="bc-cols">
                <div className="bc-col">
                  <span className="bc-col-lbl go">Our advantages</span>
                  <ul className="bc-list">
                    {entry.ourAdvantages.map((a, j) => (
                      <li key={j} className="bc-list-item bc-adv">
                        <span className="bc-bullet go">+</span>{a}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bc-col">
                  <span className="bc-col-lbl kill">Their weaknesses</span>
                  <ul className="bc-list">
                    {entry.theirWeaknesses.map((w, j) => (
                      <li key={j} className="bc-list-item bc-weak">
                        <span className="bc-bullet kill">−</span>{w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      <button
        className="btn-g"
        style={{ fontSize: 11, padding: "4px 12px", marginTop: 12 }}
        onClick={run}
        disabled={loading}
      >
        {loading ? "Re-generating…" : "Re-run"}
      </button>
      {error && <p className="bc-err">Error: {error}</p>}
    </div>
  );
}
