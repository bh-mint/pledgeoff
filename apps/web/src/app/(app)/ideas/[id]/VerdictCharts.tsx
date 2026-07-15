"use client";

import {
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useEffect, useState, type ReactNode } from "react";
import type { Competitor, Dimension, Simulation } from "@pledgeoff/core";
import { useInView, usePrefersReducedMotion, useCountUp } from "@/lib/motion";

/**
 * Holds the chart mount until the wrapper scrolls into view, so the entrance
 * animation plays where the user can see it instead of burning at page load.
 * The fixed height reserves the layout slot — no shift when the chart lands.
 */
function ChartReveal({ height, children }: { height: number; children: ReactNode }): ReactNode {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} style={{ width: "100%", height }}>
      {inView ? children : null}
    </div>
  );
}

function dotColor(score: number): string {
  if (score >= 75) return "var(--go)";
  if (score >= 50) return "var(--pivot)";
  return "var(--kill)";
}

// ── Dimension Profile — gauge cluster, one needle-sweep dial per dimension ──

const GAUGE_CX = 65;
const GAUGE_CY = 66;
const GAUGE_R = 54;
const GAUGE_STROKE = 9;

/** Point on the gauge's semicircle for a 0–100 value (180°=left/0 → 0°=right/100). */
function gaugePoint(value: number, r: number): { x: number; y: number } {
  const theta = (Math.PI * (180 - (value / 100) * 180)) / 180;
  return { x: GAUGE_CX + r * Math.cos(theta), y: GAUGE_CY - r * Math.sin(theta) };
}

function gaugeArcPath(fromValue: number, toValue: number, r: number): string {
  const from = gaugePoint(fromValue, r);
  const to = gaugePoint(toValue, r);
  // Both points sit on the same upper semicircle (theta in [0,180]), so the
  // sweep between them never exceeds 180° — the large-arc flag must stay 0,
  // otherwise SVG draws the arc through the lower half-circle, which falls
  // outside the viewBox and renders as a disconnected, clipped stub.
  return `M ${from.x} ${from.y} A ${r} ${r} 0 0 1 ${to.x} ${to.y}`;
}

function DimensionGauge({ name, score, index }: { name: string; score: number; index: number }): ReactNode {
  const reduced = usePrefersReducedMotion();
  const [armed, setArmed] = useState(false);
  const delay = 150 + index * 110;
  // Needle tip is recomputed from the same gaugePoint() the arcs use, every
  // frame of the count-up — this is what guarantees the needle always lands
  // exactly on the arc, instead of drifting from a CSS transform pivot that
  // doesn't line up with the SVG's own coordinate space once it's scaled.
  const { value: needleValue } = useCountUp(score, { duration: 900, delay });

  useEffect(() => {
    const t = setTimeout(() => setArmed(true), reduced ? 0 : delay);
    return () => clearTimeout(t);
  }, [reduced, delay]);

  const color = dotColor(score);
  const tip = gaugePoint(needleValue, GAUGE_R - 10);
  const benchmarkOuter = gaugePoint(75, GAUGE_R + 7);
  const benchmarkInner = gaugePoint(75, GAUGE_R - 2);

  return (
    <div className={`vrd-gauge${armed ? " armed" : ""}`}>
      <svg viewBox="0 0 130 76" width="100%" height="86" aria-hidden="true">
        <path
          d={gaugeArcPath(0, 100, GAUGE_R)}
          fill="none"
          stroke="var(--line)"
          strokeWidth={GAUGE_STROKE}
          strokeLinecap="round"
        />
        <path
          d={gaugeArcPath(0, score, GAUGE_R)}
          fill="none"
          stroke={color}
          strokeWidth={GAUGE_STROKE}
          strokeLinecap="round"
        />
        {/* 75 benchmark tick */}
        <line
          x1={benchmarkOuter.x}
          y1={benchmarkOuter.y}
          x2={benchmarkInner.x}
          y2={benchmarkInner.y}
          stroke="var(--faint)"
          strokeWidth={1.5}
        />
        <line
          x1={GAUGE_CX}
          y1={GAUGE_CY}
          x2={tip.x}
          y2={tip.y}
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle cx={GAUGE_CX} cy={GAUGE_CY} r={4} fill={color} />
      </svg>
      <span className="vrd-gauge-name">{name}</span>
      <span className="vrd-gauge-num" style={{ color }}>{score}</span>
    </div>
  );
}

export function DimensionRadarChart({
  dimensions,
  verdict,
}: {
  dimensions: Dimension[];
  verdict: string;
}): ReactNode {
  if (dimensions.length < 3) return null;

  const verdictColor =
    verdict === "GO" ? "var(--go)" : verdict === "PIVOT" ? "var(--pivot)" : "var(--kill)";

  return (
    <div className="vrd-chart-wrap no-print">
      <div className="bc-hd">
        <span>Dimension Profile</span>
        <span className="r">instrument cluster · 75 benchmark</span>
      </div>
      <div className="vrd-chart-body">
        <ChartReveal height={150}>
          <div className="vrd-gauge-row">
            {dimensions.map((d, i) => (
              <DimensionGauge key={d.name} name={d.name} score={d.score} index={i} />
            ))}
          </div>
        </ChartReveal>
        <div className="vrd-gauge-verdict">
          Composite verdict <b style={{ color: verdictColor }}>{verdict}</b>
        </div>
      </div>
    </div>
  );
}

// ── Revenue Area Chart ────────────────────────────────────────────────────────

function fmtMRR(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export function RevenueAreaChart({ simulation }: { simulation: Simulation }): ReactNode {
  const cons = simulation.scenarios.find((s) => s.name === "conservative");
  const mod  = simulation.scenarios.find((s) => s.name === "moderate");
  const opt  = simulation.scenarios.find((s) => s.name === "optimistic");

  if (!cons || !mod || !opt) return null;

  const data = [
    { month: 0,  conservative: 0,        moderate: 0,       optimistic: 0 },
    { month: 6,  conservative: cons.mrr6,  moderate: mod.mrr6,  optimistic: opt.mrr6 },
    { month: 12, conservative: cons.mrr12, moderate: mod.mrr12, optimistic: opt.mrr12 },
    { month: 24, conservative: cons.mrr24, moderate: mod.mrr24, optimistic: opt.mrr24 },
  ];

  const showBreakEven = simulation.breakEvenMonths >= 1 && simulation.breakEvenMonths <= 24;

  const tooltipStyle = {
    fontFamily: "var(--font-chivo-mono)",
    fontSize: 10,
    border: "1px solid var(--line)",
    background: "var(--surface)",
    borderRadius: 0,
    boxShadow: "none",
  };

  return (
    <ChartReveal height={200}>
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 4 }}>
        <CartesianGrid stroke="var(--line)" strokeWidth={0.75} vertical={false} />
        <XAxis
          dataKey="month"
          type="number"
          domain={[0, 24]}
          ticks={[0, 6, 12, 24]}
          tickFormatter={(v: number) => v === 0 ? "Start" : `${v}mo`}
          tick={{ fontSize: 9, fontFamily: "var(--font-chivo-mono)", fill: "var(--faint)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={fmtMRR}
          tick={{ fontSize: 9, fontFamily: "var(--font-chivo-mono)", fill: "var(--faint)" }}
          tickLine={false}
          axisLine={false}
          width={42}
        />
        {showBreakEven && (
          <ReferenceLine
            x={simulation.breakEvenMonths}
            stroke="var(--go)"
            strokeDasharray="3 3"
            strokeWidth={1.5}
            label={{
              value: "↑ Break-even",
              position: "insideTopRight",
              fontSize: 8,
              fontFamily: "var(--font-chivo-mono)",
              fill: "var(--go)",
            }}
          />
        )}
        <Area
          type="monotone"
          dataKey="conservative"
          name="Conservative"
          stroke="var(--faint)"
          strokeWidth={1.5}
          fill="var(--faint)"
          fillOpacity={0.08}
          dot={false}
          isAnimationActive="auto"
          animationDuration={900}
          animationEasing="ease-out"
        />
        <Area
          type="monotone"
          dataKey="moderate"
          name="Moderate"
          stroke="var(--pivot)"
          strokeWidth={1.5}
          fill="var(--pivot)"
          fillOpacity={0.12}
          dot={false}
          isAnimationActive="auto"
          animationDuration={1100}
          animationEasing="ease-out"
        />
        <Area
          type="monotone"
          dataKey="optimistic"
          name="Optimistic"
          stroke="var(--go)"
          strokeWidth={2}
          fill="var(--go)"
          fillOpacity={0.15}
          dot={false}
          isAnimationActive="auto"
          animationDuration={1300}
          animationEasing="ease-out"
        />
        <Legend
          iconSize={8}
          iconType="circle"
          wrapperStyle={{
            fontFamily: "var(--font-chivo-mono)",
            fontSize: 9,
            paddingTop: 8,
            color: "var(--dim)",
          }}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name) => [fmtMRR(Number(value)) + "/mo", String(name ?? "")]}
          labelFormatter={(label) => Number(label) === 0 ? "Start" : `Month ${Number(label)}`}
        />
      </AreaChart>
    </ResponsiveContainer>
    </ChartReveal>
  );
}

// ── Competitor Positioning Map ────────────────────────────────────────────────

const COMPETITOR_PALETTE = [
  "#3b7ed6", "#7c5cbf", "#e07b39", "#1a9e5a",
  "#d94040", "#c4a028", "#2a9cb5", "#8b4513",
];

function parsePrice(raw: string): number | null {
  const s = raw.toLowerCase().trim();
  if (["free", "freemium", "open source", "open-source"].includes(s)) return 0;
  if (["custom", "enterprise", "contact", "on request", "negotiated"].some((k) => s.includes(k))) return null;
  const range = s.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  if (range) return (parseFloat(range[1]) + parseFloat(range[2])) / 2;
  const single = s.match(/(\d+(?:\.\d+)?)/);
  return single ? parseFloat(single[1]) : null;
}

function segmentToY(targetSegment: string | undefined): 0 | 1 | 2 {
  if (!targetSegment) return 1;
  const s = targetSegment.toLowerCase();
  const b2bTerms = ["enterprise", "team", "business", "b2b", "smb", "compan", "startup", "agency", "professional", "developer"];
  const b2cTerms = ["consumer", "b2c", "personal", "individual", "freelance", "creator", "end user"];
  const isB2B = b2bTerms.some((t) => s.includes(t));
  const isB2C = b2cTerms.some((t) => s.includes(t));
  if (isB2B && !isB2C) return 2;
  if (isB2C && !isB2B) return 0;
  return 1;
}

type CompetitorPoint = {
  x: number;
  y: 0 | 1 | 2;
  name: string;
  priceStr: string;
  positioning: string;
};

// ── Score Breakdown — radial contribution donut ─────────────────────────────

type WfEntry = { name: string; contrib: number; weight: number; fill: string };

function contribColor(contrib: number, weight: number): string {
  if (contrib >= weight * 75) return "var(--go)";
  if (contrib >= weight * 50) return "var(--pivot)";
  return "var(--kill)";
}

export function ScoreWaterfallChart({
  dimensions,
  score,
}: {
  dimensions: Dimension[];
  score: number;
}): ReactNode {
  if (dimensions.length === 0) return null;

  const verdictColor = score >= 75 ? "var(--go)" : score >= 50 ? "var(--pivot)" : "var(--kill)";

  const contributions: WfEntry[] = dimensions.map((d) => {
    const contrib = Math.round(d.weight * d.score);
    return { name: d.name, contrib, weight: d.weight, fill: contribColor(contrib, d.weight) };
  });

  const remainder = Math.max(0, 100 - score);
  const pieData = [
    ...contributions.map((c) => ({ name: c.name, value: c.contrib, fill: c.fill })),
    ...(remainder > 0 ? [{ name: "Remaining", value: remainder, fill: "var(--line)" }] : []),
  ];

  const tooltipStyle = {
    fontFamily: "var(--font-chivo-mono)",
    fontSize: 10,
    border: "1px solid var(--line)",
    background: "var(--surface)",
    borderRadius: 0,
    boxShadow: "none",
    padding: "8px 12px",
  };

  return (
    <div className="vrd-chart-wrap no-print">
      <div className="bc-hd">
        <span>Score Breakdown</span>
        <span className="r">radial · weighted contribution</span>
      </div>
      <div className="vrd-chart-body">
        <ChartReveal height={200}>
          <div style={{ position: "relative", width: "100%", height: 200 }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="64%"
                  outerRadius="94%"
                  startAngle={90}
                  endAngle={-270}
                  strokeWidth={0}
                  isAnimationActive="auto"
                  animationDuration={900}
                  animationEasing="ease-out"
                >
                  {pieData.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  content={(props) => {
                    if (!props.active || !props.payload?.length) return null;
                    const p = (props.payload[0] as { payload: { name: string } }).payload;
                    if (p.name === "Remaining") return null;
                    const dim = contributions.find((c) => c.name === p.name);
                    if (!dim) return null;
                    return (
                      <div style={tooltipStyle}>
                        <div style={{ fontWeight: 700, color: "var(--ink)" }}>{dim.name}</div>
                        <div style={{ color: "var(--dim)", marginTop: 2 }}>+{dim.contrib} pts · weight {Math.round(dim.weight * 100)}%</div>
                        <div style={{ color: "var(--faint)", marginTop: 2 }}>dim score {Math.round(dim.contrib / dim.weight)} / 100</div>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="vrd-donut-center" aria-hidden="true">
              <span className="vrd-donut-num" style={{ color: verdictColor }}>{score}</span>
              <span className="vrd-donut-lbl">/ 100 total</span>
            </div>
          </div>
        </ChartReveal>
        <div className="vrd-ring-legend">
          {contributions.map((c) => (
            <div key={c.name} className="vrd-ring-leg-row">
              <span className="vrd-ring-dot" style={{ background: c.fill }} />
              <span className="vrd-ring-leg-name">{c.name}</span>
              <span className="vrd-ring-leg-val" style={{ color: c.fill }}>+{c.contrib}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Competitor Positioning Map ────────────────────────────────────────────────

export function CompetitorPositioningMap({ competitors }: { competitors: Competitor[] }): ReactNode {
  if (competitors.length === 0) return null;

  const points: CompetitorPoint[] = [];
  for (const c of competitors) {
    if (!c.estimatedPrice) continue;
    const price = parsePrice(c.estimatedPrice);
    if (price === null) continue;
    points.push({
      x: price,
      y: segmentToY(c.targetSegment),
      name: c.name,
      priceStr: c.estimatedPrice,
      positioning: c.positioning,
    });
  }

  if (points.length === 0 || points.length < Math.ceil(competitors.length / 2)) {
    return (
      <div className="no-print" style={{ padding: "10px 14px", border: "1px solid var(--line)", background: "var(--surface)", fontFamily: "var(--font-chivo-mono)", fontSize: 10, color: "var(--faint)", fontStyle: "italic" }}>
        Add pricing data to competitors for positioning map
      </div>
    );
  }

  const maxX = Math.max(...points.map((p) => p.x), 10);
  const xDomain: [number, number] = [0, Math.ceil(maxX * 1.3)];
  const segLabels = ["B2C", "Mixed", "B2B"] as const;

  return (
    <div className="vrd-chart-wrap no-print">
      <div className="bc-hd">
        <span>Positioning Map</span>
        <span className="r">price vs. segment · {points.length} competitor{points.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="vrd-chart-body">
        <ChartReveal height={220}>
        <ResponsiveContainer width="100%" height={220}>
          <ScatterChart margin={{ top: 16, right: 40, bottom: 16, left: 8 }}>
            <CartesianGrid stroke="var(--line)" strokeWidth={0.75} />
            <XAxis
              dataKey="x"
              type="number"
              name="Price"
              domain={xDomain}
              tickFormatter={(v: number) => v === 0 ? "Free" : `$${v}`}
              tick={{ fontSize: 9, fontFamily: "var(--font-chivo-mono)", fill: "var(--faint)" }}
              tickLine={false}
              axisLine={false}
              label={{ value: "$/month", position: "insideBottomRight", offset: 0, fontSize: 8, fontFamily: "var(--font-chivo-mono)", fill: "var(--faint)" }}
            />
            <YAxis
              dataKey="y"
              type="number"
              domain={[-0.5, 2.5]}
              ticks={[0, 1, 2]}
              tickFormatter={(v) => segLabels[v as 0 | 1 | 2] ?? ""}
              tick={{ fontSize: 9, fontFamily: "var(--font-chivo-mono)", fill: "var(--faint)" }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <ZAxis range={[72, 72]} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3", stroke: "var(--faint)" }}
              content={(props) => {
                if (!props.active || !props.payload?.length) return null;
                const pt = (props.payload[0] as { payload: CompetitorPoint }).payload;
                const seg = segLabels[pt.y] ?? "Mixed";
                return (
                  <div style={{ fontFamily: "var(--font-chivo-mono)", fontSize: 10, border: "1px solid var(--line)", background: "var(--surface)", padding: "8px 12px", maxWidth: 220 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--ink)" }}>{pt.name}</div>
                    <div style={{ color: "var(--dim)", marginBottom: 4 }}>{pt.priceStr} · {seg}</div>
                    <div style={{ color: "var(--faint)", lineHeight: 1.45 }}>
                      {pt.positioning.length > 90 ? pt.positioning.slice(0, 90) + "…" : pt.positioning}
                    </div>
                  </div>
                );
              }}
            />
            <Scatter
              data={points}
              shape="circle"
              isAnimationActive="auto"
              animationDuration={700}
              animationEasing="ease-out"
            >
              {points.map((_, i) => (
                <Cell key={i} fill={COMPETITOR_PALETTE[i % COMPETITOR_PALETTE.length]} />
              ))}
              <LabelList
                dataKey="name"
                position="top"
                style={{ fontSize: 8, fontFamily: "var(--font-chivo-mono)", fill: "var(--dim)" }}
              />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        </ChartReveal>
      </div>
    </div>
  );
}
