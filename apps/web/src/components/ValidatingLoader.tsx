"use client";

import { useState, useEffect, useRef } from "react";

// Decorative fake data — purely for animation
const REDDIT_POSTS = [
  { sub: "r/Entrepreneur", user: "u/found3r_jan", text: "Been looking for exactly this kind of solution for months" },
  { sub: "r/startups", user: "u/indiehacker22", text: "Similar tool we tried broke constantly — market is wide open" },
  { sub: "r/SideProject", user: "u/maker_dev99", text: "The pain point is real, I hear this complaint every week" },
  { sub: "r/ProductHunt", user: "u/earlybird42", text: "Would pay for this immediately if it worked reliably" },
  { sub: "r/tech", user: "u/builder_x", text: "High demand, no good solution — surprised nobody built this" },
];

const COMPETITORS = [
  { name: "Competitor A", weakness: "No real-time data, static snapshots only" },
  { name: "Competitor B", weakness: "Manual research required, no automation" },
  { name: "Competitor C", weakness: "Expensive and difficult to integrate" },
];

// SVG sparkline points (decorative trend curve)
const TREND_POINTS: [number, number][] = [
  [0, 68], [22, 62], [44, 70], [66, 55], [88, 58],
  [110, 50], [132, 60], [154, 44], [176, 48], [198, 40],
  [220, 46], [242, 38], [264, 42], [286, 32], [300, 28],
];

const STAGES = [
  { id: "reddit",      label: "Reddit",      duration: 4000 },
  { id: "trends",      label: "Trends",      duration: 4000 },
  { id: "competitors", label: "Competitors", duration: 4000 },
  { id: "computing",   label: "Computing",   duration: 3000 },
] as const;

const TOTAL_MS = STAGES.reduce((s, st) => s + st.duration, 0); // 15000ms

export function ValidatingLoader() {
  const startRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    startRef.current = Date.now();
    const id = setInterval(() => {
      if (startRef.current !== null) {
        setElapsed(Date.now() - startRef.current);
      }
    }, 150);
    return () => clearInterval(id);
  }, []);

  // Loop every 15s
  const cycleMs = elapsed % TOTAL_MS;

  let stageIndex = 0;
  let stageMs = cycleMs;
  for (let i = 0; i < STAGES.length; i++) {
    if (stageMs < STAGES[i].duration) {
      stageIndex = i;
      break;
    }
    stageMs -= STAGES[i].duration;
  }

  const stageProgress = stageMs / STAGES[stageIndex].duration;

  // Reddit: posts visible + signal counter
  const redditPostsVisible =
    stageIndex >= 1
      ? REDDIT_POSTS.length
      : Math.min(REDDIT_POSTS.length, Math.floor(stageProgress * (REDDIT_POSTS.length + 1)));
  const signalCounter =
    stageIndex >= 1 ? 847 : Math.floor(stageProgress * 847);

  // Trends: SVG draw progress
  const trendProgress =
    stageIndex === 1 ? stageProgress : stageIndex > 1 ? 1 : 0;
  const visiblePointCount = Math.max(2, Math.floor(trendProgress * TREND_POINTS.length));
  const pathD = TREND_POINTS.slice(0, visiblePointCount)
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`)
    .join(" ");

  // Competitors: typewriter
  const compProgress =
    stageIndex === 2 ? stageProgress : stageIndex > 2 ? 1 : 0;
  const totalCompChars = COMPETITORS.reduce((s, c) => s + c.weakness.length, 0);
  const totalTyped = Math.floor(compProgress * totalCompChars);

  const compChars = COMPETITORS.map((comp, i) => {
    const charsBefore = COMPETITORS.slice(0, i).reduce((s, c) => s + c.weakness.length, 0);
    return Math.min(Math.max(0, totalTyped - charsBefore), comp.weakness.length);
  });

  const isComputing = stageIndex === 3;
  const timerS = (elapsed / 1000).toFixed(1);

  return (
    <div className="space-y-4">
      {/* Stage bar */}
      <div
        className="rounded-md border p-4"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="mono text-[10px] text-[var(--t3)] uppercase tracking-[0.12em]">
            Analysis pipeline
          </span>
          <span className="mono tnum text-[11px]" style={{ color: "var(--accent)" }}>
            {timerS}s
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STAGES.map((stage, i) => {
            const isDone = i < stageIndex;
            const isActive = i === stageIndex;
            const progress = isDone ? 1 : isActive ? stageProgress : 0;
            return (
              <div key={stage.id}>
                <div className="flex items-center gap-1 mb-1.5">
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 pulse-dot bg-[var(--accent)]" />
                  )}
                  {isDone && (
                    <span className="text-[9px] flex-shrink-0" style={{ color: "var(--validated)" }}>
                      ✓
                    </span>
                  )}
                  {!isActive && !isDone && (
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: "var(--border)" }}
                    />
                  )}
                  <span
                    className={`mono text-[9px] uppercase tracking-[0.08em] truncate ${
                      isActive
                        ? "text-[var(--t1)]"
                        : isDone
                        ? "text-[var(--validated)]"
                        : "text-[var(--t3)]"
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>
                <div
                  className="h-[2px] rounded-full overflow-hidden"
                  style={{ background: "var(--border)" }}
                >
                  <div
                    className="h-[2px] rounded-full transition-all duration-300"
                    style={{
                      width: `${progress * 100}%`,
                      background: isDone ? "var(--validated)" : "var(--accent)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3 panels + computing overlay */}
      <div className="relative">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Reddit panel */}
          <div
            className="rounded-md border overflow-hidden"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <div
              className="border-b px-3 h-8 flex items-center justify-between"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full pulse-dot bg-[var(--accent)]" />
                <span className="mono text-[9px] text-[var(--t2)] uppercase tracking-[0.1em]">
                  Reddit
                </span>
              </div>
              <span className="mono tnum text-[9px] text-[var(--t3)]">
                {signalCounter} signals
              </span>
            </div>
            <div className="p-3 space-y-2 min-h-[170px]">
              {REDDIT_POSTS.slice(0, redditPostsVisible).map((post, i) => (
                <div
                  key={i}
                  className="border rounded px-2 py-1.5 fade-slide-in"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--canvas)",
                    animationDelay: `${i * 0.1}s`,
                  }}
                >
                  <span className="mono text-[9px] text-[var(--t3)]">
                    {post.sub} · {post.user}
                  </span>
                  <p className="text-[11px] text-[var(--t1)] mt-0.5 leading-snug">
                    &ldquo;{post.text}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Trends panel */}
          <div
            className="rounded-md border overflow-hidden"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <div
              className="border-b px-3 h-8 flex items-center justify-between"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2">
                {stageIndex >= 1 ? (
                  <span className="w-1.5 h-1.5 rounded-full pulse-dot bg-[var(--accent)]" />
                ) : (
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--border)" }}
                  />
                )}
                <span className="mono text-[9px] text-[var(--t2)] uppercase tracking-[0.1em]">
                  Trends
                </span>
              </div>
              <span
                className="mono text-[9px]"
                style={{
                  color:
                    stageIndex > 1
                      ? "var(--validated)"
                      : stageIndex === 1
                      ? "var(--accent)"
                      : "var(--t3)",
                }}
              >
                {stageIndex > 1 ? "✓ complete" : stageIndex === 1 ? "streaming" : "waiting"}
              </span>
            </div>
            <div className="p-3 min-h-[170px] flex flex-col justify-between">
              <svg
                viewBox="0 0 300 80"
                className="w-full"
                style={{ overflow: "visible", opacity: trendProgress > 0 ? 1 : 0.15 }}
              >
                <path
                  d={trendProgress > 0 ? pathD : `M0,68`}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="mono text-[9px] text-[var(--t3)] mt-2">
                {trendProgress >= 1 ? "+34% YoY trend momentum" : "fetching trend data…"}
              </p>
            </div>
          </div>

          {/* Competitors panel */}
          <div
            className="rounded-md border overflow-hidden"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <div
              className="border-b px-3 h-8 flex items-center justify-between"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2">
                {stageIndex >= 2 ? (
                  <span className="w-1.5 h-1.5 rounded-full pulse-dot bg-[var(--accent)]" />
                ) : (
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--border)" }}
                  />
                )}
                <span className="mono text-[9px] text-[var(--t2)] uppercase tracking-[0.1em]">
                  Competitors
                </span>
              </div>
              <span
                className="mono text-[9px]"
                style={{
                  color:
                    stageIndex > 2
                      ? "var(--validated)"
                      : stageIndex === 2
                      ? "var(--accent)"
                      : "var(--t3)",
                }}
              >
                {stageIndex > 2 ? "✓ complete" : stageIndex === 2 ? "analyzing" : "waiting"}
              </span>
            </div>
            <div className="p-3 space-y-3 min-h-[170px]">
              {COMPETITORS.map((comp, i) => {
                const chars = compChars[i] ?? 0;
                const isTyping = chars > 0 && chars < comp.weakness.length;
                const isVisible = chars > 0 || stageIndex > 2;
                return (
                  <div
                    key={i}
                    style={{ opacity: isVisible ? 1 : 0.2, transition: "opacity 0.3s" }}
                  >
                    <div className="mono text-[9px] text-[var(--t3)] mb-0.5">
                      {comp.name}
                    </div>
                    <div className="text-[11px] text-[var(--t1)] leading-snug">
                      {stageIndex > 2 ? comp.weakness : comp.weakness.slice(0, chars)}
                      {isTyping && (
                        <span className="animate-pulse ml-px" style={{ color: "var(--accent)" }}>
                          |
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Computing overlay */}
        {isComputing && (
          <div
            className="absolute inset-0 rounded-md flex items-center justify-center"
            style={{
              background: "rgba(10,10,11,0.80)",
              backdropFilter: "blur(6px)",
            }}
          >
            <div className="text-center">
              <span className="w-3 h-3 rounded-full pulse-dot bg-[var(--accent)] inline-block mb-4" />
              <p className="display text-[18px] font-semibold text-[var(--t1)]">
                Computing verdict…
              </p>
              <p className="mono text-[10px] text-[var(--t3)] mt-2 uppercase tracking-[0.1em]">
                weighted scoring · 4 dimensions
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
