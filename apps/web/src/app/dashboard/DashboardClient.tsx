"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { VerdictMark } from "@/components/brand/VerdictMark";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { TeamAnalytics } from "@/components/TeamAnalytics";
import { DecisionQueueView } from "./DecisionQueueView";
import type { Plan } from "@pledgeoff/core";

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
  outcomeType: string | null;
  needsOutcome: boolean;
  signalsStale: boolean;
};

export type TeamFeedRow = {
  id: string;
  text: string;
  createdAt: string;
  userId: string;
  memberInitials: string;
  score: number | null;
  verdict: string | null;
  isOwn: boolean;
  reactions: { agree: number; disagree: number; myReaction: "agree" | "disagree" | null };
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

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

interface DashboardClientProps {
  rows: TableRow[];
  totalCount: number;
  teamFeedRows?: TeamFeedRow[];
  teamName?: string | null;
  teamId?: string | null;
  plan?: Plan;
}

export function DashboardClient({
  rows,
  totalCount,
  teamFeedRows = [],
  teamName,
  teamId,
  plan = "free",
}: DashboardClientProps) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("date");
  const searchRef = useRef<HTMLInputElement>(null);
  const initialTab = (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tab") === "queue") ? "queue" as const : "personal" as const;
  const [tab, setTab] = useState<"personal" | "team" | "queue">(initialTab);
  const [verdictFilter, setVerdictFilter] = useState<string>("all");
  const [memberFilter, setMemberFilter] = useState<string>("all");
  const searchParams = useSearchParams();
  const billingSuccess = searchParams.get("billing") === "success";
  const [showBillingBanner, setShowBillingBanner] = useState(billingSuccess);

  // reactions state: map ideaId → { agree, disagree, myReaction }
  const [reactionState, setReactionState] = useState<Record<string, TeamFeedRow["reactions"]>>(
    () => Object.fromEntries(teamFeedRows.map((r) => [r.id, r.reactions]))
  );

  const hasTeam = !!teamId;
  const isPaid = plan !== "free";
  const router = useRouter();
  const [quickText, setQuickText] = useState("");
  const [quickStatus, setQuickStatus] = useState<"idle" | "loading" | "error">("idle");
  const [quickError, setQuickError] = useState("");

  const handleQuickValidate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (quickText.trim().length < 10) return;
    setQuickStatus("loading");
    setQuickError("");
    const supabase = createSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }
    const res = await fetch("/api/v1/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ text: quickText.trim() }),
    });
    const json = await res.json();
    if (!res.ok) {
      setQuickError(json.error?.message ?? "Something went wrong. Try again.");
      setQuickStatus("error");
      return;
    }
    router.push(`/ideas/${json.data.id}`);
  };
  const showTeamTab = isPaid;

  useEffect(() => {
    if (!billingSuccess) return;
    const t = setTimeout(() => setShowBillingBanner(false), 5000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        router.push("/ideas/new");
      } else if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  const handleReact = useCallback(async (ideaId: string, reaction: "agree" | "disagree") => {
    const current = reactionState[ideaId];
    const newReaction = current?.myReaction === reaction ? null : reaction;
    const supabase = createSupabaseBrowserClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const res = await fetch(`/api/v1/ideas/${ideaId}/reactions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ reaction: newReaction }),
    });
    if (res.ok) {
      const { data } = await res.json() as { data: { agree: number; disagree: number; myReaction: "agree" | "disagree" | null } };
      setReactionState((prev) => ({ ...prev, [ideaId]: data }));
    }
  }, [reactionState]);

  const verdictCounts = useMemo(() => ({
    GO:    rows.filter((r) => r.verdict === "GO").length,
    KILL:  rows.filter((r) => r.verdict === "KILL").length,
    PIVOT: rows.filter((r) => r.verdict === "PIVOT").length,
  }), [rows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows
      .filter((r) => !q || r.text.toLowerCase().includes(q))
      .filter((r) => verdictFilter === "all" || r.verdict === verdictFilter)
      .sort((a, b) =>
        sort === "score"
          ? (b.score ?? -1) - (a.score ?? -1)
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [rows, search, sort, verdictFilter]);

  return (
    <>
      {showBillingBanner && (
        <div
          className="rounded-md border px-5 py-3.5 flex items-center justify-between mb-4"
          style={{ background: "color-mix(in srgb, var(--accent) 6%, transparent)", borderColor: "color-mix(in srgb, var(--accent) 25%, transparent)" }}
        >
          <span className="text-[13px]" style={{ color: "var(--accent)" }}>
            Upgrade successful! Your new plan is now active.
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

      {/* Tab bar + contextual new validation */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTab("personal")}
            className="mono text-[11px] px-3 h-8 rounded-md border transition-colors"
            style={{
              background: tab === "personal" ? "var(--accent)" : "transparent",
              color: tab === "personal" ? "var(--accent-fg)" : "var(--t2)",
              borderColor: tab === "personal" ? "var(--accent)" : "var(--border)",
            }}
          >
            Personal
          </button>
          {showTeamTab && (
            <button
              onClick={() => setTab("team")}
              className="mono text-[11px] px-3 h-8 rounded-md border transition-colors"
              style={{
                background: tab === "team" ? "var(--accent)" : "transparent",
                color: tab === "team" ? "var(--accent-fg)" : "var(--t2)",
                borderColor: tab === "team" ? "var(--accent)" : "var(--border)",
              }}
            >
              Team {teamName ? `· ${teamName}` : ""}
            </button>
          )}
          <button
            onClick={() => setTab("queue")}
            className="mono text-[11px] px-3 h-8 rounded-md border transition-colors"
            style={{
              background: tab === "queue" ? "var(--accent)" : "transparent",
              color: tab === "queue" ? "var(--accent-fg)" : "var(--t2)",
              borderColor: tab === "queue" ? "var(--accent)" : "var(--border)",
            }}
          >
            Queue
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline mono text-[10px] px-2 py-1 rounded border" style={{ borderColor: "var(--border)", color: "var(--t3)" }}>
            [N] new · [/] search
          </span>
          {(plan === "free" || plan === "founder") && (
            <Link
              href="/pricing"
              className="hidden sm:inline-flex mono text-[11px] px-3 h-8 rounded-md border items-center transition-colors hover:border-(--accent) hover:text-(--accent) shrink-0"
              style={{ borderColor: "var(--border)", color: "var(--t3)" }}
            >
              Upgrade →
            </Link>
          )}
          <Link
            href="/ideas/new"
            aria-keyshortcuts="n"
            className="mono text-[11px] px-3 h-8 rounded-md border inline-flex items-center gap-1.5 transition-colors hover:border-(--accent) hover:text-(--accent) shrink-0"
            style={{ borderColor: "var(--border)", color: "var(--t2)" }}
          >
            + New validation
          </Link>
        </div>
      </div>

      {/* ── Personal tab ── */}
      {tab === "personal" && (
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
              My validations
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
                  className="mono text-[9px] px-2.5 h-8 uppercase tracking-[0.08em] transition-colors"
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
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="search ideas…"
              aria-label="Search ideas"
              aria-keyshortcuts="/"
              className="w-full sm:w-44 bg-transparent outline-none px-3 h-8 sm:h-7 text-[12px] rounded-md border"
              style={{ borderColor: "var(--border)", color: "var(--t1)" }}
            />
            {/* Verdict filter chips */}
            <div className="flex items-center gap-1 w-full sm:w-auto">
              {([
                { key: "all",   label: "All",  color: "var(--t2)" },
                { key: "GO",    label: "GO",   color: "var(--validated)" },
                { key: "KILL",  label: "KILL", color: "var(--kill)" },
                { key: "PIVOT", label: "PIVOT",color: "var(--caution)" },
              ] as const).map(({ key, label, color }) => {
                const count = key === "all" ? rows.length : verdictCounts[key];
                const active = verdictFilter === key;
                return (
                  <button
                    key={key}
                    onClick={() => setVerdictFilter(key)}
                    className="mono text-[9px] px-2.5 h-9 rounded border transition-colors shrink-0"
                    style={{
                      borderColor: active ? color : "var(--border)",
                      color: active ? color : "var(--t3)",
                      background: active ? `color-mix(in srgb, ${color} 8%, transparent)` : "transparent",
                    }}
                  >
                    {label} {count > 0 && <span style={{ opacity: 0.7 }}>{count}</span>}
                  </button>
                );
              })}
            </div>
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
                style={{
                  borderColor: "var(--border)",
                  background: isToday(row.createdAt) ? "rgba(var(--accent-rgb,99,102,241),0.04)" : undefined,
                  borderLeft: isToday(row.createdAt) ? "2px solid var(--accent)" : undefined,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.015)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = isToday(row.createdAt) ? "rgba(var(--accent-rgb,99,102,241),0.04)" : "transparent")
                }
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
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="text-[13px] text-(--t1) truncate">{row.text}</div>
                    {row.needsOutcome && (
                      <span
                        className="mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0"
                        style={{
                          color: "var(--caution)",
                          background: "color-mix(in srgb, var(--caution) 10%, transparent)",
                          border: "1px solid color-mix(in srgb, var(--caution) 25%, transparent)",
                        }}
                      >
                        how did it go?
                      </span>
                    )}
                    {row.outcomeType && (
                      <span
                        className="mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0"
                        style={{
                          color: row.outcomeType === "built_worked" ? "var(--validated)" : row.outcomeType === "not_built" ? "var(--t3)" : "var(--kill)",
                          background: row.outcomeType === "built_worked" ? "color-mix(in srgb, var(--validated) 10%, transparent)" : "color-mix(in srgb, var(--border) 40%, transparent)",
                          border: `1px solid ${row.outcomeType === "built_worked" ? "color-mix(in srgb, var(--validated) 25%, transparent)" : "var(--border)"}`,
                        }}
                      >
                        {row.outcomeType === "built_worked" ? "built ✓" : row.outcomeType === "built_failed" ? "built ✗" : "not built"}
                      </span>
                    )}
                    {row.signalsStale && !row.needsOutcome && (
                      <span
                        className="mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0"
                        style={{
                          color: "var(--t3)",
                          background: "color-mix(in srgb, var(--border) 40%, transparent)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        signals outdated
                      </span>
                    )}
                  </div>
                </div>

                {/* Mobile meta row */}
                <div className="sm:contents flex items-center gap-3">
                  {/* Score + mini bar */}
                  <div className="sm:col-span-2 flex items-center gap-2 flex-1 sm:flex-none">
                    {row.score !== null ? (
                      <>
                        <span
                          className="display tnum text-[14px] sm:text-[16px] font-semibold w-7 shrink-0"
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
                    className="sm:col-span-1 mono text-[10px] shrink-0"
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
                  <div className="sm:col-span-1 ml-auto sm:ml-0 sm:text-right mono text-[10px] shrink-0" style={{ color: "var(--t3)" }}>
                    {isToday(row.createdAt) ? (
                      <span style={{ color: "var(--accent)" }}>Today</span>
                    ) : (
                      shortDate(row.createdAt)
                    )}
                  </div>
                </div>
              </Link>
            );
          })}

          {/* Empty */}
          {filtered.length === 0 && (
            <div className="px-6 py-16">
              {search ? (
                <p className="text-center text-[13px] text-(--t3)">No results for &ldquo;{search}&rdquo;.</p>
              ) : (
                <div className="max-w-[560px] mx-auto">
                  <p className="mono text-[10px] uppercase tracking-[0.14em] text-(--t3) mb-4">
                    step 01 · signal verdict
                  </p>
                  <h2 className="display text-[28px] sm:text-[36px] font-semibold tracking-tight leading-[1.05] text-(--t1) mb-2">
                    What are you building?
                  </h2>
                  <p className="text-[13px] text-(--t2) mb-6">
                    One sentence. Get a GO / KILL / PIVOT verdict in under 60 seconds.
                  </p>
                  <form onSubmit={handleQuickValidate} className="space-y-3">
                    <textarea
                      value={quickText}
                      onChange={(e) => setQuickText(e.target.value)}
                      placeholder="AI-powered meal planner that adapts to your gym schedule…"
                      rows={3}
                      disabled={quickStatus === "loading"}
                      className="w-full bg-transparent outline-none border rounded-md p-4 text-[14px] leading-[1.6] resize-none transition-colors"
                      style={{
                        borderColor: quickText.length >= 10 ? "var(--accent)" : "var(--border)",
                        color: "var(--t1)",
                      }}
                    />
                    {quickError && (
                      <p className="text-[12px]" style={{ color: "var(--kill)" }}>{quickError}</p>
                    )}
                    <div className="flex items-center gap-4">
                      <button
                        type="submit"
                        disabled={quickText.trim().length < 10 || quickStatus === "loading"}
                        className="display text-[13px] font-semibold px-5 h-10 rounded-md flex items-center gap-2 transition-all disabled:opacity-40"
                        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                      >
                        {quickStatus === "loading" ? (
                          <>
                            <span className="inline-block w-3 h-3 rounded-full border-2 border-black/30 border-t-black/90 animate-spin" />
                            Analyzing…
                          </>
                        ) : "Validate →"}
                      </button>
                      <span className="mono text-[10px] text-(--t3)">
                        {quickText.length < 10 ? `${10 - quickText.length} chars min` : "ready"}
                      </span>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Team tab ── */}
      {tab === "team" && showTeamTab && (
        <>
          {/* No team yet */}
          {!hasTeam && (
            <div
              className="rounded-md border px-6 py-16 text-center"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <div className="display text-[18px] font-semibold tracking-tight text-(--t1) mb-2">No team yet.</div>
              <p className="text-[13px] mb-5" style={{ color: "var(--t2)" }}>
                Create a team and invite colleagues in Settings → Team.
              </p>
              <Link
                href="/settings"
                className="mono text-[11px] px-4 h-9 rounded-md border inline-flex items-center transition-colors hover:border-(--accent)"
                style={{ borderColor: "var(--border)", color: "var(--t2)" }}
              >
                Go to Settings →
              </Link>
            </div>
          )}

          {hasTeam && (() => {
            // Team pulse stats
            const withVerdict = teamFeedRows.filter((r) => r.verdict);
            const goCount = teamFeedRows.filter((r) => r.verdict === "GO").length;
            const goRate = withVerdict.length > 0 ? Math.round((goCount / withVerdict.length) * 100) : null;
            const memberCounts = teamFeedRows.reduce<Record<string, { initials: string; count: number }>>((acc, r) => {
              if (!acc[r.userId]) acc[r.userId] = { initials: r.memberInitials, count: 0 };
              acc[r.userId].count++;
              return acc;
            }, {});
            const mostActive = Object.values(memberCounts).sort((a, b) => b.count - a.count)[0] ?? null;

            // Unique members for filter
            const members = Object.entries(memberCounts).map(([uid, v]) => ({ uid, ...v }));

            // Filtered feed
            const filteredFeed = teamFeedRows.filter((r) => {
              if (verdictFilter !== "all" && r.verdict !== verdictFilter) return false;
              if (memberFilter !== "all" && r.userId !== memberFilter) return false;
              return true;
            });

            return (
              <>
                {/* Team pulse */}
                <div
                  className="rounded-md border p-4 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-4"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                >
                  <div className="border-l pl-3" style={{ borderColor: "var(--border)" }}>
                    <div className="mono text-[9px] uppercase tracking-[0.14em] text-(--t3)">Total validations</div>
                    <div className="display text-[24px] tnum font-semibold text-(--t1) mt-1">{teamFeedRows.length}</div>
                  </div>
                  <div className="border-l pl-3" style={{ borderColor: "var(--border)" }}>
                    <div className="mono text-[9px] uppercase tracking-[0.14em] text-(--t3)">GO rate</div>
                    <div className="display text-[24px] tnum font-semibold mt-1" style={{ color: "var(--validated)" }}>
                      {goRate !== null ? `${goRate}%` : "—"}
                    </div>
                  </div>
                  <div className="border-l pl-3" style={{ borderColor: "var(--border)" }}>
                    <div className="mono text-[9px] uppercase tracking-[0.14em] text-(--t3)">Pending</div>
                    <div className="display text-[24px] tnum font-semibold text-(--t1) mt-1">
                      {teamFeedRows.filter((r) => !r.verdict).length}
                    </div>
                  </div>
                  <div className="border-l pl-3" style={{ borderColor: "var(--border)" }}>
                    <div className="mono text-[9px] uppercase tracking-[0.14em] text-(--t3)">Most active</div>
                    {mostActive ? (
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-6 h-6 rounded-full border flex items-center justify-center mono text-[9px] font-semibold shrink-0"
                          style={{ borderColor: "var(--border)", background: "var(--canvas)", color: "var(--t2)" }}
                        >
                          {mostActive.initials}
                        </div>
                        <span className="mono text-[11px] text-(--t1)">{mostActive.count}</span>
                      </div>
                    ) : (
                      <div className="display text-[24px] tnum font-semibold text-(--t1) mt-1">—</div>
                    )}
                  </div>
                </div>

                {/* Feed */}
                <div className="rounded-md border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                  {/* Filters header */}
                  <div className="px-4 sm:px-6 py-3 border-b flex flex-wrap items-center gap-3" style={{ borderColor: "var(--border)" }}>
                    <h2 className="display text-[15px] font-semibold tracking-tight text-(--t1)">
                      {teamName ?? "Team"} feed
                    </h2>
                    <span className="mono text-[10px] text-(--t3)">{filteredFeed.length}</span>
                    <div className="ml-auto flex items-center gap-2">
                      {/* Verdict filter */}
                      <select
                        value={verdictFilter}
                        onChange={(e) => setVerdictFilter(e.target.value)}
                        className="mono text-[10px] h-7 px-2 rounded-md border bg-transparent outline-none"
                        style={{ borderColor: "var(--border)", color: "var(--t2)" }}
                      >
                        <option value="all">All verdicts</option>
                        <option value="GO">GO</option>
                        <option value="KILL">KILL</option>
                        <option value="PIVOT">PIVOT</option>
                        <option value="">Pending</option>
                      </select>
                      {/* Member filter */}
                      {members.length > 1 && (
                        <select
                          value={memberFilter}
                          onChange={(e) => setMemberFilter(e.target.value)}
                          className="mono text-[10px] h-7 px-2 rounded-md border bg-transparent outline-none"
                          style={{ borderColor: "var(--border)", color: "var(--t2)" }}
                        >
                          <option value="all">All members</option>
                          {members.map((m) => (
                            <option key={m.uid} value={m.uid}>{m.initials} ({m.count})</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Empty filtered */}
                  {filteredFeed.length === 0 && (
                    <div className="px-6 py-12 text-center">
                      <div className="mono text-[12px] text-(--t3)">No validations match the current filters.</div>
                    </div>
                  )}

                  {/* Feed rows */}
                  {filteredFeed.map((row) => {
                    const color = row.verdict ? (VERDICT_COLOR[row.verdict] ?? "var(--t3)") : "var(--t3)";
                    const rxn = reactionState[row.id] ?? row.reactions;
                    return (
                      <div
                        key={row.id}
                        className="px-4 sm:px-6 py-3.5 border-b"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div
                            className="w-7 h-7 rounded-full border flex items-center justify-center mono text-[10px] font-semibold shrink-0 mt-0.5"
                            style={{
                              borderColor: row.isOwn ? "var(--accent)" : "var(--border)",
                              background: row.isOwn ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--canvas)",
                              color: row.isOwn ? "var(--accent)" : "var(--t2)",
                            }}
                          >
                            {row.memberInitials}
                          </div>

                          {/* Main content */}
                          <div className="flex-1 min-w-0">
                            <Link href={`/ideas/${row.id}`} className="block hover:underline underline-offset-2">
                              <div className="text-[13px] text-(--t1) truncate">{row.text}</div>
                            </Link>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="mono text-[10px] text-(--t3)">
                                {shortDate(row.createdAt)}{row.isOwn ? " · you" : ""}
                              </span>
                              {row.score !== null && (
                                <span className="display tnum text-[12px] font-semibold" style={{ color }}>
                                  {row.score}
                                </span>
                              )}
                              {row.verdict && (row.verdict === "GO" || row.verdict === "PIVOT" || row.verdict === "KILL") && (
                                <VerdictMark verdict={row.verdict} size={18} />
                              )}
                            </div>
                          </div>

                          {/* Reactions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleReact(row.id, "agree")}
                              className="flex items-center gap-1 mono text-[10px] px-2 py-1 rounded-md border transition-colors"
                              style={{
                                borderColor: rxn.myReaction === "agree" ? "var(--validated)" : "var(--border)",
                                color: rxn.myReaction === "agree" ? "var(--validated)" : "var(--t3)",
                                background: rxn.myReaction === "agree" ? "color-mix(in srgb, var(--validated) 8%, transparent)" : "transparent",
                              }}
                            >
                              ↑ {rxn.agree > 0 ? rxn.agree : ""}
                            </button>
                            <button
                              onClick={() => handleReact(row.id, "disagree")}
                              className="flex items-center gap-1 mono text-[10px] px-2 py-1 rounded-md border transition-colors"
                              style={{
                                borderColor: rxn.myReaction === "disagree" ? "var(--kill)" : "var(--border)",
                                color: rxn.myReaction === "disagree" ? "var(--kill)" : "var(--t3)",
                                background: rxn.myReaction === "disagree" ? "color-mix(in srgb, var(--kill) 8%, transparent)" : "transparent",
                              }}
                            >
                              ↓ {rxn.disagree > 0 ? rxn.disagree : ""}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Team analytics */}
                <TeamAnalytics rows={teamFeedRows} plan={plan} />
              </>
            );
          })()}
        </>
      )}

      {/* ── Queue tab ── */}
      {tab === "queue" && (
        plan === "free" ? (
          <div className="border rounded-md p-8 text-center" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <p className="display text-[18px] font-semibold text-(--t1) mb-2">Decision Queue</p>
            <p className="text-[13px] mb-5" style={{ color: "var(--t2)" }}>
              Automatically surfaces which stale ideas need a decision. Available on Founder and above.
            </p>
            <Link
              href="/pricing"
              className="mono text-[11px] px-4 h-9 rounded-md inline-flex items-center transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              Upgrade to Founder →
            </Link>
          </div>
        ) : <DecisionQueueView />
      )}
    </>
  );
}
