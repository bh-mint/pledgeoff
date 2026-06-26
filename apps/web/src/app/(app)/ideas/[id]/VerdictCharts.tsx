"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
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
  type DotItemDotProps,
} from "recharts";
import type { ReactNode } from "react";
import type { Competitor, Dimension, Simulation } from "@pledgeoff/core";

function dotColor(score: number): string {
  if (score >= 75) return "var(--go)";
  if (score >= 50) return "var(--pivot)";
  return "var(--kill)";
}

function renderScoreDot(props: DotItemDotProps): ReactNode {
  const score: number = props.payload?.score ?? 0;
  return (
    <circle
      key={props.index}
      cx={props.cx ?? 0}
      cy={props.cy ?? 0}
      r={4}
      fill={dotColor(score)}
      stroke="var(--surface)"
      strokeWidth={1.5}
    />
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

  const data = dimensions.map((d) => ({
    dim: d.name,
    score: d.score,
    threshold: 75,
  }));

  const strokeColor =
    verdict === "GO" ? "var(--go)" : verdict === "PIVOT" ? "var(--pivot)" : "var(--kill)";

  return (
    <div className="vrd-chart-wrap no-print">
      <div className="bc-hd">
        <span>Dimension Profile</span>
        <span className="r">radar · threshold 75</span>
      </div>
      <div className="vrd-chart-body">
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={data} margin={{ top: 20, right: 48, bottom: 20, left: 48 }}>
            <PolarGrid stroke="var(--line)" strokeWidth={0.75} />
            <PolarAngleAxis
              dataKey="dim"
              tick={{
                fontSize: 9.5,
                fontFamily: "var(--font-chivo-mono)",
                fill: "var(--dim)",
                fontWeight: 600,
                letterSpacing: 1,
              }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tickCount={5}
              tick={{ fontSize: 7.5, fontFamily: "var(--font-chivo-mono)", fill: "var(--faint)" }}
              axisLine={false}
              tickLine={false}
            />
            <Radar
              name="Threshold"
              dataKey="threshold"
              stroke="var(--go-line)"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              fill="transparent"
              isAnimationActive={false}
              dot={false}
              legendType="none"
            />
            <Radar
              name="Score"
              dataKey="score"
              stroke={strokeColor}
              strokeWidth={2}
              fill={strokeColor}
              fillOpacity={0.15}
              dot={renderScoreDot}
              isAnimationActive="auto"
              animationBegin={200}
              animationDuration={900}
              animationEasing="ease-out"
              legendType="none"
            />
            <Tooltip
              contentStyle={{
                fontFamily: "var(--font-chivo-mono)",
                fontSize: 10,
                border: "1px solid var(--line)",
                background: "var(--surface)",
                borderRadius: 0,
                boxShadow: "none",
              }}
              formatter={(value, name) =>
                name === "Threshold" ? null : [`${Number(value)} / 100`, "Score"]
              }
            />
          </RadarChart>
        </ResponsiveContainer>
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
            <Scatter data={points} shape="circle">
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
      </div>
    </div>
  );
}
