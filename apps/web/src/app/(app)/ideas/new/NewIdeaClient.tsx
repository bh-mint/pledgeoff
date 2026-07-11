"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { SignalSource } from "@pledgeoff/core";
import { getAuthToken } from "@/lib/auth-client";
import { takeGuestDraft } from "@/lib/guest-draft";
import { usePrefersReducedMotion } from "@/lib/motion";
import { useUpgradeModal } from "@/components/UpgradeModal";

// ─── Static data ────────────────────────────────────────

const CATEGORIES = [
  { key: "ai_ml", label: "AI & ML" },
  { key: "dev_tools", label: "Dev Tools" },
  { key: "saas_b2b", label: "SaaS / B2B" },
  { key: "fintech", label: "Fintech" },
  { key: "ecommerce", label: "E-commerce" },
  { key: "health", label: "Health" },
  { key: "edtech", label: "Education" },
  { key: "productivity", label: "Productivity" },
  { key: "marketing", label: "Marketing" },
  { key: "security", label: "Security" },
  { key: "gaming", label: "Gaming" },
  { key: "social", label: "Social" },
  { key: "data", label: "Data & Analytics" },
  { key: "nocode", label: "No-code" },
  { key: "other", label: "Other" },
] as const;

type CatKey = (typeof CATEGORIES)[number]["key"];

// Everything shown during the analysis is real: signals, counts, dimensions
// and the verdict come from polling the idea endpoint while the pipeline runs.
// The only staged part is the choreography (sweep timing, flap churn).

const SOURCE_GROUPS: { label: string; sources: readonly SignalSource[] }[] = [
  { label: "Reddit · Web", sources: ["brave", "reddit", "google"] },
  { label: "GitHub", sources: ["github"] },
  { label: "Hacker News · Dev.to", sources: ["hn", "devto", "producthunt"] },
  { label: "Reviews · News · Jobs", sources: ["reviews", "news", "jobs"] },
];

const SRC_SHORT: Record<SignalSource, string> = {
  reddit: "RD", brave: "RD", google: "WB", github: "GH", hn: "HN",
  producthunt: "PH", devto: "DT", reviews: "RV", news: "NW", jobs: "JB",
};

const PROCESS_LINES = [
  "Case opened — survey dispatched to live sources",
  "Sweeping discussions, repos and posts for evidence…",
  "Deduplicating hits · scoring relevance against your idea…",
  "Weighing evidence across the four dimensions…",
];

const DIM_NAMES = ["Market Demand", "Competition", "Feasibility", "Timing"];

const POLL_MS = 3500;
const POLL_TIMEOUT_MS = 120_000;
const THEATER_MIN_MS = 12_000;

function scoreCls(score: number): "go" | "watch" | "kill" {
  return score >= 75 ? "go" : score >= 50 ? "watch" : "kill";
}

const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ·▪◆";
const TOTAL_MS = 15000;
function rndC() { return CHARS[Math.floor(Math.random() * CHARS.length)] ?? "·"; }

// ─── Types ───────────────────────────────────────────────

type SrcStatus = "queued" | "scanning" | "done";

interface SrcState {
  pct: number;
  status: SrcStatus;
  showCount: boolean;
  dur: string;
  count: number;
}

interface SigItem {
  id: number;
  fl: "p" | "u" | "n";
  src: string;
  txt: string;
  faded: boolean;
}

interface LiveSignal {
  source: SignalSource;
  title: string;
  sentiment: "positive" | "negative" | "neutral";
}

interface LiveDecision {
  verdict: "GO" | "PIVOT" | "KILL";
  score: number;
  confidence: number;
  dimensions: { name: string; score: number; weight: number }[];
}

interface LiveDim {
  name: string;
  pct: number;
  cls: "go" | "watch" | "kill" | "";
}

// ─── Component ───────────────────────────────────────────

export function NewIdeaClient({
  validationsLeft,
  teamId,
  teamName,
  allowedSources,
}: {
  validationsLeft: number;
  teamId?: string | null;
  teamName?: string | null;
  /** Signal sources the user's plan actually queries; null = all sources. */
  allowedSources?: SignalSource[] | null;
}) {
  const router = useRouter();
  const { openQuotaModal } = useUpgradeModal();
  const reduced = usePrefersReducedMotion();
  const searchParams = useSearchParams();
  const fromId = searchParams.get("from");

  // Form state
  const [text, setText] = useState("");
  const [cat, setCat] = useState<CatKey | null>(null);
  const [context, setContext] = useState<"personal" | "team">("personal");
  const [founderContext, setFounderContext] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [showTextErr, setShowTextErr] = useState(false);
  const [showCatErr, setShowCatErr] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Screen
  const [screen, setScreen] = useState<"form" | "analysis">("form");
  const [ideaId, setIdeaId] = useState<string | null>(null);

  // Source groups the user's plan actually queries
  const groups = useMemo(
    () =>
      SOURCE_GROUPS.filter(
        (g) => !allowedSources || g.sources.some((s) => allowedSources.includes(s))
      ),
    [allowedSources]
  );

  // Analysis animation state
  const [flap, setFlap] = useState(["·", "·", "·", "·"]);
  const [locked, setLocked] = useState<{ digits: string[]; letters: string[]; cls: "go" | "pivot" | "kill" } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(0);
  const [srcState, setSrcState] = useState<SrcState[]>(
    groups.map(() => ({ pct: 0, status: "queued" as SrcStatus, showCount: false, dur: "0s", count: 0 }))
  );
  const [sigItems, setSigItems] = useState<SigItem[]>([]);
  const [sigTotal, setSigTotal] = useState(0);
  const [liveDims, setLiveDims] = useState<LiveDim[]>(DIM_NAMES.map((n) => ({ name: n, pct: 0, cls: "" })));
  const [showAnStatus, setShowAnStatus] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isDoneVisible, setIsDoneVisible] = useState(false);

  // Live pipeline state (real data, polled)
  const [decision, setDecision] = useState<LiveDecision | null>(null);
  const [realSignals, setRealSignals] = useState<LiveSignal[] | null>(null);
  const [theaterMinPassed, setTheaterMinPassed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const flapIntRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerIntRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolvedRef = useRef(false);
  const sigCountRef = useRef(0);
  const streamedRef = useRef(0);

  // Timer cleanup
  const timerIds = useRef<(ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>)[]>([]);
  function addTimer(id: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>) {
    timerIds.current.push(id);
  }
  function clearTimers() {
    timerIds.current.forEach((id) => {
      clearTimeout(id as ReturnType<typeof setTimeout>);
      clearInterval(id as ReturnType<typeof setInterval>);
    });
    timerIds.current = [];
  }

  // Pre-fill from the guest draft written on the homepage before signup
  // (async deferral keeps the setState out of the synchronous effect body,
  // same pattern as the fromId prefill below)
  useEffect(() => {
    if (fromId) return;
    void Promise.resolve().then(() => {
      const draft = takeGuestDraft();
      if (draft && draft.trim().length > 0) setText(draft);
    });
  }, [fromId]);

  // Pre-fill from duplicated idea
  useEffect(() => {
    if (!fromId) return;
    void (async () => {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch(`/api/v1/ideas/${fromId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = (await res.json()) as { data?: { idea?: { text: string } } };
      const t = json.data?.idea?.text ?? "";
      if (!t) return;
      const cleaned = t.replace(/\n\nCategory: .+$/, "").trim();
      setText(cleaned);
      const match = t.match(/\n\nCategory: (.+)$/);
      if (match) {
        const label = match[1]?.trim() ?? "";
        const found = CATEGORIES.find((c) => c.label === label);
        if (found) setCat(found.key);
      }
    })();
  }, [fromId]);

  // Submit
  const handleSubmit = useCallback(async () => {
    let ok = true;
    if (text.trim().length < 10) { setShowTextErr(true); ok = false; }
    if (!cat) { setShowCatErr(true); ok = false; }
    if (!ok || submitting || validationsLeft === 0) return;

    setSubmitting(true);
    setSubmitErr("");

    const token = await getAuthToken();
    if (!token) { router.push("/login"); return; }

    const catLabel = CATEGORIES.find((c) => c.key === cat)?.label ?? "";
    const body: { text: string; teamId?: string; context?: string } = {
      text: `${text.trim()}\n\nCategory: ${catLabel}`,
    };
    if (context === "team" && teamId) body.teamId = teamId;
    const trimmedCtx = founderContext.trim();
    if (trimmedCtx) body.context = trimmedCtx;

    const res = await fetch("/api/v1/ideas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as { data?: { id: string }; error?: { message: string } };

    if (!res.ok) {
      setSubmitErr(json.error?.message ?? "Something went wrong. Try again.");
      setSubmitting(false);
      return;
    }

    if (json.data?.id) {
      setIdeaId(json.data.id);
    }
    // Reset animation state before transitioning (event handler — no cascading re-render issue)
    setFlap(["·", "·", "·", "·"]);
    setLocked(null);
    setElapsed(0);
    setProgress(0);
    setSrcState(groups.map(() => ({ pct: 0, status: "queued" as SrcStatus, showCount: false, dur: "0s", count: 0 })));
    setSigItems([]);
    setSigTotal(0);
    setLiveDims(DIM_NAMES.map((n) => ({ name: n, pct: 0, cls: "" })));
    setShowAnStatus(false);
    setIsDone(false);
    setIsDoneVisible(false);
    setDecision(null);
    setRealSignals(null);
    setTheaterMinPassed(false);
    setTimedOut(false);
    resolvedRef.current = false;
    sigCountRef.current = 0;
    streamedRef.current = 0;
    setScreen("analysis");
    setSubmitting(false);
  }, [text, cat, context, founderContext, teamId, submitting, validationsLeft, router, groups]);

  // Analysis choreography — staging only; every displayed value is real
  useEffect(() => {
    if (screen !== "analysis") return;

    clearTimers();
    resolvedRef.current = false;

    // Flap cycling until the real verdict resolves the board.
    // Reduced motion: the cells hold steady and simply lock on the verdict.
    if (!reduced) {
      const flapInt = setInterval(() => {
        setFlap([rndC(), rndC(), rndC(), rndC()]);
      }, 80);
      flapIntRef.current = flapInt;
      addTimer(flapInt);
    }

    // Timer counts real elapsed time; the bar eases toward 90% and waits
    // for the verdict — it never claims completion before the pipeline does
    const timerInt = setInterval(() => {
      setElapsed((e) => e + 200);
      setProgress((p) => Math.min(90, p + (200 / TOTAL_MS) * 90));
    }, 200);
    timerIntRef.current = timerInt;
    addTimer(timerInt);

    // Source sweep starts (per plan group); "done" waits for real signals
    groups.forEach((_, i) => {
      addTimer(setTimeout(() => {
        setSrcState((prev) => prev.map((s, j) => j === i ? { ...s, pct: 100, status: "scanning", dur: "2.6s" } : s));
      }, 900 + i * 1100));
    });

    // Process narration — describes what the pipeline is doing, claims nothing
    PROCESS_LINES.forEach((txt, i) => {
      addTimer(setTimeout(() => {
        setSigItems((prev) => [...prev, { id: 1000 + i, fl: "u" as const, src: "SYS", txt, faded: false }].slice(-8));
      }, 800 + i * 2600));
    });

    // Minimum theater time before the board may resolve
    addTimer(setTimeout(() => setTheaterMinPassed(true), THEATER_MIN_MS));

    return () => clearTimers();
  }, [screen, groups, reduced]);

  // Poll the idea endpoint for real signals + decision while the pipeline runs
  useEffect(() => {
    if (screen !== "analysis" || !ideaId) return;

    let stopped = false;
    let pollInt: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      const token = await getAuthToken();
      if (!token || stopped) return;
      try {
        const res = await fetch(`/api/v1/ideas/${ideaId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || stopped) return;
        const json = (await res.json()) as {
          data?: { decision?: LiveDecision | null; signals?: LiveSignal[] };
        };
        const sigs = json.data?.signals;
        if (Array.isArray(sigs) && sigs.length > 0 && sigs.length !== sigCountRef.current) {
          sigCountRef.current = sigs.length;
          setRealSignals(sigs);
        }
        const d = json.data?.decision;
        if (d && typeof d.score === "number") {
          setDecision(d);
          stopped = true;
          if (pollInt) clearInterval(pollInt);
        }
      } catch {
        // network blip — the next tick retries
      }
    };

    pollInt = setInterval(() => { void poll(); }, POLL_MS);
    void poll();
    const timeoutT = setTimeout(() => setTimedOut(true), POLL_TIMEOUT_MS);

    return () => {
      stopped = true;
      if (pollInt) clearInterval(pollInt);
      clearTimeout(timeoutT);
    };
  }, [screen, ideaId]);

  // Real signals arrived (possibly incrementally) — real counts on the source
  // cards, real titles streamed into the ticker exactly once each
  useEffect(() => {
    if (!realSignals || screen !== "analysis") return;

    addTimer(setTimeout(() => setSigTotal(realSignals.length), 0));

    groups.forEach((g, i) => {
      const count = realSignals.filter((s) => g.sources.includes(s.source)).length;
      addTimer(setTimeout(() => {
        setSrcState((prev) => prev.map((s, j) => j === i ? { ...s, pct: 100, status: "done", showCount: true, count } : s));
      }, 250 * i));
    });

    const start = streamedRef.current;
    const batch = realSignals.slice(start, start + 12);
    streamedRef.current = start + batch.length;
    batch.forEach((sig, i) => {
      addTimer(setTimeout(() => {
        setSigItems((prev) => {
          const next = [...prev, {
            id: start + i,
            fl: sig.sentiment === "positive" ? ("p" as const) : sig.sentiment === "negative" ? ("n" as const) : ("u" as const),
            src: SRC_SHORT[sig.source] ?? "WB",
            txt: sig.title,
            faded: false,
          }];
          if (next.length > 7) next[0] = { ...next[0]!, faded: true };
          return next.slice(-8);
        });
      }, 400 + i * 700));
    });
  }, [realSignals, screen, groups]);

  // Board resolve — real verdict, real score, real dimensions
  useEffect(() => {
    if (!decision || !theaterMinPassed || resolvedRef.current || screen !== "analysis") return;
    resolvedRef.current = true;

    if (flapIntRef.current) clearInterval(flapIntRef.current);

    const flapCls = decision.verdict === "GO" ? ("go" as const) : decision.verdict === "PIVOT" ? ("pivot" as const) : ("kill" as const);
    const digits = String(Math.round(decision.score)).split("");
    const letters = decision.verdict.split("");

    setLiveDims(
      decision.dimensions.map((d) => ({ name: d.name, pct: d.score, cls: scoreCls(d.score) }))
    );

    const lockBoard = () => {
      setLocked({ digits, letters, cls: flapCls });
      if (timerIntRef.current) clearInterval(timerIntRef.current);
      setProgress(100);
      addTimer(setTimeout(() => setShowAnStatus(true), 300));
      addTimer(setTimeout(() => {
        setIsDone(true);
        addTimer(setTimeout(() => setIsDoneVisible(true), 16));
      }, 900));
    };

    if (reduced) {
      lockBoard();
      return;
    }

    let snap = 0;
    const snapInt = setInterval(() => {
      setFlap([rndC(), rndC(), rndC(), rndC()]);
      snap++;
      if (snap >= 7) {
        clearInterval(snapInt);
        lockBoard();
      }
    }, 55);
    addTimer(snapInt);
  }, [decision, theaterMinPassed, screen, reduced]);

  // Derived
  const len = text.length;
  const charCls = "ni-char" + (len > 1900 ? " over" : len > 1700 ? " warn" : "");
  const ideaStatus = len === 0 ? "Awaiting input" : len < 10 ? "Too short" : len > 1900 ? "Near limit" : "Draft";
  const elapsedSec = Math.floor(elapsed / 1000);
  const caseRef = ideaId ? ideaId.slice(0, 4).toUpperCase() : "···";

  // Derived from the real decision (render-safe: only used when decision is set)
  const verdictToneCls = decision?.verdict === "GO" ? "go" : decision?.verdict === "PIVOT" ? "watch" : "kill";
  const confidencePct = decision ? Math.round(decision.confidence * 100) : null;
  const dimsSorted = decision ? [...decision.dimensions].sort((a, b) => b.score - a.score) : [];
  const topDim = dimsSorted[0];
  const lowDim = dimsSorted[dimsSorted.length - 1];
  const ottoLine = decision && topDim && lowDim
    ? `${topDim.name} at ${topDim.score} is the clearest reading — ${lowDim.name} at ${lowDim.score} is ${
        decision.verdict === "GO"
          ? "the one thing to watch as you build"
          : decision.verdict === "PIVOT"
          ? "where the pivot pressure comes from"
          : "what pulls the case down"
      }.`
    : null;

  // ── Analysis screen
  if (screen === "analysis") {
    return (
      <div style={{ background: "var(--bg)", color: "var(--ink)", minHeight: "calc(100vh - 56px)", position: "relative" }}>
        <div className="an-wrap">

          <span className="an-eyebrow">
            Survey Bureau · Case {caseRef} · {isDone ? "Complete" : "Processing"}
          </span>

          {/* Verdict board */}
          <div className="bc" style={{ marginBottom: "20px", background: "var(--surface)" }}>
            <div className="bc-hd">
              Survey Verdict Board
              <span className="r">{elapsedSec} s</span>
            </div>
            <div style={{ padding: "20px 24px 18px" }}>
              <div className="an-fcs">
                {locked ? (
                  <>
                    {locked.digits.map((c, i) => (
                      <div key={`d${i}`} className={`fc fc-xl fc-${locked.cls}`}>{c}</div>
                    ))}
                    <div className="fc-gap" />
                    {locked.letters.map((c, i) => (
                      <div key={`l${i}`} className={`fc fc-lg fc-${locked.cls}`}>{c}</div>
                    ))}
                  </>
                ) : (
                  <>
                    <div className="fc fc-xl">{flap[0]}</div>
                    <div className="fc fc-xl">{flap[1]}</div>
                    <div className="fc-gap" />
                    <div className="fc fc-lg">{flap[2]}</div>
                    <div className="fc fc-lg">{flap[3]}</div>
                  </>
                )}
              </div>
              {decision && (
                <div className={`an-status${showAnStatus ? " show" : ""}`}>
                  <div className="an-bsp"><span className="an-bspk">Verdict</span><span className={`an-bspv ${verdictToneCls}`}>{decision.verdict}</span></div>
                  <div className="an-bsp"><span className="an-bspk">Score</span><span className="an-bspv">{Math.round(decision.score)} / 100</span></div>
                  <div className="an-bsp"><span className="an-bspk">Confidence</span><span className="an-bspv">{confidencePct}%</span></div>
                  <div className="an-bsp"><span className="an-bspk">Signals</span><span className="an-bspv">{sigTotal}</span></div>
                </div>
              )}
            </div>
          </div>

          {/* Source cards — plan-real groups, counts from the live pipeline */}
          <div className="an-sources">
            {groups.map((g, i) => (
              <div className="src-card" key={g.label}>
                <div className="src-nm">{g.label}</div>
                <div className="src-bw">
                  <div
                    className="src-bf"
                    style={{
                      transform: `scaleX(${(srcState[i]?.pct ?? 0) / 100})`,
                      transitionProperty: "transform",
                      transitionTimingFunction: "cubic-bezier(.2,0,.1,1)",
                      transitionDuration: srcState[i]?.dur ?? "0s",
                    }}
                  />
                </div>
                <div className={`src-st${srcState[i]?.status === "done" ? " done" : ""}`}>
                  {srcState[i]?.status === "queued"
                    ? "Queued"
                    : srcState[i]?.status === "scanning"
                    ? "Scanning…"
                    : `${srcState[i]?.count ?? 0} signal${srcState[i]?.count !== 1 ? "s" : ""}`}
                </div>
                <div className={`src-ct${srcState[i]?.showCount ? " show" : ""}`}>
                  {srcState[i]?.count ?? 0}
                </div>
              </div>
            ))}
          </div>

          {/* Signal ticker + dimension synthesis */}
          <div className="an-bottom">
            <div className="an-signals">
              <div className="sig-hd">
                <span>Signal extraction</span>
                <span>{sigTotal > 0 ? `${sigTotal} signal${sigTotal !== 1 ? "s" : ""}` : "sweep in progress"}</span>
              </div>
              <div className="sig-list">
                {sigItems.map((sig) => (
                  <div
                    key={sig.id}
                    className="sig-item"
                    style={{ opacity: sig.faded ? 0.3 : 1 }}
                  >
                    <span className={`sig-fl ${sig.fl}`}>
                      {sig.fl === "p" ? "+" : sig.fl === "n" ? "–" : "·"}
                    </span>
                    <span className="sig-txt">{sig.txt}</span>
                    <span className="sig-src">{sig.src}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="an-dims">
              <div className="dim-hd">Dimension synthesis</div>
              <div className="dim-list">
                {liveDims.map((d) => (
                  <div key={d.name}>
                    <div className="dim-nm">
                      {d.name}
                      <span className={`dim-sc${d.pct > 0 ? ` ${d.cls}` : ""}`}>
                        {d.pct > 0 ? d.pct : "—"}
                      </span>
                    </div>
                    <div className="dim-bar">
                      <div className={`dim-fill ${d.cls}`} style={{ transform: `scaleX(${d.pct / 100})` }} />
                      <div className="dim-gl" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Done overlay — real verdict, real numbers */}
          {isDone && decision && (
            <div
              className="an-done"
              style={{ opacity: isDoneVisible ? 1 : 0 }}
            >
              <div>
                <div className="an-done-lbl">Verdict ready</div>
                <div className={`an-done-verd ${verdictToneCls}`}>
                  {decision.verdict} · {Math.round(decision.score)} / 100
                </div>
                <div className="an-done-sub">
                  {sigTotal} signal{sigTotal !== 1 ? "s" : ""} · Confidence {confidencePct}%
                </div>
              </div>
              {ottoLine && (
                <div className="an-done-otto">
                  <span className="do-sig">Otto</span>
                  <p className="do-txt">{ottoLine}</p>
                </div>
              )}
              {ideaId && (
                <Link href={`/ideas/${ideaId}`} className={`btn-p${isDoneVisible ? " pulse" : ""}`}>
                  View verdict →
                </Link>
              )}
            </div>
          )}

          {/* Long-running pipeline — honest state, no invented verdict */}
          {timedOut && !decision && (
            <div className="an-done" style={{ opacity: 1 }}>
              <div>
                <div className="an-done-lbl">Still processing</div>
                <div className="an-done-verd" style={{ color: "var(--ink)" }}>Survey running long</div>
                <div className="an-done-sub">
                  Heavy source traffic — the case file updates itself the moment the verdict lands.
                </div>
              </div>
              {ideaId && (
                <Link href={`/ideas/${ideaId}`} className="btn-p">
                  Open case file →
                </Link>
              )}
            </div>
          )}

        </div>

        {/* Fixed progress bar */}
        <div className="an-progress">
          <div className="an-progress-fill" style={{ transform: `scaleX(${progress / 100})` }} />
        </div>
      </div>
    );
  }

  // ── Form screen
  return (
    <div style={{ background: "var(--bg)", color: "var(--ink)", minHeight: "calc(100vh - 56px)" }}>
      <div className="ni-form">

        <div style={{ marginBottom: "24px" }}>
          <Link href="/dashboard" className="auth-sl">← Dashboard</Link>
        </div>

        <span className="ni-eyebrow">Survey Bureau · New case</span>
        <h1 className="ni-heading">What&apos;s the idea?</h1>
        <p className="ni-sub">
          Describe your product — what it does, who it&apos;s for, and what problem it solves.
          The more specific, the sharper the verdict.
        </p>

        {/* Team context toggle */}
        {teamId && teamName && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "28px" }}>
            <span className="ni-fl" style={{ margin: 0 }}>Context</span>
            <div style={{ display: "flex", border: "1px solid var(--line)" }}>
              {(["personal", "team"] as const).map((ctx, idx) => (
                <button
                  key={ctx}
                  type="button"
                  onClick={() => setContext(ctx)}
                  style={{
                    fontFamily: "var(--font-chivo-mono), monospace",
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    padding: "8px 14px",
                    background: context === ctx ? "var(--ink)" : "transparent",
                    color: context === ctx ? "var(--bg)" : "var(--dim)",
                    border: "none",
                    borderRight: idx === 0 ? "1px solid var(--line)" : "none",
                    cursor: "pointer",
                    transition: "all .12s",
                  }}
                >
                  {ctx === "team" ? teamName : "Personal"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Idea textarea */}
        <div className="ni-field">
          <span className="ni-fl">Your idea · 10–2000 characters</span>
          <div
            className="bc"
            style={{
              background: "var(--surface)",
              ...(showTextErr && len < 10 ? { borderColor: "var(--kill)" } : {}),
            }}
          >
            <div className="bc-hd">
              Survey Bureau · New case · Draft
              <span className="r">{ideaStatus}</span>
            </div>
            <textarea
              className="ni-ta"
              rows={9}
              maxLength={2000}
              placeholder="Describe your product idea here. What does it do? Who will use it? What specific problem does it solve? The more concrete the description, the more precise the verdict."
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (e.target.value.trim().length >= 10) setShowTextErr(false);
              }}
            />
            <div className="ni-tf">
              <span className={`ni-min${len > 0 && len < 10 ? " show" : ""}`}>
                10 characters minimum
              </span>
              <span className={charCls}>{len} / 2000</span>
            </div>
          </div>
          {showTextErr && len < 10 && (
            <div className="ni-err">Idea description is required (minimum 10 characters)</div>
          )}
        </div>

        {/* Category picker */}
        <div className="ni-field">
          <span className="ni-fl">Category · Select one</span>
          <div className="ni-cats">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`ni-cat${cat === c.key ? " sel" : ""}`}
                onClick={() => {
                  setCat(c.key);
                  setShowCatErr(false);
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
          {showCatErr && (
            <div className="ni-err">Select a category to continue</div>
          )}
        </div>

        {/* Founder context — collapsible */}
        <div className="ni-field">
          <button
            type="button"
            onClick={() => setShowContext((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              fontFamily: "var(--font-chivo-mono), monospace",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: founderContext.trim() ? "var(--ink)" : "var(--dim)",
            }}
          >
            <span style={{ fontSize: 11, lineHeight: 1 }}>{showContext ? "▾" : "▸"}</span>
            Add context (optional)
            {!showContext && founderContext.trim() && (
              <span style={{ color: "var(--go)", fontWeight: 700 }}>· Added</span>
            )}
          </button>
          {showContext && (
            <div style={{ marginTop: "12px" }}>
              <div className="bc" style={{ background: "var(--surface)" }}>
                <div className="bc-hd">
                  Founder context · Injected into all AI tools
                  <span className="r">{founderContext.length} / 3000</span>
                </div>
                <textarea
                  className="ni-ta"
                  rows={5}
                  maxLength={3000}
                  placeholder="Share what you know: customer conversations, lost deals, competitive feedback, pricing signals, failed experiments… The AI will use this alongside public signals."
                  value={founderContext}
                  onChange={(e) => setFounderContext(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit row */}
        <div className="ni-sr">
          <span className="ni-quota">
            This uses <strong>1 validation</strong> · <strong>{validationsLeft}</strong> remaining this month
          </span>
          <button
            type="button"
            className="btn-p"
            disabled={submitting || validationsLeft === 0}
            onClick={handleSubmit}
          >
            {submitting ? "Submitting…" : "Run survey →"}
          </button>
        </div>

        {validationsLeft === 0 && (
          <div className="auth-err" style={{ marginTop: "16px" }}>
            You&apos;ve used all your validations this month.{" "}
            <button
              onClick={openQuotaModal}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: 0,
                color: "var(--kill)", textDecoration: "underline", textUnderlineOffset: 2,
                font: "inherit", fontSize: "inherit",
              }}
            >
              Top up or upgrade →
            </button>
          </div>
        )}

        {submitErr && (
          <div className="auth-err" style={{ marginTop: "16px" }}>{submitErr}</div>
        )}

      </div>
    </div>
  );
}
