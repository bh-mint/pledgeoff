"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getAuthToken } from "@/lib/auth-client";

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

const SIGNALS = [
  { fl: "p" as const, src: "HN", txt: "Show HN: I built a changelog generator from my git commits" },
  { fl: "p" as const, src: "HN", txt: "Ask HN: How do you keep users informed of what you ship?" },
  { fl: "p" as const, src: "GH", txt: "googleapis/release-please · Issue #1873: narrative output requested" },
  { fl: "u" as const, src: "GH", txt: "conventional-changelog · 14.2k stars · maintenance mode" },
  { fl: "p" as const, src: "GH", txt: "mikepenz/release-action · community demand for prose output" },
  { fl: "p" as const, src: "DT", txt: "Why I stopped writing changelogs by hand — mkramer_dev" },
  { fl: "p" as const, src: "RD", txt: "r/SideProject: What do you use to announce updates to users?" },
  { fl: "n" as const, src: "HN", txt: "Does anyone actually read changelogs? Counter-signal logged." },
  { fl: "p" as const, src: "DT", txt: '"The gap is the translation layer to readable prose"' },
  { fl: "p" as const, src: "GH", txt: 'changelog-generator · 847 stars · "could be so much better"' },
];

const SRC_NAMES = ["Hacker News", "GitHub", "Dev.to", "Reddit · Web"];
const SRC_COUNTS = [7, 5, 4, 2];
const SRC_TIMING: [number, number][] = [
  [1000, 3200],
  [3000, 5500],
  [5200, 8000],
  [8200, 10500],
];

const DIMS = [
  { name: "Market Signal", target: 91, cls: "go" as const, delay: 10400 },
  { name: "Competitive",   target: 86, cls: "go" as const, delay: 11600 },
  { name: "Revenue Model", target: 80, cls: "go" as const, delay: 12700 },
  { name: "Team Capability", target: 72, cls: "watch" as const, delay: 13500 },
];

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
}

interface SigItem {
  id: number;
  fl: "p" | "u" | "n";
  src: string;
  txt: string;
  faded: boolean;
}

// ─── Component ───────────────────────────────────────────

export function NewIdeaClient({
  validationsLeft,
  teamId,
  teamName,
}: {
  validationsLeft: number;
  teamId?: string | null;
  teamName?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromId = searchParams.get("from");

  // Form state
  const [text, setText] = useState("");
  const [cat, setCat] = useState<CatKey | null>(null);
  const [context, setContext] = useState<"personal" | "team">("personal");
  const [showTextErr, setShowTextErr] = useState(false);
  const [showCatErr, setShowCatErr] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Screen
  const [screen, setScreen] = useState<"form" | "analysis">("form");
  const [ideaId, setIdeaId] = useState<string | null>(null);

  // Analysis animation state
  const [flap, setFlap] = useState(["·", "·", "·", "·"]);
  const [flapGreen, setFlapGreen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(0);
  const [srcState, setSrcState] = useState<SrcState[]>(
    SRC_NAMES.map(() => ({ pct: 0, status: "queued" as SrcStatus, showCount: false, dur: "0s" }))
  );
  const [sigItems, setSigItems] = useState<SigItem[]>([]);
  const [sigTotal, setSigTotal] = useState(0);
  const [dimPct, setDimPct] = useState([0, 0, 0, 0]);
  const [showAnStatus, setShowAnStatus] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isDoneVisible, setIsDoneVisible] = useState(false);

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
    const body: { text: string; teamId?: string } = {
      text: `${text.trim()}\n\nCategory: ${catLabel}`,
    };
    if (context === "team" && teamId) body.teamId = teamId;

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
    setScreen("analysis");
    setSubmitting(false);
  }, [text, cat, context, teamId, submitting, validationsLeft, router]);

  // Analysis animation
  useEffect(() => {
    if (screen !== "analysis") return;

    // Reset
    setFlap(["·", "·", "·", "·"]);
    setFlapGreen(false);
    setElapsed(0);
    setProgress(0);
    setSrcState(SRC_NAMES.map(() => ({ pct: 0, status: "queued" as SrcStatus, showCount: false, dur: "0s" })));
    setSigItems([]);
    setSigTotal(0);
    setDimPct([0, 0, 0, 0]);
    setShowAnStatus(false);
    setIsDone(false);
    setIsDoneVisible(false);
    clearTimers();

    // Flap cycling
    const flapInt = setInterval(() => {
      setFlap([rndC(), rndC(), rndC(), rndC()]);
    }, 80);
    addTimer(flapInt);

    // Timer + progress bar
    const timerInt = setInterval(() => {
      setElapsed((e) => Math.min(e + 200, TOTAL_MS));
      setProgress((p) => Math.min(100, p + (200 / TOTAL_MS) * 100));
    }, 200);
    addTimer(timerInt);

    // Source scanning: start + done
    SRC_TIMING.forEach(([startMs, doneMs], i) => {
      const dur = `${((doneMs - startMs) / 1000).toFixed(1)}s`;
      addTimer(setTimeout(() => {
        setSrcState((prev) => prev.map((s, j) => j === i ? { ...s, pct: 100, status: "scanning", dur } : s));
      }, startMs));
      addTimer(setTimeout(() => {
        setSrcState((prev) => prev.map((s, j) => j === i ? { ...s, status: "done", showCount: true } : s));
      }, doneMs));
    });

    // Signal items
    SIGNALS.forEach((sig, i) => {
      addTimer(setTimeout(() => {
        setSigItems((prev) => {
          const next = [...prev, { ...sig, id: i, faded: false }];
          if (next.length > 7) {
            next[0] = { ...next[0]!, faded: true };
          }
          return next.slice(-8);
        });
        setSigTotal(i + 1);
      }, 4000 + i * 820));
    });

    // Dimension bars
    DIMS.forEach((d, i) => {
      addTimer(setTimeout(() => {
        setDimPct((prev) => prev.map((v, j) => (j === i ? d.target : v)));
      }, d.delay));
    });

    // Board resolve at 14s — stop flap, snap 7×, lock to "82 GO"
    addTimer(setTimeout(() => {
      clearInterval(flapInt);
      let snap = 0;
      const snapInt = setInterval(() => {
        setFlap([rndC(), rndC(), rndC(), rndC()]);
        snap++;
        if (snap >= 7) {
          clearInterval(snapInt);
          setFlap(["8", "2", "G", "O"]);
          setFlapGreen(true);
          addTimer(setTimeout(() => setShowAnStatus(true), 300));
        }
      }, 55);
      addTimer(snapInt);
    }, 14000));

    // Done at 15s
    addTimer(setTimeout(() => {
      clearInterval(timerInt);
      setProgress(100);
      setIsDone(true);
      addTimer(setTimeout(() => setIsDoneVisible(true), 16));
    }, 15000));

    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // Derived
  const len = text.length;
  const charCls = "ni-char" + (len > 1900 ? " over" : len > 1700 ? " warn" : "");
  const ideaStatus = len === 0 ? "Awaiting input" : len < 10 ? "Too short" : len > 1900 ? "Near limit" : "Draft";
  const elapsedSec = Math.floor(elapsed / 1000);
  const caseRef = ideaId ? ideaId.slice(0, 4).toUpperCase() : "···";

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
                <div className={`fc fc-xl${flapGreen ? " fc-go" : ""}`}>{flap[0]}</div>
                <div className={`fc fc-xl${flapGreen ? " fc-go" : ""}`}>{flap[1]}</div>
                <div className="fc-gap" />
                <div className={`fc fc-lg${flapGreen ? " fc-go" : ""}`}>{flap[2]}</div>
                <div className={`fc fc-lg${flapGreen ? " fc-go" : ""}`}>{flap[3]}</div>
              </div>
              <div className={`an-status${showAnStatus ? " show" : ""}`}>
                <div className="an-bsp"><span className="an-bspk">Verdict</span><span className="an-bspv go">GO</span></div>
                <div className="an-bsp"><span className="an-bspk">Score</span><span className="an-bspv">82 / 100</span></div>
                <div className="an-bsp"><span className="an-bspk">Confidence</span><span className="an-bspv">84%</span></div>
                <div className="an-bsp"><span className="an-bspk">Signals</span><span className="an-bspv">{sigTotal}</span></div>
              </div>
            </div>
          </div>

          {/* Source cards */}
          <div className="an-sources">
            {SRC_NAMES.map((name, i) => (
              <div className="src-card" key={name}>
                <div className="src-nm">{name}</div>
                <div className="src-bw">
                  <div
                    className="src-bf"
                    style={{
                      width: `${srcState[i]?.pct ?? 0}%`,
                      transitionProperty: "width",
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
                    : `${SRC_COUNTS[i]} signal${SRC_COUNTS[i] !== 1 ? "s" : ""}`}
                </div>
                <div className={`src-ct${srcState[i]?.showCount ? " show" : ""}`}>
                  {SRC_COUNTS[i]}
                </div>
              </div>
            ))}
          </div>

          {/* Signal ticker + dimension synthesis */}
          <div className="an-bottom">
            <div className="an-signals">
              <div className="sig-hd">
                <span>Signal extraction</span>
                <span>{sigTotal} signal{sigTotal !== 1 ? "s" : ""}</span>
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
                {DIMS.map((d, i) => (
                  <div key={d.name}>
                    <div className="dim-nm">
                      {d.name}
                      <span className={`dim-sc${dimPct[i]! > 0 ? ` ${d.cls}` : ""}`}>
                        {dimPct[i]! > 0 ? dimPct[i] : "—"}
                      </span>
                    </div>
                    <div className="dim-bar">
                      <div className={`dim-fill ${d.cls}`} style={{ width: `${dimPct[i]}%` }} />
                      <div className="dim-gl" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Done overlay */}
          {isDone && (
            <div
              className="an-done"
              style={{ opacity: isDoneVisible ? 1 : 0 }}
            >
              <div>
                <div className="an-done-lbl">Verdict ready</div>
                <div className="an-done-verd">GO · 82 / 100</div>
                <div className="an-done-sub">{sigTotal} signals · Confidence 84%</div>
              </div>
              <div className="an-done-otto">
                <span className="do-sig">Otto</span>
                <p className="do-txt">
                  Market Signal at 91 is the clearest reading — demand is real and concentrated.
                  Team Capability at 72 is the one thing to solve before you build.
                </p>
              </div>
              {ideaId && (
                <Link href={`/ideas/${ideaId}`} className={`an-done-cta${isDoneVisible ? " pulse" : ""}`}>
                  View verdict →
                </Link>
              )}
            </div>
          )}

        </div>

        {/* Fixed progress bar */}
        <div className="an-progress">
          <div className="an-progress-fill" style={{ width: `${progress}%` }} />
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

        {/* Submit row */}
        <div className="ni-sr">
          <span className="ni-quota">
            This uses <strong>1 validation</strong> · <strong>{validationsLeft}</strong> remaining this month
          </span>
          <button
            type="button"
            className="ni-run"
            disabled={submitting || validationsLeft === 0}
            onClick={handleSubmit}
          >
            {submitting ? "Submitting…" : "Run survey →"}
          </button>
        </div>

        {validationsLeft === 0 && (
          <div className="auth-err" style={{ marginTop: "16px" }}>
            You&apos;ve used all your validations this month.{" "}
            <Link href="/pricing" style={{ color: "var(--kill)", textDecoration: "underline", textUnderlineOffset: 2 }}>
              Upgrade →
            </Link>
          </div>
        )}

        {submitErr && (
          <div className="auth-err" style={{ marginTop: "16px" }}>{submitErr}</div>
        )}

      </div>
    </div>
  );
}
