"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
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
import type { Dimension, Simulation } from "@pledgeoff/core";

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
