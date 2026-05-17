"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { VerdictMark } from "@/components/brand/VerdictMark";

export type ToolStatus = {
  simulate: boolean;
  landing: boolean;
  customers: boolean;
  build: boolean;
};

export type TableRow = {
  id: string;
  text: string;
  createdAt: string;
  score: number | null;
  verdict: string | null;
  status: "pending" | "validated" | "killed" | "pivoting";
  tools: ToolStatus;
};

const VERDICT_COLOR: Record<string, string> = {
  GO:    "var(--validated)",
  KILL:  "var(--kill)",
  PIVOT: "var(--caution)",
};


type SortKey = "date" | "score";

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function DashboardClient({ rows, totalCount }: { rows: TableRow[]; totalCount: number }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("date");
  const searchParams = useSearchParams();
  const billingSuccess = searchParams.get("billing") === "success";
  const [showBillingBanner, setShowBillingBanner] = useState(billingSuccess);

  useEffect(() => {
    if (!billingSuccess) return;
    const t = setTimeout(() => setShowBillingBanner(false), 5000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows
      .filter((r) => !q || r.text.toLowerCase().includes(q))
      .sort((a, b) =>
        sort === "score"
          ? (b.score ?? -1) - (a.score ?? -1)
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [rows, search, sort]);

  return (
    <>
      {showBillingBanner && (
        <div
          className="rounded-md border px-5 py-3.5 flex items-center justify-between mb-4"
          style={{ background: "color-mix(in srgb, var(--accent) 6%, transparent)", borderColor: "color-mix(in srgb, var(--accent) 25%, transparent)" }}
        >
          <span className="text-[13px]" style={{ color: "var(--accent)" }}>
            Welcome to Pro! Your plan is now active.
          </span>
          <button
            onClick={() => setShowBillingBanner(false)}
            className="mono text-[11px] ml-4 shrink-0"
            style={{ color: "var(--t3)" }}
          >
            ✕
          </button>
        </div>
      )}
    <div
      className="rounded-md border"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      {/* Table header */}
      <div
        className="px-4 sm:px-6 py-4 border-b flex flex-wrap gap-3 items-center"
        style={{ borderColor: "var(--border)" }}
      >
        <h2 className="display text-[15px] font-semibold tracking-tight text-(--t1)">
          All validations
        </h2>
        <span className="mono text-[10px] text-(--t3)">
          {totalCount}
        </span>
        <div
          className="ml-auto flex rounded border overflow-hidden"
          style={{ borderColor: "var(--border)" }}
        >
          {(["date", "score"] as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className="mono text-[9px] px-2.5 h-7 uppercase tracking-[0.08em] transition-colors"
              style={{
                background: sort === key ? "var(--border)" : "transparent",
                color: sort === key ? "var(--t1)" : "var(--t3)",
              }}
            >
              {key}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="search ideas…"
          className="w-full sm:w-44 bg-transparent outline-none px-3 h-8 sm:h-7 text-[12px] rounded-md border"
          style={{ borderColor: "var(--border)", color: "var(--t1)" }}
        />
      </div>

      {/* Column headers — desktop only */}
      <div
        className="hidden sm:grid px-6 py-2.5 grid-cols-12 gap-3 border-b mono text-[10px] uppercase tracking-[0.14em]"
        style={{ borderColor: "var(--border)", color: "var(--t3)" }}
      >
        <div className="col-span-1" />
        <div className="col-span-4">Idea</div>
        <div className="col-span-2">Score</div>
        <div className="col-span-1">Verdict</div>
        <div className="col-span-3">Tools</div>
        <div className="col-span-1 text-right">Date</div>
      </div>

      {/* Rows */}
      {filtered.map((row) => {
        const color = row.verdict ? (VERDICT_COLOR[row.verdict] ?? "var(--t3)") : "var(--t3)";
        const toolList = [
          { key: "simulate" as const, label: "Sim" },
          { key: "landing" as const, label: "Land" },
          { key: "customers" as const, label: "Cust" },
          { key: "build" as const, label: "Build" },
        ];
        return (
          <Link
            key={row.id}
            href={`/ideas/${row.id}`}
            className="px-4 sm:px-6 py-3 sm:grid sm:grid-cols-12 sm:gap-3 border-b items-center cursor-pointer transition-colors"
            style={{ borderColor: "var(--border)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.015)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {/* Verdict icon */}
            <div className="hidden sm:flex sm:col-span-1 items-center" style={{ color: "var(--t1)" }}>
              {row.verdict && (row.verdict === "GO" || row.verdict === "PIVOT" || row.verdict === "KILL") ? (
                <VerdictMark verdict={row.verdict} size={24} />
              ) : (
                <span className="w-6 h-6" />
              )}
            </div>

            {/* Idea */}
            <div className="sm:col-span-4 min-w-0 mb-1.5 sm:mb-0">
              <div className="text-[13px] text-(--t1) truncate">{row.text}</div>
              <div className="mono text-[10px] mt-0.5 text-(--t3)">
                val_{row.id.slice(0, 8)}
              </div>
            </div>

            {/* Mobile meta row */}
            <div className="sm:contents flex items-center gap-3">
              {/* Score + mini bar */}
              <div className="sm:col-span-2 flex items-center gap-2 flex-1 sm:flex-none">
                {row.score !== null ? (
                  <>
                    <span
                      className="display tnum text-[14px] sm:text-[16px] font-semibold w-7 flex-shrink-0"
                      style={{ color }}
                    >
                      {row.score}
                    </span>
                    <div
                      className="flex-1 h-[3px] rounded-full"
                      style={{ background: "var(--border)" }}
                    >
                      <div
                        className="h-[3px] rounded-full"
                        style={{ width: `${row.score}%`, background: color }}
                      />
                    </div>
                  </>
                ) : (
                  <span className="mono text-[10px] text-(--t3)">—</span>
                )}
              </div>

              {/* Verdict */}
              <div
                className="sm:col-span-1 mono text-[10px] flex-shrink-0"
                style={{ color }}
              >
                {row.verdict ?? "—"}
              </div>

              {/* Tools pills */}
              <div className="sm:col-span-3 hidden sm:flex items-center gap-1">
                {toolList.map(({ key, label }) => (
                  <span
                    key={key}
                    className="mono text-[9px] px-1.5 py-0.5 rounded"
                    style={{
                      background: row.tools[key] ? "rgba(125,214,107,0.12)" : "rgba(255,255,255,0.04)",
                      color: row.tools[key] ? "var(--validated)" : "var(--t3)",
                      border: `1px solid ${row.tools[key] ? "rgba(125,214,107,0.3)" : "var(--border)"}`,
                    }}
                  >
                    {row.tools[key] ? "✓" : "○"} {label}
                  </span>
                ))}
              </div>

              {/* Date */}
              <div className="sm:col-span-1 ml-auto sm:ml-0 sm:text-right mono text-[10px] text-(--t3) flex-shrink-0">
                {shortDate(row.createdAt)}
              </div>
            </div>
          </Link>
        );
      })}

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="px-6 py-16 text-center">
          <div className="display text-[18px] font-semibold tracking-tight text-(--t1) mb-2">
            {search ? "No results." : "No validations yet."}
          </div>
          {!search && (
            <>
              <p className="text-[13px] text-(--t2) max-w-[420px] mx-auto">
                Type a one-sentence idea. Get a score in under 60 seconds.
              </p>
              <Link
                href="/ideas/new"
                className="inline-block mt-5 display text-[13px] font-semibold px-5 h-10 leading-[40px] rounded-md"
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
              >
                Validate your first idea →
              </Link>
            </>
          )}
        </div>
      )}
    </div>
    </>
  );
}
