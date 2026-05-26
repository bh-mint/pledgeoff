"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAuthToken } from "@/lib/auth-client";
import type { QueueItem } from "@pledgeoff/core";

const VERDICT_COLOR: Record<string, string> = {
  GO:    "var(--validated)",
  KILL:  "var(--kill)",
  PIVOT: "var(--caution)",
};

function PriorityBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? "var(--validated)" : pct >= 40 ? "var(--caution)" : "var(--kill)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 80 }}>
      <div style={{ flex: 1, height: 4, background: "var(--border)", borderRadius: 2 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.3s" }} />
      </div>
      <span className="mono text-[11px]" style={{ color: "var(--t3)", minWidth: 28, textAlign: "right" }}>{pct}</span>
    </div>
  );
}

export function DecisionQueueView() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const token = await getAuthToken();
        const res = await fetch("/api/v1/queue", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json() as { data: { items: QueueItem[] } };
        setItems(json.data.items);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load queue");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="mono text-[12px]" style={{ color: "var(--t3)" }}>Loading queue…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="mono text-[12px]" style={{ color: "var(--kill)" }}>{error}</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <span style={{ color: "var(--t2)", fontSize: 14 }}>No ideas in your queue yet.</span>
        <span className="mono text-[12px]" style={{ color: "var(--t3)" }}>
          Validate your first idea to start tracking priorities.
        </span>
        <Link
          href="/ideas/new"
          className="mono text-[11px] px-4 h-8 rounded-md border flex items-center"
          style={{ background: "var(--accent)", color: "var(--accent-fg)", borderColor: "var(--accent)" }}
        >
          + New validation
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="mono text-[11px] mb-2" style={{ color: "var(--t3)" }}>
        {items.length} {items.length === 1 ? "idea" : "ideas"} — sorted by AI priority
      </div>

      {items.map((item, idx) => (
        <Link
          key={item.id}
          href={`/ideas/${item.ideaId}`}
          className="block rounded-md border px-4 py-3 transition-colors hover:border-[var(--accent)]"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="flex items-start gap-3">
            {/* Rank */}
            <span
              className="mono text-[11px] shrink-0 mt-0.5 w-5 text-right"
              style={{ color: "var(--t3)" }}
            >
              {idx + 1}
            </span>

            {/* Content */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {item.verdict && (
                  <span
                    className="mono text-[10px] px-1.5 py-0.5 rounded shrink-0"
                    style={{ background: `color-mix(in srgb, ${VERDICT_COLOR[item.verdict]} 12%, transparent)`, color: VERDICT_COLOR[item.verdict] }}
                  >
                    {item.verdict}
                  </span>
                )}
                <span
                  className="text-[13px] truncate"
                  style={{ color: "var(--t1)" }}
                >
                  {item.ideaText.split("\n\n")[0]?.slice(0, 100) ?? item.ideaText.slice(0, 100)}
                </span>
              </div>

              {item.changeSummary && (
                <p className="text-[11px]" style={{ color: "var(--t3)" }}>
                  {item.changeSummary}
                </p>
              )}
            </div>

            {/* Priority bar */}
            <div className="shrink-0 w-28">
              <PriorityBar score={item.priorityScore} />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
