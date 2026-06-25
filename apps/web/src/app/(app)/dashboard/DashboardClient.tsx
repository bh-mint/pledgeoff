"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/auth-client";
import { TeamAnalytics } from "@/components/TeamAnalytics";
import { TeamActivityFeed } from "@/components/TeamActivityFeed";
import { SignalFeed } from "@/components/SignalFeed";
import type { Plan } from "@pledgeoff/core";
import type { TeamActivityEvent } from "@/server/team/getTeamActivity";
import type { SignalFeedNiche } from "@/app/api/v1/signal-feed/route";

export type ToolStatus = {
  simulate: boolean;
  landing: boolean;
  customers: boolean;
  build: boolean;
  competitors: boolean;
  launch_kit: boolean;
  features: boolean;
  battlecard: boolean;
  market_landscape: boolean;
};

export type TableRow = {
  id: string;
  text: string;
  createdAt: string;
  score: number | null;
  verdict: string | null;
  status: "pending" | "validated" | "killed" | "pivoting";
  tools: ToolStatus;
  category: string | null;
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

type FilterKey = "all" | "action" | "go" | "pivot" | "kill";

type AttnItem =
  | { kind: "pending"; id: string; text: string; date: string }
  | { kind: "stale"; id: string; text: string; age: string }
  | { kind: "outcome"; id: string; text: string; verdict: string; age: string };

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function getAge(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function verdictClass(v: string | null): string {
  if (v === "GO") return "go";
  if (v === "KILL") return "kill";
  if (v === "PIVOT") return "pivot";
  return "pending";
}

function getNextMonthReset(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

function getCurrentDate(): string {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface DashboardClientProps {
  rows: TableRow[];
  totalCount: number;
  ownCount: number;
  teamFeedRows?: TeamFeedRow[];
  teamActivityEvents?: TeamActivityEvent[];
  teamName?: string | null;
  teamId?: string | null;
  plan?: Plan;
  isWorkspace?: boolean;
  usedThisMonth: number;
  monthLimit: number | null;
  builtCount: number;
  signalFeedData: { data: SignalFeedNiche[]; locked: boolean };
}

export function DashboardClient({
  rows,
  totalCount,
  ownCount,
  teamFeedRows = [],
  teamActivityEvents = [],
  teamName,
  teamId,
  plan = "free",
  isWorkspace = false,
  usedThisMonth,
  monthLimit,
  builtCount,
  signalFeedData,
}: DashboardClientProps) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [tab, setTab] = useState<"brief" | "team">("brief");
  const [showBillingBanner, setShowBillingBanner] = useState(() =>
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("billing") === "success"
      : false
  );
  const [verdictFilter, setVerdictFilter] = useState<string>("all");
  const [memberFilter, setMemberFilter] = useState<string>("all");
  const [reactionState, setReactionState] = useState<Record<string, TeamFeedRow["reactions"]>>(
    () => Object.fromEntries(teamFeedRows.map((r) => [r.id, r.reactions]))
  );
  const hasTeam = !!teamId;
  const isPaid = plan !== "free";
  const showTeamTab = isPaid;
  const router = useRouter();

  useEffect(() => {
    if (!showBillingBanner) return;
    const t = setTimeout(() => setShowBillingBanner(false), 5000);
    return () => clearTimeout(t);
  }, [showBillingBanner]);

  // ── Own rows stats ──
  const ownRows = useMemo(() => rows.filter((r) => r.isOwn), [rows]);
  const ownWithVerdict = useMemo(() => ownRows.filter((r) => r.verdict !== null), [ownRows]);
  const ownGoCount = useMemo(() => ownRows.filter((r) => r.verdict === "GO").length, [ownRows]);
  const ownGoRate = useMemo(
    () => (ownWithVerdict.length > 0 ? Math.round((ownGoCount / ownWithVerdict.length) * 100) : 0),
    [ownGoCount, ownWithVerdict]
  );
  const ownAvgScore = useMemo(() => {
    const scores = ownWithVerdict.map((r) => r.score).filter((s): s is number => s !== null);
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  }, [ownWithVerdict]);

  const staleCount = useMemo(
    () => rows.filter((r) => r.isOwn && r.signalsStale).length,
    [rows]
  );

  // ── Intelligence notes (computed from existing data, no API) ──
  type IntelNote = { lbl: string; val: string; valCls?: string; sub: string };
  const intelNotes = useMemo((): IntelNote[] => {
    if (ownRows.length === 0) return [];
    const notes: IntelNote[] = [];

    if (ownWithVerdict.length >= 2) {
      const valCls = ownGoRate >= 60 ? "go" : ownGoRate <= 30 ? "pivot" : undefined;
      notes.push({
        lbl: "Conviction rate",
        val: `${ownGoRate}%`,
        valCls,
        sub: ownGoRate >= 60
          ? `${ownGoCount} of ${ownWithVerdict.length} ideas cleared the bar`
          : `${ownGoCount} GO of ${ownWithVerdict.length} verdicts · refine to improve signal`,
      });
    } else if (ownWithVerdict.length === 1) {
      notes.push({ lbl: "Conviction rate", val: "1 verdict in", sub: "More surveys sharpen pattern clarity" });
    }

    if (staleCount > 0) {
      notes.push({
        lbl: "Signal currency",
        val: `${staleCount} stale`,
        valCls: "pivot",
        sub: "Market conditions shift — revalidation keeps verdicts accurate",
      });
    } else if (ownWithVerdict.length > 0) {
      notes.push({ lbl: "Signal currency", val: "All current", valCls: "go", sub: "Verdicts reflect recent market conditions" });
    }

    if (builtCount > 0) {
      notes.push({ lbl: "Outcome loop", val: `${builtCount} shipped`, sub: "Reported outcomes sharpen future verdict calibration" });
    } else if (ownGoCount >= 2) {
      notes.push({ lbl: "Outcome loop", val: `${ownGoCount} GO ideas`, sub: "Report what happened — close the loop for better calibration" });
    }

    return notes;
  }, [ownRows, ownWithVerdict, ownGoCount, ownGoRate, staleCount, builtCount]);

  // ── Attention items ──
  const attnItems = useMemo((): AttnItem[] => {
    const items: AttnItem[] = [];
    rows
      .filter((r) => r.isOwn && r.status === "pending")
      .forEach((r) => items.push({ kind: "pending", id: r.id, text: r.text, date: shortDate(r.createdAt) }));
    rows
      .filter((r) => r.isOwn && r.signalsStale && !r.needsOutcome && !r.outcomeType)
      .forEach((r) => items.push({ kind: "stale", id: r.id, text: r.text, age: getAge(r.createdAt) }));
    rows
      .filter((r) => r.needsOutcome)
      .forEach((r) =>
        items.push({ kind: "outcome", id: r.id, text: r.text, verdict: r.verdict ?? "—", age: getAge(r.createdAt) })
      );
    return items;
  }, [rows]);

  // ── Masthead copy ──
  const { mastheadLine1, mastheadLine2, accentClass, mastheadSub } = useMemo(() => {
    const pending = attnItems.filter((a) => a.kind === "pending");
    const n = attnItems.length;
    if (pending.length > 0) {
      const outc = n - pending.length;
      return {
        mastheadLine1: pending.length === 1 ? "One survey is" : `${pending.length} surveys are`,
        mastheadLine2: "still in the field.",
        accentClass: "accent",
        mastheadSub: outc > 0
          ? `Results land shortly. ${outc} filed case${outc > 1 ? "s" : ""} also need a decision below.`
          : "Results land in a few seconds. Everything else is filed and clean.",
      };
    }
    if (n >= 2) {
      const outc = attnItems.filter((a) => a.kind === "outcome").length;
      const stale = attnItems.filter((a) => a.kind === "stale").length;
      const bits: string[] = [];
      if (outc) bits.push(`${outc} verdict${outc > 1 ? "s have" : " has"} gone quiet`);
      if (stale) bits.push(`${stale} survey${stale > 1 ? "'s signals are" : "'s signals are"} a week old`);
      return {
        mastheadLine1: n === 2 ? "Two decisions are" : `${n} decisions are`,
        mastheadLine2: "waiting on you.",
        accentClass: "accent pivot",
        mastheadSub: bits.join(" and ").replace(/^./, (c) => c.toUpperCase()) + ". Everything else is filed and clean.",
      };
    }
    if (n === 1) {
      const a = attnItems[0]!;
      return {
        mastheadLine1: "One decision is",
        mastheadLine2: "waiting on you.",
        accentClass: "accent pivot",
        mastheadSub:
          a.kind === "outcome"
            ? "A verdict has gone quiet. Tell us what happened to sharpen future calls."
            : "Survey signals are a week old. The market may have moved — revalidate.",
      };
    }
    return {
      mastheadLine1: "Your brief is",
      mastheadLine2: "all clear.",
      accentClass: "accent",
      mastheadSub: "Nothing needs a decision today. Good time to open a new case.",
    };
  }, [attnItems]);

  // ── Quota segments ──
  const quotaSegments = useMemo(() => {
    if (monthLimit === null) return [];
    const segCount = Math.min(monthLimit, 20);
    const rem = monthLimit - usedThisMonth;
    const low = rem <= 2;
    const usedSegs = Math.round((usedThisMonth / monthLimit) * segCount);
    return Array.from({ length: segCount }, (_, i) => ({ used: i < usedSegs, low }));
  }, [monthLimit, usedThisMonth]);

  // ── Filter counts ──
  const actionCount = useMemo(() => rows.filter((r) => r.needsOutcome || r.signalsStale).length, [rows]);
  const filterGoCount = useMemo(() => rows.filter((r) => r.verdict === "GO").length, [rows]);
  const filterPivotCount = useMemo(() => rows.filter((r) => r.verdict === "PIVOT").length, [rows]);
  const filterKillCount = useMemo(() => rows.filter((r) => r.verdict === "KILL").length, [rows]);

  const filteredCases = useMemo(() => {
    if (filter === "action") return rows.filter((r) => r.needsOutcome || r.signalsStale);
    if (filter === "go") return rows.filter((r) => r.verdict === "GO");
    if (filter === "pivot") return rows.filter((r) => r.verdict === "PIVOT");
    if (filter === "kill") return rows.filter((r) => r.verdict === "KILL");
    return rows;
  }, [rows, filter]);

  const filterLabel = {
    all: "Case files",
    action: "Needs action",
    go: "GO verdicts",
    pivot: "PIVOT verdicts",
    kill: "KILL verdicts",
  }[filter];

  // ── Team feed ──
  const teamMemberCounts = useMemo(
    () =>
      teamFeedRows.reduce<Record<string, { initials: string; count: number }>>((acc, r) => {
        if (!acc[r.userId]) acc[r.userId] = { initials: r.memberInitials, count: 0 };
        acc[r.userId].count++;
        return acc;
      }, {}),
    [teamFeedRows]
  );
  const teamMembers = useMemo(
    () => Object.entries(teamMemberCounts).map(([uid, v]) => ({ uid, ...v })),
    [teamMemberCounts]
  );

  const filteredTeamFeed = useMemo(
    () =>
      teamFeedRows.filter((r) => {
        if (verdictFilter !== "all" && r.verdict !== verdictFilter) return false;
        if (memberFilter !== "all" && r.userId !== memberFilter) return false;
        return true;
      }),
    [teamFeedRows, verdictFilter, memberFilter]
  );

  const handleReact = useCallback(
    async (ideaId: string, reaction: "agree" | "disagree") => {
      const current = reactionState[ideaId];
      const newReaction = current?.myReaction === reaction ? null : reaction;
      const token = await getAuthToken();
      const res = await fetch(`/api/v1/ideas/${ideaId}/reactions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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

  const [quickText, setQuickText] = useState("");
  const [quickStatus, setQuickStatus] = useState<"idle" | "loading" | "error">("idle");
  const [quickError, setQuickError] = useState("");

  const handleQuickValidate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (quickText.trim().length < 10) return;
    setQuickStatus("loading");
    setQuickError("");
    const token = await getAuthToken();
    if (!token) { router.push("/login"); return; }
    const res = await fetch("/api/v1/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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

  // ── Case row ──
  function caseRow(row: TableRow) {
    const vc = verdictClass(row.verdict);
    const toolKeys: (keyof ToolStatus)[] = ["customers", "competitors", "build", "simulate", "landing", "launch_kit", "features", "battlecard", "market_landscape"];
    const runCount = toolKeys.filter((k) => row.tools[k]).length;
    return (
      <Link key={row.id} href={`/ideas/${row.id}`} className={`db-case ${vc}`}>
        <div className="db-c-score">
          <span className={`db-c-num ${vc}`}>
            {row.score !== null ? row.score : <span style={{ fontFamily: "var(--font-chivo-mono),monospace", fontSize: 14, lineHeight: 1 }}>···</span>}
          </span>
          <span className={`db-c-vchip ${vc}`}>
            {row.verdict === "GO" ? "● GO" : row.verdict === "PIVOT" ? "▲ PIVOT" : row.verdict === "KILL" ? "✕ KILL" : "pending"}
          </span>
        </div>
        <div className="db-c-main">
          <div className="db-c-title">{row.text.slice(0, 100)}{row.text.length > 100 ? "…" : ""}</div>
          <div className="db-c-meta">
            {row.category && <span className="db-c-mi">{row.category}</span>}
            <span className="db-c-mi">{shortDate(row.createdAt)}</span>
            {!row.isOwn && row.memberInitials && (
              <span className="db-c-mi" title="Team idea">{row.memberInitials}</span>
            )}
          </div>
          {(row.needsOutcome || row.signalsStale || row.outcomeType) && (
            <div className="db-c-flags">
              {row.needsOutcome && <span className="db-c-flag outcome">◷ Needs outcome</span>}
              {row.signalsStale && !row.needsOutcome && <span className="db-c-flag stale">↻ Signals stale</span>}
              {row.outcomeType === "built_worked" && <span className="db-c-flag built-go">Built ✓ Worked</span>}
              {row.outcomeType === "built_failed" && <span className="db-c-flag built-kill">Built ✗ Failed</span>}
              {row.outcomeType === "not_built" && <span className="db-c-flag not-built">Not built</span>}
            </div>
          )}
        </div>
        <div className="db-c-tools">
          <div className="db-c-tools-lbl"><span>Tools</span><b>{runCount}/6</b></div>
          <div className="db-c-meter">
            {toolKeys.map((k) => <div key={k} className={`db-c-seg${row.tools[k] ? " run" : ""}`} />)}
          </div>
        </div>
        <div className="db-c-date">{shortDate(row.createdAt)}</div>
        <div className="db-c-arrow">→</div>
      </Link>
    );
  }

  // ── Attention card ──
  function attnCard(item: AttnItem, i: number) {
    if (item.kind === "pending") {
      return (
        <div key={i} className="db-attn pending">
          <div className="db-attn-top">
            <span className="db-attn-flag"><span className="db-attn-dot" />In the field</span>
            <span className="db-attn-age">{item.date}</span>
          </div>
          <div className="db-attn-body">
            <div className="db-attn-idea">{item.text.slice(0, 80)}{item.text.length > 80 ? "…" : ""}</div>
            <div className="db-attn-why">Survey running — fetching signals across five sources.</div>
          </div>
          <div className="db-attn-foot">
            <Link href={`/ideas/${item.id}`} className="db-attn-cta">Watch live →</Link>
          </div>
        </div>
      );
    }
    if (item.kind === "outcome") {
      return (
        <div key={i} className="db-attn">
          <div className="db-attn-top">
            <span className="db-attn-flag"><span style={{ fontSize: 9 }}>◷</span>Needs outcome</span>
            <span className="db-attn-age">{item.age}</span>
          </div>
          <div className="db-attn-body">
            <div className="db-attn-idea">{item.text.slice(0, 80)}{item.text.length > 80 ? "…" : ""}</div>
            <div className="db-attn-why">Verdict was <strong>{item.verdict}</strong> {item.age}. Tell us what happened to sharpen future calls.</div>
          </div>
          <div className="db-attn-foot">
            <Link href={`/ideas/${item.id}`} className="db-attn-cta">Report outcome →</Link>
            <Link href={`/ideas/${item.id}`} className="db-attn-cta ghost">Open case</Link>
          </div>
        </div>
      );
    }
    return (
      <div key={i} className="db-attn stale">
        <div className="db-attn-top">
          <span className="db-attn-flag"><span>↻</span>Signals stale</span>
          <span className="db-attn-age">{item.age}</span>
        </div>
        <div className="db-attn-body">
          <div className="db-attn-idea">{item.text.slice(0, 80)}{item.text.length > 80 ? "…" : ""}</div>
          <div className="db-attn-why">Signals are {item.age} old. The market may have moved — revalidate to refresh the verdict.</div>
        </div>
        <div className="db-attn-foot">
          <Link href={`/ideas/${item.id}`} className="db-attn-cta">Revalidate →</Link>
          <Link href={`/ideas/${item.id}`} className="db-attn-cta ghost">Open case</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Billing banner */}
      {showBillingBanner && (
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
      )}

      {/* Tab bar (Team+ only) */}
      {showTeamTab && (
        <div className="db-view-tabs" style={{ marginBottom: 0 }}>
          <div className="db-vtabs-left">
            <button className={`db-vtab${tab === "brief" ? " on" : ""}`} onClick={() => setTab("brief")}>
              Brief <span className="db-vtab-badge">{totalCount}</span>
            </button>
            <button className={`db-vtab${tab === "team" ? " on" : ""}`} onClick={() => setTab("team")}>
              Team <span className="db-vtab-plus">Team+</span>
            </button>
          </div>
          <div className="db-vtabs-right">
            <Link href="/ideas/new" className="btn-xs p">New survey →</Link>
          </div>
        </div>
      )}

      {/* ── BRIEF VIEW ── */}
      {tab === "brief" && (
        <div className="db-brief-shell">
          {/* Masthead */}
          <div className="db-mh">
            <div>
              <div className="db-mh-eyebrow">
                <span className="db-mh-dot" />
                Field Intelligence Brief
                <span className="db-mh-sep" />
                <span>{getCurrentDate()}</span>
              </div>
              <h1 className="db-mh-title">
                {mastheadLine1}<br />
                <span className={accentClass}>{mastheadLine2}</span>
              </h1>
              <p className="db-mh-sub">{mastheadSub}</p>
            </div>

            {/* Quota card */}
            {monthLimit !== null && (
              <div className="db-quota">
                <div className="db-quota-hd">
                  <span>Validations</span>
                  <span className="db-quota-r">
                    {new Date().toLocaleDateString("en-GB", { month: "long" })} cycle
                  </span>
                </div>
                <div className="db-quota-bd">
                  <div className="db-quota-main">
                    <span className="db-quota-num">{usedThisMonth}</span>
                    <span className="db-quota-den">/ {monthLimit}</span>
                    <span className="db-quota-unit">used</span>
                  </div>
                  <div className="db-quota-bar">
                    {quotaSegments.map((s, i) => (
                      <div key={i} className={`db-quota-seg${s.used ? " used" : ""}${s.used && s.low ? " low" : ""}`} />
                    ))}
                  </div>
                  <div className="db-quota-foot">
                    <span className="db-quota-rem">
                      <b>{Math.max(0, monthLimit - usedThisMonth)}</b> left · resets {getNextMonthReset()}
                    </span>
                  </div>
                  {plan === "free" && (
                    <Link className="db-quota-up" href="/pricing">Upgrade plan →</Link>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Ledger strip */}
          <div className="db-ledger">
            <div className="db-led-cell">
              <span className="db-led-k">Ideas validated</span>
              <div className="db-led-v">{ownCount}</div>
              <div className="db-led-sub">All time</div>
            </div>
            <div className="db-led-cell">
              <span className="db-led-k">GO rate</span>
              <div className="db-led-v go">{ownGoRate}<em>%</em></div>
              <div className="db-led-sub">{ownGoCount} of {ownWithVerdict.length} cleared</div>
            </div>
            <div className="db-led-cell">
              <span className="db-led-k">Avg score</span>
              <div className="db-led-v">{ownAvgScore ?? "—"}</div>
              <div className="db-led-sub">Across verdicts</div>
            </div>
            <div className="db-led-cell">
              <span className="db-led-k">Built & shipped</span>
              <div className="db-led-v">{builtCount}</div>
              <div className="db-led-sub">Outcome reported</div>
            </div>
          </div>

          {/* Intelligence Notes */}
          {intelNotes.length > 0 && (
            <div className="db-intel">
              <div className="db-intel-hd">Intelligence Notes</div>
              <div className="db-intel-notes">
                {intelNotes.map((n) => (
                  <div key={n.lbl} className="db-intel-note">
                    <span className="db-intel-lbl">{n.lbl}</span>
                    <div className={`db-intel-val${n.valCls ? ` ${n.valCls}` : ""}`}>{n.val}</div>
                    <div className="db-intel-sub">{n.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main grid */}
          <div className="db-brief-grid">
            <main className="db-brief-col">

              {/* Attention module */}
              {attnItems.length > 0 && (
                <div className="db-attn-wrap">
                  <div className="db-sec-head">
                    <span className="db-sec-title">Requires a decision</span>
                    <span className="db-sec-count alert">{attnItems.length}</span>
                    <span className="db-sec-rule" />
                  </div>
                  <div className="db-attn-grid">
                    {attnItems.map((item, i) => attnCard(item, i))}
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="db-brief-filters">
                {(["all", "action", "go", "pivot", "kill"] as FilterKey[]).map((f) => {
                  const count =
                    f === "all" ? totalCount
                    : f === "action" ? actionCount
                    : f === "go" ? filterGoCount
                    : f === "pivot" ? filterPivotCount
                    : filterKillCount;
                  return (
                    <button
                      key={f}
                      className={`db-filt${filter === f ? " on" : ""}`}
                      onClick={() => setFilter(f)}
                    >
                      {f === "action" ? "Needs action" : f === "all" ? "All" : f.toUpperCase()}
                      <span className="db-fc">{count}</span>
                    </button>
                  );
                })}
                <span className="db-filt-grow" />
              </div>

              {/* Case files */}
              <div className="db-cases">
                <div className="db-cases-hd">
                  <span>{filterLabel}</span>
                  <span className="db-cases-sub">{plan} · {ownCount} total</span>
                </div>
                {filteredCases.map((row) => caseRow(row))}
                {filteredCases.length === 0 && (
                  <div style={{ padding: "30px 20px", textAlign: "center", fontFamily: "var(--font-chivo-mono), monospace", fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--faint)" }}>
                    No cases in this view
                  </div>
                )}
              </div>

              {/* Empty — no ideas yet: quick validate */}
              {rows.length === 0 && (
                <div style={{ maxWidth: 480, margin: "32px auto 0" }}>
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
                      style={{ fontFamily: "var(--font-bitter), Georgia, serif", fontSize: 14, lineHeight: 1.6, background: "transparent", outline: "none", border: `1px solid ${quickText.length >= 10 ? "var(--go)" : "var(--line)"}`, padding: 14, color: "var(--ink)", resize: "none", transition: "border-color .12s" }}
                    />
                    {quickError && <p style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 11, color: "var(--kill)" }}>{quickError}</p>}
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <button type="submit" disabled={quickText.trim().length < 10 || quickStatus === "loading"} className="btn-xs p" style={{ opacity: quickText.trim().length < 10 || quickStatus === "loading" ? .45 : 1 }}>
                        {quickStatus === "loading" ? "Analyzing…" : "Validate →"}
                      </button>
                      <span style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 9, color: "var(--faint)", letterSpacing: ".1em", textTransform: "uppercase" }}>
                        {quickText.length < 10 ? `${10 - quickText.length} chars min` : "ready"}
                      </span>
                    </div>
                  </form>
                </div>
              )}

              {!showTeamTab && (
                <div style={{ marginTop: 20, textAlign: "right" }}>
                  <Link href="/ideas/new" className="btn-xs p">New survey →</Link>
                </div>
              )}
            </main>

            {/* Right rail */}
            <aside className="db-brief-rail">
              <div className="db-rail-card">
                <div className="db-rail-hd">
                  Signal Feed
                  <span className="db-rail-r">
                    {signalFeedData.locked ? "Team+" : <><span className="db-live-dot" />Live</>}
                  </span>
                </div>
                <SignalFeed niches={signalFeedData.data} locked={signalFeedData.locked} />
              </div>

              {teamActivityEvents.length > 0 && (
                <div className="db-rail-card">
                  <div className="db-rail-hd">Activity</div>
                  <TeamActivityFeed events={teamActivityEvents.slice(0, 6)} />
                </div>
              )}
            </aside>
          </div>
        </div>
      )}

      {/* ── TEAM VIEW ── */}
      {tab === "team" && showTeamTab && (
        <div className="db-brief-shell">
          {!hasTeam ? (
            <div className="bc" style={{ padding: "48px 28px", textAlign: "center" }}>
              <p style={{ fontFamily: "var(--font-bitter), Georgia, serif", fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>No team yet.</p>
              <p style={{ fontSize: 13, color: "var(--dim)", marginBottom: 20, lineHeight: 1.65 }}>Create a team and invite colleagues in Settings → Team.</p>
              <Link href="/settings" className="btn-xs p">Go to Settings →</Link>
            </div>
          ) : (() => {
            const withVerdict = teamFeedRows.filter((r) => r.verdict);
            const goC = teamFeedRows.filter((r) => r.verdict === "GO").length;
            const goR = withVerdict.length > 0 ? Math.round((goC / withVerdict.length) * 100) : null;
            const mostActive = Object.values(teamMemberCounts).sort((a, b) => b.count - a.count)[0] ?? null;

            return (
              <>
                {/* Team pulse stats */}
                <div className="stats-strip" style={{ marginBottom: 20, border: "1px solid var(--line)" }}>
                  <div className="stats-i" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
                    <div className="stat-cell"><span className="stat-lbl">Total validations</span><div className="stat-val">{teamFeedRows.length}</div></div>
                    <div className="stat-cell"><span className="stat-lbl">GO rate</span><div className="stat-val go">{goR !== null ? `${goR}%` : "—"}</div></div>
                    <div className="stat-cell"><span className="stat-lbl">Pending</span><div className="stat-val">{teamFeedRows.filter((r) => !r.verdict).length}</div></div>
                    <div className="stat-cell">
                      <span className="stat-lbl">Most active</span>
                      {mostActive ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--ink)", color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-chivo-mono), monospace", fontSize: 9, fontWeight: 600, flexShrink: 0 }}>
                            {mostActive.initials}
                          </div>
                          <span style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 13, color: "var(--ink)", fontWeight: 600 }}>{mostActive.count}</span>
                        </div>
                      ) : <div className="stat-val">—</div>}
                    </div>
                  </div>
                </div>

                {/* Activity */}
                <div className="bc" style={{ marginBottom: 20 }}>
                  <div className="bc-hd">Recent activity{teamActivityEvents.length > 0 && <span className="r">{teamActivityEvents.length} events</span>}</div>
                  <TeamActivityFeed events={teamActivityEvents} />
                </div>

                {/* Team feed grouped by member */}
                <div className="bc">
                  <div className="bc-hd">
                    {isWorkspace && teamName ? `${teamName} feed` : "Team feed"}
                    <span className="r">{filteredTeamFeed.length} items</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, padding: "8px 20px", borderBottom: "1px solid var(--line)", flexWrap: "wrap" }}>
                    <select value={verdictFilter} onChange={(e) => setVerdictFilter(e.target.value)} style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 10, padding: "4px 8px", border: "1px solid var(--line)", background: "transparent", color: "var(--dim)", outline: "none" }}>
                      <option value="all">All verdicts</option>
                      <option value="GO">GO</option>
                      <option value="KILL">KILL</option>
                      <option value="PIVOT">PIVOT</option>
                      <option value="">Pending</option>
                    </select>
                    {teamMembers.length > 1 && (
                      <select value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)} style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 10, padding: "4px 8px", border: "1px solid var(--line)", background: "transparent", color: "var(--dim)", outline: "none" }}>
                        <option value="all">All members</option>
                        {teamMembers.map((m) => <option key={m.uid} value={m.uid}>{m.initials} ({m.count})</option>)}
                      </select>
                    )}
                  </div>
                  {filteredTeamFeed.length === 0 && (
                    <div style={{ padding: "28px", textAlign: "center" }}>
                      <span style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 12, color: "var(--faint)" }}>No validations match the current filters.</span>
                    </div>
                  )}
                  {teamMembers
                    .filter((m) => memberFilter === "all" || m.uid === memberFilter)
                    .map((member) => {
                      const memberRows = filteredTeamFeed.filter((r) => r.userId === member.uid);
                      if (memberRows.length === 0) return null;
                      const isYou = memberRows[0]?.isOwn ?? false;
                      return (
                        <div key={member.uid}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", background: "color-mix(in srgb, var(--line) 30%, transparent)", borderBottom: "1px solid var(--line)" }}>
                            <div style={{ width: 26, height: 26, borderRadius: "50%", border: `1px solid ${isYou ? "var(--go)" : "var(--line)"}`, background: isYou ? "color-mix(in srgb, var(--go) 10%, transparent)" : "var(--bg)", color: isYou ? "var(--go)" : "var(--dim)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-chivo-mono), monospace", fontSize: 8, fontWeight: 600, flexShrink: 0 }}>
                              {member.initials}
                            </div>
                            <span style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 10, fontWeight: 600, color: "var(--dim)", letterSpacing: ".06em" }}>
                              {member.initials}{isYou ? " · you" : ""}
                            </span>
                            <span style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 9, color: "var(--faint)", marginLeft: "auto" }}>
                              {memberRows.length} {memberRows.length === 1 ? "idea" : "ideas"}
                            </span>
                          </div>
                          {memberRows.map((row) => {
                            const vc = verdictClass(row.verdict);
                            const rxn = reactionState[row.id] ?? row.reactions;
                            return (
                              <div key={row.id} style={{ padding: "12px 20px", borderBottom: "1px solid var(--line-soft)", display: "flex", gap: 12, alignItems: "flex-start" }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <Link href={`/ideas/${row.id}`} style={{ textDecoration: "none" }}>
                                    <div style={{ fontFamily: "var(--font-bitter), Georgia, serif", fontSize: 13.5, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.text}</div>
                                  </Link>
                                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                                    <span style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 9, color: "var(--faint)" }}>{shortDate(row.createdAt)}</span>
                                    {row.score !== null && <span style={{ fontFamily: "var(--font-bitter), Georgia, serif", fontSize: 14, fontWeight: 700, color: vc ? `var(--${vc})` : "var(--ink)" }}>{row.score}</span>}
                                    {row.verdict && <span style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 9, fontWeight: 600, color: vc ? `var(--${vc})` : "var(--faint)", letterSpacing: ".1em", textTransform: "uppercase" }}>{row.verdict}</span>}
                                  </div>
                                </div>
                                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                                  <button onClick={() => handleReact(row.id, "agree")} style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase", padding: "3px 8px", border: `1px solid ${rxn.myReaction === "agree" ? "rgba(26,106,60,.4)" : "var(--line)"}`, color: rxn.myReaction === "agree" ? "var(--go)" : "var(--faint)", background: rxn.myReaction === "agree" ? "var(--go-light)" : "transparent", cursor: "pointer", transition: "all .12s" }}>
                                    ↑ {rxn.agree > 0 ? rxn.agree : ""}
                                  </button>
                                  <button onClick={() => handleReact(row.id, "disagree")} style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase", padding: "3px 8px", border: `1px solid ${rxn.myReaction === "disagree" ? "rgba(158,42,26,.4)" : "var(--line)"}`, color: rxn.myReaction === "disagree" ? "var(--kill)" : "var(--faint)", background: rxn.myReaction === "disagree" ? "color-mix(in srgb, var(--kill) 8%, transparent)" : "transparent", cursor: "pointer", transition: "all .12s" }}>
                                    ↓ {rxn.disagree > 0 ? rxn.disagree : ""}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                </div>

                <TeamAnalytics rows={teamFeedRows} plan={plan} />
              </>
            );
          })()}
        </div>
      )}
    </>
  );
}
