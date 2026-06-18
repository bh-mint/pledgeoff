"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getAuthToken } from "@/lib/auth-client";
import { TeamAnalytics } from "@/components/TeamAnalytics";
import { TeamActivityFeed } from "@/components/TeamActivityFeed";
import { DecisionQueueView } from "./DecisionQueueView";
import type { Plan } from "@pledgeoff/core";
import type { TeamActivityEvent } from "@/server/team/getTeamActivity";

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
  isOwn: boolean;
  memberInitials?: string;
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

type SortKey = "date" | "score";

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function verdictClass(v: string | null): string {
  if (v === "GO") return "go";
  if (v === "KILL") return "kill";
  if (v === "PIVOT") return "pivot";
  return "";
}

interface DashboardClientProps {
  rows: TableRow[];
  totalCount: number;
  teamFeedRows?: TeamFeedRow[];
  teamActivityEvents?: TeamActivityEvent[];
  teamName?: string | null;
  teamLogoUrl?: string | null;
  teamId?: string | null;
  plan?: Plan;
  isWorkspace?: boolean;
  displayName?: string;
}

export function DashboardClient({
  rows,
  totalCount,
  teamFeedRows = [],
  teamActivityEvents = [],
  teamName,
  teamLogoUrl,
  teamId,
  plan = "free",
  isWorkspace = false,
}: DashboardClientProps) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("date");
  const searchRef = useRef<HTMLInputElement>(null);
  const initialTab =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("tab") === "priority"
      ? ("priority" as const)
      : ("all" as const);
  const [tab, setTab] = useState<"all" | "team" | "priority">(initialTab);
  const [verdictFilter, setVerdictFilter] = useState<string>("all");
  const [memberFilter, setMemberFilter] = useState<string>("all");
  const searchParams = useSearchParams();
  const billingSuccess = searchParams.get("billing") === "success";
  const [showBillingBanner, setShowBillingBanner] = useState(billingSuccess);
  const [reactionState, setReactionState] = useState<
    Record<string, TeamFeedRow["reactions"]>
  >(() =>
    Object.fromEntries(teamFeedRows.map((r) => [r.id, r.reactions]))
  );
  const hasTeam = !!teamId;
  const isPaid = plan !== "free";
  const showTeamTab = isPaid;
  const router = useRouter();
  const [quickText, setQuickText] = useState("");
  const [quickStatus, setQuickStatus] = useState<"idle" | "loading" | "error">("idle");
  const [quickError, setQuickError] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const handleQuickValidate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (quickText.trim().length < 10) return;
    setQuickStatus("loading");
    setQuickError("");
    const token = await getAuthToken();
    if (!token) {
      router.push("/login");
      return;
    }
    const res = await fetch("/api/v1/ideas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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

  const handleReact = useCallback(
    async (ideaId: string, reaction: "agree" | "disagree") => {
      const current = reactionState[ideaId];
      const newReaction = current?.myReaction === reaction ? null : reaction;
      const token = await getAuthToken();
      const res = await fetch(`/api/v1/ideas/${ideaId}/reactions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reaction: newReaction }),
      });
      if (res.ok) {
        const { data } = (await res.json()) as {
          data: { agree: number; disagree: number; myReaction: "agree" | "disagree" | null };
        };
        setReactionState((prev) => ({ ...prev, [ideaId]: data }));
      }
    },
    [reactionState]
  );

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  const verdictCounts = useMemo(
    () => ({
      GO: rows.filter((r) => r.verdict === "GO").length,
      KILL: rows.filter((r) => r.verdict === "KILL").length,
      PIVOT: rows.filter((r) => r.verdict === "PIVOT").length,
    }),
    [rows]
  );

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

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((r) => r.id)));
    }
  }

  async function handleBulkDelete() {
    if (deleting || selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!confirm(`Delete ${count} idea${count > 1 ? "s" : ""}? This cannot be undone.`)) return;
    setDeleting(true);
    const token = await getAuthToken();
    if (!token) {
      setDeleting(false);
      return;
    }
    await Promise.all(
      [...selectedIds].map((id) =>
        fetch(`/api/v1/ideas/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
      )
    );
    setDeleting(false);
    exitSelectMode();
    router.refresh();
  }

  // ── Billing success banner ──
  const billingBanner = showBillingBanner && (
    <div
      className="bc"
      style={{
        background: "color-mix(in srgb, var(--go) 6%, transparent)",
        borderColor: "color-mix(in srgb, var(--go) 25%, transparent)",
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20,
      }}
    >
      <span style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 11, color: "var(--go)", letterSpacing: ".06em" }}>
        Upgrade successful! Your new plan is now active.
      </span>
      <button
        onClick={() => setShowBillingBanner(false)}
        style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 10, color: "var(--faint)", background: "none", border: "none", cursor: "pointer", marginLeft: 16 }}
      >
        ✕
      </button>
    </div>
  );

  // ── View tabs ──
  const tabs = (
    <div className="db-view-tabs">
      <div className="db-vtabs-left">
        <button
          className={`db-vtab${tab === "all" ? " on" : ""}`}
          onClick={() => setTab("all")}
        >
          All ideas{" "}
          <span className="db-vtab-badge">{totalCount}</span>
        </button>
        {showTeamTab && (
          <button
            className={`db-vtab${tab === "team" ? " on" : ""}`}
            onClick={() => setTab("team")}
          >
            Team{" "}
            <span className="db-vtab-plus">Team+</span>
          </button>
        )}
        <button
          className={`db-vtab${tab === "priority" ? " on" : ""}`}
          onClick={() => setTab("priority")}
        >
          Priority
        </button>
      </div>
      <div className="db-vtabs-right">
        <span className="db-vt-count">
          {tab === "all"
            ? `${totalCount} surveys`
            : tab === "team"
            ? `${teamFeedRows.length} items`
            : "ranked by signals"}
        </span>
        <Link href="/ideas/new" className="db-btn-new">
          New survey →
        </Link>
      </div>
    </div>
  );

  // ── ALL TAB ──
  const allTab = tab === "all" && (
    <>
      {/* Search + sort + filter row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="search ideas…"
          aria-label="Search ideas"
          aria-keyshortcuts="/"
          style={{
            fontFamily: "var(--font-chivo-mono), monospace",
            fontSize: 11,
            letterSpacing: ".04em",
            background: "transparent",
            outline: "none",
            padding: "5px 10px",
            border: "1px solid var(--line)",
            color: "var(--ink)",
            width: 180,
          }}
        />
        {/* Sort buttons */}
        <div style={{ display: "flex", border: "1px solid var(--line)" }}>
          {(["date", "score"] as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              style={{
                fontFamily: "var(--font-chivo-mono), monospace",
                fontSize: 9,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                padding: "5px 10px",
                background: sort === key ? "var(--surface-2)" : "transparent",
                color: sort === key ? "var(--ink)" : "var(--faint)",
                border: "none",
                cursor: "pointer",
              }}
            >
              {key}
            </button>
          ))}
        </div>
        {/* Verdict chips */}
        {([
          { key: "all", label: "All" },
          { key: "GO", label: "GO" },
          { key: "KILL", label: "KILL" },
          { key: "PIVOT", label: "PIVOT" },
        ] as const).map(({ key, label }) => {
          const count = key === "all" ? rows.length : verdictCounts[key];
          const active = verdictFilter === key;
          const vc = verdictClass(key === "all" ? null : key);
          return (
            <button
              key={key}
              onClick={() => setVerdictFilter(key)}
              style={{
                fontFamily: "var(--font-chivo-mono), monospace",
                fontSize: 9,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                padding: "5px 10px",
                border: `1px solid ${active && vc ? `var(--${vc})` : "var(--line)"}`,
                color: active && vc ? `var(--${vc})` : "var(--faint)",
                background: active && vc ? `color-mix(in srgb, var(--${vc}) 8%, transparent)` : "transparent",
                cursor: "pointer",
              }}
            >
              {label} {count > 0 && count}
            </button>
          );
        })}
        {/* Select toggle */}
        {rows.length > 0 && (
          <button
            onClick={() => { setSelectMode((v) => !v); setSelectedIds(new Set()); }}
            style={{
              fontFamily: "var(--font-chivo-mono), monospace",
              fontSize: 9,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              padding: "5px 10px",
              border: `1px solid ${selectMode ? "var(--kill)" : "var(--line)"}`,
              color: selectMode ? "var(--kill)" : "var(--faint)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            {selectMode ? "Cancel" : "Select"}
          </button>
        )}
      </div>

      {/* Bulk delete bar */}
      {selectMode && selectedIds.size > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "8px 20px",
            background: "color-mix(in srgb, var(--kill) 6%, transparent)",
            border: "1px solid var(--line)",
            borderBottom: "none",
            marginBottom: -1,
          }}
        >
          <span style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 11, color: "var(--dim)" }}>
            {selectedIds.size} selected
          </span>
          <button
            onClick={handleBulkDelete}
            disabled={deleting}
            style={{
              fontFamily: "var(--font-chivo-mono), monospace",
              fontSize: 11,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              padding: "4px 10px",
              border: "1px solid var(--kill)",
              color: "var(--kill)",
              background: "transparent",
              cursor: "pointer",
              opacity: deleting ? .5 : 1,
            }}
          >
            {deleting ? "Deleting…" : `Delete ${selectedIds.size} →`}
          </button>
        </div>
      )}

      {/* Board card */}
      <div className="bc">
        <div className="bc-hd">
          {isWorkspace && teamLogoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={teamLogoUrl} alt="" style={{ width: 16, height: 16, borderRadius: "50%", objectFit: "cover", marginRight: 8 }} aria-hidden />
          )}
          {isWorkspace ? (teamName ? `${teamName} workspace` : "Workspace") : "Idea History Board"}
          <span className="r">
            {plan} plan
            {" · "}
            {totalCount} {totalCount === 1 ? "survey" : "surveys"}
          </span>
        </div>

        <div className="db-idea-tbl">
          {/* Column headers */}
          <div className="db-idea-col-head">
            <span className="db-ich">
              {selectMode ? (
                <button
                  onClick={toggleSelectAll}
                  style={{
                    width: 14,
                    height: 14,
                    border: `1px solid ${selectedIds.size === filtered.length && filtered.length > 0 ? "var(--go)" : "var(--faint)"}`,
                    background: selectedIds.size === filtered.length && filtered.length > 0 ? "var(--go)" : "transparent",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    color: "var(--bg)",
                  }}
                >
                  {selectedIds.size === filtered.length && filtered.length > 0 ? "✓" : ""}
                </button>
              ) : "Verdict"}
            </span>
            <span className="db-ich">Score</span>
            <span className="db-ich">Idea</span>
            <span className="db-ich">Category</span>
            <span className="db-ich">Date</span>
            <span className="db-ich">Tools</span>
            <span className="db-ich" />
          </div>

          {/* Rows */}
          {filtered.map((row) => {
            const vc = verdictClass(row.verdict);
            const toolKeys: (keyof ToolStatus)[] = ["simulate", "landing", "customers", "build"];
            return (
              <div
                key={row.id}
                style={{ position: "relative", background: selectedIds.has(row.id) ? "color-mix(in srgb, var(--go) 5%, transparent)" : undefined }}
              >
                <Link href={`/ideas/${row.id}`} className="db-idea-row" style={{ pointerEvents: selectMode ? "none" : undefined }}>
                  {/* Verdict */}
                  <div className="db-ir-verdict">
                    <div className={`db-ir-v ${vc}`} />
                    <span className={`db-ir-vt ${vc}`}>{row.verdict ?? "—"}</span>
                  </div>
                  {/* Score */}
                  <div className={`db-ir-score ${vc}`}>
                    {row.score ?? "—"}
                  </div>
                  {/* Title */}
                  <div className="db-ir-title">
                    {!row.isOwn && row.memberInitials && (
                      <span
                        title={`By ${row.memberInitials}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          border: "1px solid var(--line)",
                          fontFamily: "var(--font-chivo-mono), monospace",
                          fontSize: 7,
                          fontWeight: 600,
                          color: "var(--dim)",
                          marginRight: 6,
                          flexShrink: 0,
                          verticalAlign: "middle",
                        }}
                      >
                        {row.memberInitials}
                      </span>
                    )}
                    {row.text.slice(0, 120)}{row.text.length > 120 ? "…" : ""}
                  </div>
                  {/* Category placeholder (not in row data, skip) */}
                  <div className="db-ir-cat">
                    {row.needsOutcome && (
                      <span style={{ color: "var(--pivot)", fontSize: 8, letterSpacing: ".1em", textTransform: "uppercase" }}>
                        how did it go?
                      </span>
                    )}
                    {row.outcomeType && !row.needsOutcome && (
                      <span style={{ color: row.outcomeType === "built_worked" ? "var(--go)" : "var(--kill)", fontSize: 8, letterSpacing: ".1em", textTransform: "uppercase" }}>
                        {row.outcomeType === "built_worked" ? "built ✓" : row.outcomeType === "built_failed" ? "built ✗" : "not built"}
                      </span>
                    )}
                    {row.signalsStale && !row.needsOutcome && !row.outcomeType && (
                      <span style={{ color: "var(--faint)", fontSize: 8, letterSpacing: ".1em", textTransform: "uppercase" }}>
                        outdated
                      </span>
                    )}
                  </div>
                  {/* Date */}
                  <div className="db-ir-date">
                    {isToday(row.createdAt) ? (
                      <span style={{ color: "var(--go)" }}>Today</span>
                    ) : (
                      shortDate(row.createdAt)
                    )}
                  </div>
                  {/* Tools */}
                  <div className="db-ir-tools">
                    {toolKeys.map((k) => (
                      <div key={k} className={`db-tool-dot ${row.tools[k] ? "run" : "idle"}`} />
                    ))}
                  </div>
                  {/* Arrow */}
                  <div className="db-ir-arrow">→</div>
                </Link>
                {selectMode && (
                  <div
                    style={{ position: "absolute", inset: 0, zIndex: 10, cursor: "pointer", display: "flex", alignItems: "center", paddingLeft: 20 }}
                    onClick={() => toggleSelect(row.id)}
                  >
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        border: `1px solid ${selectedIds.has(row.id) ? "var(--go)" : "var(--faint)"}`,
                        background: selectedIds.has(row.id) ? "var(--go)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 9,
                        color: "var(--bg)",
                      }}
                    >
                      {selectedIds.has(row.id) ? "✓" : ""}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Empty filtered state */}
          {filtered.length === 0 && (
            <div style={{ padding: "48px 28px" }}>
              {search ? (
                <p style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 12, color: "var(--faint)", textAlign: "center" }}>
                  No results for &ldquo;{search}&rdquo;.
                </p>
              ) : (
                <div style={{ maxWidth: 480, margin: "0 auto" }}>
                  <p style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 9, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 14 }}>
                    Step 01 · Signal verdict
                  </p>
                  <h2 style={{ fontFamily: "var(--font-bitter), Georgia, serif", fontSize: 28, fontWeight: 700, color: "var(--ink)", marginBottom: 8, lineHeight: 1.1 }}>
                    What are you building?
                  </h2>
                  <p style={{ fontSize: 14, color: "var(--dim)", marginBottom: 20, lineHeight: 1.65 }}>
                    One sentence. Get a GO / KILL / PIVOT verdict in under 60 seconds.
                  </p>
                  <form onSubmit={handleQuickValidate} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <textarea
                      value={quickText}
                      onChange={(e) => setQuickText(e.target.value)}
                      placeholder="AI-powered meal planner that adapts to your gym schedule…"
                      rows={3}
                      disabled={quickStatus === "loading"}
                      style={{
                        fontFamily: "var(--font-bitter), Georgia, serif",
                        fontSize: 14,
                        lineHeight: 1.6,
                        background: "transparent",
                        outline: "none",
                        border: `1px solid ${quickText.length >= 10 ? "var(--go)" : "var(--line)"}`,
                        padding: 14,
                        color: "var(--ink)",
                        resize: "none",
                        transition: "border-color .12s",
                      }}
                    />
                    {quickError && (
                      <p style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 11, color: "var(--kill)" }}>{quickError}</p>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <button
                        type="submit"
                        disabled={quickText.trim().length < 10 || quickStatus === "loading"}
                        className="db-btn-new"
                        style={{ opacity: quickText.trim().length < 10 || quickStatus === "loading" ? .45 : 1 }}
                      >
                        {quickStatus === "loading" ? "Analyzing…" : "Validate →"}
                      </button>
                      <span style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 9, color: "var(--faint)", letterSpacing: ".1em", textTransform: "uppercase" }}>
                        {quickText.length < 10 ? `${10 - quickText.length} chars min` : "ready"}
                      </span>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );

  // ── TEAM TAB ──
  const teamTab = tab === "team" && showTeamTab && (
    <>
      {!hasTeam && (
        <div className="bc" style={{ padding: "48px 28px", textAlign: "center" }}>
          <p style={{ fontFamily: "var(--font-bitter), Georgia, serif", fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
            No team yet.
          </p>
          <p style={{ fontSize: 13, color: "var(--dim)", marginBottom: 20, lineHeight: 1.65 }}>
            Create a team and invite colleagues in Settings → Team.
          </p>
          <Link href="/settings" className="db-btn-new">
            Go to Settings →
          </Link>
        </div>
      )}

      {hasTeam && (() => {
        const withVerdict = teamFeedRows.filter((r) => r.verdict);
        const goCount = teamFeedRows.filter((r) => r.verdict === "GO").length;
        const goRate = withVerdict.length > 0
          ? Math.round((goCount / withVerdict.length) * 100)
          : null;
        const memberCounts = teamFeedRows.reduce<
          Record<string, { initials: string; count: number }>
        >((acc, r) => {
          if (!acc[r.userId]) acc[r.userId] = { initials: r.memberInitials, count: 0 };
          acc[r.userId].count++;
          return acc;
        }, {});
        const mostActive = Object.values(memberCounts).sort((a, b) => b.count - a.count)[0] ?? null;
        const members = Object.entries(memberCounts).map(([uid, v]) => ({ uid, ...v }));
        const filteredFeed = teamFeedRows.filter((r) => {
          if (verdictFilter !== "all" && r.verdict !== verdictFilter) return false;
          if (memberFilter !== "all" && r.userId !== memberFilter) return false;
          return true;
        });

        return (
          <>
            {/* Team pulse stats */}
            <div className="stats-strip" style={{ marginBottom: 20, border: "1px solid var(--line)" }}>
              <div className="stats-i" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
                <div className="stat-cell">
                  <span className="stat-lbl">Total validations</span>
                  <div className="stat-val">{teamFeedRows.length}</div>
                </div>
                <div className="stat-cell">
                  <span className="stat-lbl">GO rate</span>
                  <div className="stat-val go">{goRate !== null ? `${goRate}%` : "—"}</div>
                </div>
                <div className="stat-cell">
                  <span className="stat-lbl">Pending</span>
                  <div className="stat-val">{teamFeedRows.filter((r) => !r.verdict).length}</div>
                </div>
                <div className="stat-cell">
                  <span className="stat-lbl">Most active</span>
                  {mostActive ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--ink)", color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-chivo-mono), monospace", fontSize: 9, fontWeight: 600, flexShrink: 0 }}>
                        {mostActive.initials}
                      </div>
                      <span style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 13, color: "var(--ink)", fontWeight: 600 }}>
                        {mostActive.count}
                      </span>
                    </div>
                  ) : (
                    <div className="stat-val">—</div>
                  )}
                </div>
              </div>
            </div>

            {/* Activity */}
            <div className="bc" style={{ marginBottom: 20 }}>
              <div className="bc-hd">
                Recent activity
                {teamActivityEvents.length > 0 && (
                  <span className="r">{teamActivityEvents.length} events</span>
                )}
              </div>
              <TeamActivityFeed events={teamActivityEvents} />
            </div>

            {/* Team feed */}
            <div className="bc">
              <div className="bc-hd">
                {teamName ?? "Team"} feed
                <span className="r">{filteredFeed.length} items</span>
              </div>
              {/* Filters */}
              <div style={{ display: "flex", gap: 8, padding: "8px 20px", borderBottom: "1px solid var(--line)", flexWrap: "wrap" }}>
                <select
                  value={verdictFilter}
                  onChange={(e) => setVerdictFilter(e.target.value)}
                  style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 10, padding: "4px 8px", border: "1px solid var(--line)", background: "transparent", color: "var(--dim)", outline: "none" }}
                >
                  <option value="all">All verdicts</option>
                  <option value="GO">GO</option>
                  <option value="KILL">KILL</option>
                  <option value="PIVOT">PIVOT</option>
                  <option value="">Pending</option>
                </select>
                {members.length > 1 && (
                  <select
                    value={memberFilter}
                    onChange={(e) => setMemberFilter(e.target.value)}
                    style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 10, padding: "4px 8px", border: "1px solid var(--line)", background: "transparent", color: "var(--dim)", outline: "none" }}
                  >
                    <option value="all">All members</option>
                    {members.map((m) => (
                      <option key={m.uid} value={m.uid}>{m.initials} ({m.count})</option>
                    ))}
                  </select>
                )}
              </div>
              {/* Feed rows */}
              {filteredFeed.length === 0 && (
                <div style={{ padding: "28px", textAlign: "center" }}>
                  <span style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 12, color: "var(--faint)" }}>
                    No validations match the current filters.
                  </span>
                </div>
              )}
              {filteredFeed.map((row) => {
                const vc = verdictClass(row.verdict);
                const rxn = reactionState[row.id] ?? row.reactions;
                return (
                  <div key={row.id} style={{ padding: "12px 20px", borderBottom: "1px solid var(--line-soft)", display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${row.isOwn ? "var(--go)" : "var(--line)"}`, background: row.isOwn ? "color-mix(in srgb, var(--go) 10%, transparent)" : "var(--bg)", color: row.isOwn ? "var(--go)" : "var(--dim)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-chivo-mono), monospace", fontSize: 9, fontWeight: 600, flexShrink: 0, marginTop: 2 }}>
                      {row.memberInitials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link href={`/ideas/${row.id}`} style={{ textDecoration: "none" }}>
                        <div style={{ fontFamily: "var(--font-bitter), Georgia, serif", fontSize: 13.5, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {row.text}
                        </div>
                      </Link>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                        <span style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 9, color: "var(--faint)" }}>
                          {shortDate(row.createdAt)}{row.isOwn ? " · you" : ""}
                        </span>
                        {row.score !== null && (
                          <span style={{ fontFamily: "var(--font-bitter), Georgia, serif", fontSize: 14, fontWeight: 700, color: vc ? `var(--${vc})` : "var(--ink)" }}>
                            {row.score}
                          </span>
                        )}
                        {row.verdict && (
                          <span style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 9, fontWeight: 600, color: vc ? `var(--${vc})` : "var(--faint)", letterSpacing: ".1em", textTransform: "uppercase" }}>
                            {row.verdict}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => handleReact(row.id, "agree")}
                        style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase", padding: "3px 8px", border: `1px solid ${rxn.myReaction === "agree" ? "rgba(26,106,60,.4)" : "var(--line)"}`, color: rxn.myReaction === "agree" ? "var(--go)" : "var(--faint)", background: rxn.myReaction === "agree" ? "var(--go-light)" : "transparent", cursor: "pointer", transition: "all .12s" }}
                      >
                        ↑ {rxn.agree > 0 ? rxn.agree : ""}
                      </button>
                      <button
                        onClick={() => handleReact(row.id, "disagree")}
                        style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase", padding: "3px 8px", border: `1px solid ${rxn.myReaction === "disagree" ? "rgba(158,42,26,.4)" : "var(--line)"}`, color: rxn.myReaction === "disagree" ? "var(--kill)" : "var(--faint)", background: rxn.myReaction === "disagree" ? "color-mix(in srgb, var(--kill) 8%, transparent)" : "transparent", cursor: "pointer", transition: "all .12s" }}
                      >
                        ↓ {rxn.disagree > 0 ? rxn.disagree : ""}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <TeamAnalytics rows={teamFeedRows} plan={plan} />
          </>
        );
      })()}
    </>
  );

  // ── PRIORITY TAB ──
  const priorityTab = tab === "priority" && (
    plan === "free" ? (
      <div className="bc" style={{ padding: "48px 28px", textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-bitter), Georgia, serif", fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
          Decision Queue
        </p>
        <p style={{ fontSize: 13, color: "var(--dim)", marginBottom: 20, lineHeight: 1.65 }}>
          Automatically surfaces which stale ideas need a decision. Available on Founder and above.
        </p>
        <Link href="/pricing" className="db-btn-new">
          Upgrade to Founder →
        </Link>
      </div>
    ) : (
      <DecisionQueueView variant="main" />
    )
  );

  return (
    <>
      {billingBanner}
      {tabs}
      {allTab}
      {teamTab}
      {priorityTab}
    </>
  );
}
