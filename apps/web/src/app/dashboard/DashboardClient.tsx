"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/mdx-utils";

export type TableRow = {
  id: string;
  text: string;
  createdAt: string;
  score: number | null;
  verdict: string | null;
  status: "pending" | "validated" | "killed" | "pivoting";
};

const STATUS_CONFIG = {
  pending:   { label: "Pending",   color: "var(--accent)",    pulse: true  },
  validated: { label: "Validated", color: "var(--validated)", pulse: false },
  killed:    { label: "Killed",    color: "var(--kill)",      pulse: false },
  pivoting:  { label: "Pivoting",  color: "var(--caution)",   pulse: false },
} as const;

const VERDICT_COLORS: Record<string, string> = {
  GO:    "var(--validated)",
  KILL:  "var(--kill)",
  PIVOT: "var(--caution)",
};

type SortKey = "date" | "score";

export function DashboardClient({ rows }: { rows: TableRow[] }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("date");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows
      .filter((r) => !q || r.text.toLowerCase().includes(q) || r.status.includes(q))
      .sort((a, b) =>
        sort === "score"
          ? (b.score ?? -1) - (a.score ?? -1)
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [rows, search, sort]);

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search ideas…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 h-8 px-3 rounded border text-[13px] text-[var(--t1)] placeholder:text-[var(--t3)] focus:outline-none focus:border-[var(--t3)] transition-colors"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        />
        <div
          className="flex rounded border overflow-hidden"
          style={{ borderColor: "var(--border)" }}
        >
          {(["date", "score"] as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className="mono text-[10px] px-3 h-8 uppercase tracking-[0.08em] transition-colors"
              style={{
                background: sort === key ? "var(--border)" : "transparent",
                color: sort === key ? "var(--t1)" : "var(--t3)",
              }}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {/* Rows */}
      {filtered.length === 0 ? (
        <p className="text-[13px] text-[var(--t3)] py-8 text-center">No results.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((row) => {
            const st = STATUS_CONFIG[row.status];
            return (
              <Link
                key={row.id}
                href={`/ideas/${row.id}`}
                className="group flex items-center gap-4 rounded-md border px-5 py-3.5 hover:border-[var(--t3)] transition-colors"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-[var(--t1)] leading-snug truncate group-hover:text-[var(--accent)] transition-colors">
                    {row.text}
                  </p>
                  <p className="mono text-[10px] text-[var(--t3)] mt-0.5">
                    {formatDate(row.createdAt)}
                  </p>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  {/* Score */}
                  <div className="w-10 text-right">
                    {row.score !== null ? (
                      <span
                        className="display tnum text-[16px] font-semibold"
                        style={{
                          color: row.verdict
                            ? (VERDICT_COLORS[row.verdict] ?? "var(--t3)")
                            : "var(--t3)",
                        }}
                      >
                        {row.score}
                      </span>
                    ) : (
                      <span className="mono text-[11px] text-[var(--t3)]">—</span>
                    )}
                  </div>

                  {/* Status badge */}
                  <div className="flex items-center gap-1.5 w-[72px]">
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.pulse ? "pulse-dot" : ""}`}
                      style={{ background: st.color }}
                    />
                    <span
                      className="mono text-[10px] uppercase tracking-[0.08em]"
                      style={{ color: st.color }}
                    >
                      {st.label}
                    </span>
                  </div>

                  <span className="text-[var(--t3)] group-hover:text-[var(--accent)] transition-colors text-[13px]">
                    →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
