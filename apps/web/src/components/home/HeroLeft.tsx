"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LastValidatedBadge } from "@/components/home/LastValidatedBadge";

const DIMS = [
  { label: "Market Demand", score: 88, weak: false },
  { label: "Competition",   score: 69, weak: true  },
  { label: "Feasibility",   score: 91, weak: false },
  { label: "Timing",        score: 79, weak: false },
];

const mono: React.CSSProperties = {
  fontFamily: "var(--font-chivo-mono), monospace",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
} as const;

export function HeroLeft() {
  const [mounted, setMounted] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);

    let startTime: number | null = null;
    const target = 82;
    const duration = 1100;

    function step(ts: number) {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    }

    const rafId = requestAnimationFrame(step);
    return () => { clearTimeout(t); cancelAnimationFrame(rafId); };
  }, []);

  return (
    <div>
      <span
        style={{
          ...mono,
          fontSize: 8.5,
          letterSpacing: "0.3em",
          color: "var(--faint)",
          display: "block",
          marginBottom: 12,
        }}
      >
        Field Report ·{" "}
        <span style={{ color: "var(--go)" }}>GO</span>
      </span>

      <h1
        style={{
          fontFamily: "var(--font-bitter), serif",
          fontSize: "clamp(36px, 5.5vw, 88px)",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          lineHeight: 1.05,
          color: "var(--ink)",
          marginBottom: 18,
        }}
      >
        Know if your idea
        <br />
        is worth building.
        <br />
        <em style={{ fontStyle: "italic", color: "var(--dim)", fontSize: "0.75em" }}>
          Before you build it.
        </em>
      </h1>

      {/* Animated dimension bars */}
      <div style={{ marginBottom: 18 }}>
        {DIMS.map((d, i) => (
          <div
            key={d.label}
            style={{
              display: "grid",
              gridTemplateColumns: "160px 1fr 40px",
              alignItems: "center",
              gap: 12,
              padding: "9px 0",
              borderBottom: "1px solid var(--line-soft)",
            }}
          >
            <span style={{ ...mono, fontSize: 8.5, color: "var(--dim)" }}>
              {d.label}
            </span>
            <div
              style={{
                height: 5,
                background: "var(--surface-3)",
                border: "1px solid var(--line)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: mounted ? `${d.score}%` : "0%",
                  background: d.weak ? "var(--pivot)" : "var(--go)",
                  transition: `width 0.85s cubic-bezier(0.2, 0, 0.1, 1) ${i * 110}ms`,
                }}
              />
            </div>
            <span style={{ ...mono, fontSize: 11, fontWeight: 600, color: "var(--ink)", textAlign: "right" }}>
              {d.score}
            </span>
          </div>
        ))}
      </div>

      {/* Score / confidence / signals */}
      <div
        style={{
          display: "flex",
          gap: 20,
          ...mono,
          fontSize: 9,
          marginBottom: 8,
        }}
      >
        <span>
          Score{" "}
          <strong style={{ color: "var(--go)", fontVariantNumeric: "tabular-nums" }}>
            {displayScore}
          </strong>
        </span>
        <span>
          Confidence <strong style={{ color: "var(--ink)" }}>91%</strong>
        </span>
        <span>
          Signals <strong style={{ color: "var(--ink)" }}>34</strong>
        </span>
      </div>

      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <LastValidatedBadge />
        <Link
          href="/v/9f7ffdd3-af26-4744-be10-0b552035eb2a"
          style={{
            ...mono,
            fontSize: 9,
            color: "var(--go)",
            textDecoration: "none",
            letterSpacing: "0.06em",
          }}
        >
          → See what a verdict looks like
        </Link>
      </div>
    </div>
  );
}
