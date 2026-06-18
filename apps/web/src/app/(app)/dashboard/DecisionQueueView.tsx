"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAuthToken } from "@/lib/auth-client";
import type { QueueItem } from "@pledgeoff/core";

interface Props {
  variant?: "main" | "sidebar";
}

export function DecisionQueueView({ variant = "main" }: Props) {
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
        const json = (await res.json()) as { data: { items: QueueItem[] } };
        setItems(json.data.items);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load queue");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const loadingEl = (
    <div style={{ padding: variant === "sidebar" ? "12px 16px" : "48px 0", textAlign: "center" }}>
      <span className="db-qi-pnum" style={{ color: "var(--faint)" }}>Loading…</span>
    </div>
  );

  const errorEl = (
    <div style={{ padding: variant === "sidebar" ? "12px 16px" : "48px 0", textAlign: "center" }}>
      <span style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 11, color: "var(--kill)" }}>{error}</span>
    </div>
  );

  if (loading) return loadingEl;
  if (error) return errorEl;

  // ── Sidebar variant: compact q-item list (top 5) ──
  if (variant === "sidebar") {
    if (items.length === 0) {
      return (
        <div style={{ padding: "12px 16px" }}>
          <span className="db-qi-pnum" style={{ color: "var(--faint)" }}>No ideas in queue yet.</span>
        </div>
      );
    }
    return (
      <div>
        {items.slice(0, 5).map((item, idx) => {
          const pct = Math.round(item.priorityScore * 100);
          return (
            <Link
              key={item.id}
              href={`/ideas/${item.ideaId}`}
              className="db-q-item"
            >
              <div className="db-qi-rank">{idx + 1}</div>
              <div>
                <div className="db-qi-title">
                  {(item.ideaText.split("\n\n")[0] ?? item.ideaText).slice(0, 80)}
                  {item.ideaText.length > 80 ? "…" : ""}
                </div>
                <div className="db-qi-pbar-row">
                  <div className="db-qi-pbar">
                    <div className="db-qi-pf" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="db-qi-pnum">{pct}%</span>
                </div>
              </div>
              <div className={`db-qi-delta ${pct >= 70 ? "up" : pct >= 40 ? "flat" : "down"}`}>
                {pct >= 70 ? "↑" : pct >= 40 ? "→" : "↓"}
              </div>
            </Link>
          );
        })}
      </div>
    );
  }

  // ── Main variant: full priority board ──
  if (items.length === 0) {
    return (
      <div style={{ padding: "48px 0", textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-bitter), Georgia, serif", fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
          Queue is empty
        </p>
        <p style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 11, color: "var(--dim)", marginBottom: 20 }}>
          Validate ideas to start tracking priorities.
        </p>
        <Link
          href="/ideas/new"
          className="db-btn-new"
        >
          + New survey →
        </Link>
      </div>
    );
  }

  return (
    <div className="bc db-idea-tbl">
      <div className="bc-hd">
        Priority Queue <span className="r">Ranked by signal velocity</span>
      </div>
      <div className="db-prio-col-head">
        <span className="db-ich">#</span>
        <span className="db-ich">Priority</span>
        <span className="db-ich">Score</span>
        <span className="db-ich">Idea</span>
        <span className="db-ich" style={{ textAlign: "right" }}>Signals</span>
        <span className="db-ich" />
      </div>
      {items.map((item, idx) => {
        const pct = Math.round(item.priorityScore * 100);
        const verdict = item.verdict ?? null;
        const vc =
          verdict === "GO" ? "go" : verdict === "KILL" ? "kill" : verdict === "PIVOT" ? "pivot" : "";
        return (
          <Link key={item.id} href={`/ideas/${item.ideaId}`} className="db-prio-row">
            <div className="db-pr-rank">{idx + 1}</div>
            <div className="db-pr-pbar">
              <div className="db-pr-pnum">{pct}%</div>
              <div className="db-pr-bar">
                <div className="db-pr-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className={`db-ir-score ${vc}`} style={{ fontSize: 18 }}>
              {item.verdict ?? "—"}
            </div>
            <div className="db-pr-title">{item.ideaText.split("\n\n")[0] ?? item.ideaText}</div>
            <div className={`db-pr-delta ${pct >= 70 ? "up" : pct >= 40 ? "flat" : "down"}`}>
              {item.changeSummary ?? (pct >= 70 ? "↑ trending" : pct >= 40 ? "→ stable" : "↓ stale")}
            </div>
            <div className="db-pr-arrow">→</div>
          </Link>
        );
      })}
    </div>
  );
}
