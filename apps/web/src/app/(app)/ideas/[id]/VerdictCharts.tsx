"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  type DotItemDotProps,
} from "recharts";
import type { ReactNode } from "react";
import type { Dimension } from "@pledgeoff/core";

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
