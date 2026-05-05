"use client";

import { useState, useEffect } from "react";
import type { Decision } from "@pledgeoff/core";

const VERDICT_CONFIG = {
  GO: {
    label: "GO",
    color: "var(--validated)",
    glowColor: "rgba(125,214,107,0.15)",
    description: "Strong signal. Build it.",
  },
  KILL: {
    label: "KILL",
    color: "var(--kill)",
    glowColor: "rgba(229,91,60,0.15)",
    description: "Weak signal. Don't build it.",
  },
  PIVOT: {
    label: "PIVOT",
    color: "var(--caution)",
    glowColor: "rgba(232,179,65,0.15)",
    description: "Mixed signal. Change direction.",
  },
} as const;

function useCountUp(target: number, delay = 400, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 4);
        setValue(Math.round(eased * target));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, delay, duration]);
  return value;
}

interface DecisionCardProps {
  decision: Decision;
}

export function DecisionCard({ decision }: DecisionCardProps) {
  const cfg = VERDICT_CONFIG[decision.verdict];
  const [revealed, setRevealed] = useState(false);
  const [glowVisible, setGlowVisible] = useState(false);
  const [barsVisible, setBarsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasDimensions = decision.dimensions && decision.dimensions.length > 0;

  const score = hasDimensions
    ? Math.round(decision.dimensions!.reduce((sum, d) => sum + d.weight * d.score, 0))
    : Math.round(decision.confidence * 100);

  const displayScore = useCountUp(score);

  useEffect(() => {
    const t1 = setTimeout(() => setRevealed(true), 100);
    const t2 = setTimeout(() => setGlowVisible(true), 1300);
    const t3 = setTimeout(() => setBarsVisible(true), 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  function handleShare() {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 2000); },
      () => {}
    );
  }

  return (
    <div
      className="relative rounded-md border overflow-hidden"
      style={{ borderColor: `${cfg.color}30`, background: "var(--surface)" }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-700"
        style={{
          opacity: glowVisible ? 1 : 0,
          background: `radial-gradient(ellipse 60% 40% at 20% 50%, ${cfg.glowColor} 0%, transparent 70%)`,
        }}
      />

      <div className="relative p-8">
        {/* Score + verdict */}
        <div
          className="flex items-end gap-8 mb-8 transition-all duration-500"
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? "none" : "translateY(6px)",
          }}
        >
          <div
            className="display tnum font-semibold"
            style={{
              fontSize: "clamp(100px, 12vw, 200px)",
              lineHeight: 0.85,
              color: cfg.color,
            }}
          >
            {displayScore}
          </div>
          <div className="pb-2">
            <div
              className="display text-[28px] font-semibold mb-1"
              style={{ color: cfg.color }}
            >
              {cfg.label}
            </div>
            <div className="text-[13px] text-(--t3)">{cfg.description}</div>
            <div className="mono text-[10px] text-(--t3) mt-2 uppercase tracking-[0.1em]">
              {hasDimensions ? `${decision.dimensions!.length} dimensions` : "confidence"} ·{" "}
              {Math.round(decision.confidence * 100)}%
            </div>
          </div>
        </div>

        {/* Score bars */}
        {hasDimensions && (
          <div
            className="mb-6 transition-all duration-500"
            style={{
              opacity: revealed ? 1 : 0,
              transform: revealed ? "none" : "translateY(6px)",
              transitionDelay: "100ms",
            }}
          >
            <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.1em] mb-3">
              Score breakdown
            </p>
            <div>
              {decision.dimensions!.map((d, i) => {
                const dimColor =
                  d.score >= 75
                    ? "var(--validated)"
                    : d.score >= 50
                    ? "var(--caution)"
                    : "var(--kill)";
                return (
                  <div
                    key={d.name}
                    className="py-2 border-b"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="text-[12px] text-(--t1)">{d.name}</div>
                      <div className="flex items-center gap-2">
                        <span className="mono text-[9px] text-(--t3)">{Math.round(d.weight * 100)}%</span>
                        <span className="mono tnum text-[11px]" style={{ color: dimColor }}>{d.score}</span>
                      </div>
                    </div>
                    <div className="h-[3px] rounded-full" style={{ background: "var(--border)" }}>
                      <div
                        className="h-[3px] rounded-full"
                        style={{
                          width: barsVisible ? `${d.score}%` : "0%",
                          background: dimColor,
                          transition: "width 800ms cubic-bezier(0.16,1,0.3,1)",
                          transitionDelay: `${i * 120}ms`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Score contribution breakdown */}
        {hasDimensions && (
          <div
            className="mb-6 transition-all duration-500"
            style={{
              opacity: revealed ? 1 : 0,
              transform: revealed ? "none" : "translateY(6px)",
              transitionDelay: "200ms",
            }}
          >
            <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.1em] mb-3">
              How this score was calculated
            </p>
            <div
              className="rounded border divide-y"
              style={{ borderColor: "var(--border)", background: "var(--canvas)" }}
            >
              {decision.dimensions!.map((d) => {
                const contribution = Math.round(d.weight * d.score);
                const dimColor =
                  d.score >= 75 ? "var(--validated)" : d.score >= 50 ? "var(--caution)" : "var(--kill)";
                return (
                  <div
                    key={d.name}
                    className="px-3 py-2"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-(--t2)">{d.name}</span>
                      <span className="mono text-[12px] font-semibold" style={{ color: dimColor }}>
                        {contribution} pts
                      </span>
                    </div>
                    <div className="mono text-[10px] mt-0.5" style={{ color: "var(--t3)" }}>
                      <span style={{ color: dimColor }}>{d.score}/100</span>
                      {" × "}{Math.round(d.weight * 100)}% weight
                    </div>
                  </div>
                );
              })}
              <div
                className="flex items-center justify-between px-3 py-2"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <span className="mono text-[11px] text-(--t3) uppercase tracking-[0.08em]">
                  Final score
                </span>
                <span className="mono text-[13px] font-semibold text-(--t1)">
                  {score} / 100
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Reasoning */}
        <div
          className="transition-all duration-500"
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? "none" : "translateY(6px)",
            transitionDelay: "300ms",
          }}
        >
          <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.1em] mb-3">
            Reasoning
          </p>
          <p className="text-[14px] text-(--t2) leading-relaxed">
            {decision.reasoning}
          </p>
        </div>

        {/* CTAs */}
        <div
          className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 transition-all duration-500"
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? "none" : "translateY(6px)",
            transitionDelay: "400ms",
          }}
        >
          <button
            disabled
            className="mono text-[11px] px-4 h-10 sm:h-8 rounded border border-(--border) text-(--t3) cursor-not-allowed opacity-40"
          >
            Simulate Revenue →
          </button>
          <button
            onClick={handleShare}
            className="mono text-[11px] px-4 h-10 sm:h-8 rounded border border-(--border) text-(--t2) hover:border-(--t3) transition-colors"
          >
            {copied ? "Copied ✓" : "Share result ↗"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DecisionPending() {
  return (
    <div className="rounded-md border border-(--border) bg-(--surface) p-8 flex flex-col items-center justify-center gap-4 min-h-[180px]">
      <div className="flex items-center gap-2">
        <span className="pulse-dot w-2 h-2 rounded-full bg-(--accent) inline-block" />
        <span className="mono text-[11px] text-(--t3) uppercase tracking-[0.1em]">
          Analyzing signals…
        </span>
      </div>
      <p className="text-[13px] text-(--t3) text-center max-w-xs">
        We&apos;re scanning Reddit and GitHub. This takes ~15 seconds.
      </p>
    </div>
  );
}
