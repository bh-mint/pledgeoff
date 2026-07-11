"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
} from "recharts";

// ── Dimensions BarChart ──────────────────────────────────────────────────────

type Dimension = { name: string; score: number; weight: number };

function dimColor(score: number): string {
  if (score >= 60) return "var(--go)";
  if (score >= 45) return "var(--pivot)";
  return "var(--kill)";
}

export function DimensionsBarChart({ dimensions }: { dimensions: Dimension[] }) {
  const data = dimensions.map((d) => ({
    name: d.name.length > 14 ? d.name.slice(0, 13) + "…" : d.name,
    score: d.score,
  }));
  return (
    <div className="rpt-chart-wrap no-print" style={{ width: "100%", height: 130 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, bottom: 0, left: 0 }}>
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9, fontFamily: "var(--font-chivo-mono)", fill: "var(--faint)" }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fontFamily: "var(--font-chivo-mono)", fill: "var(--dim)" }} tickLine={false} axisLine={false} width={90} />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            contentStyle={{ fontFamily: "var(--font-chivo-mono)", fontSize: 10, border: "1px solid var(--line)", background: "var(--surface)", borderRadius: 0, boxShadow: "none" }}
          />
          <ReferenceLine x={75} stroke="var(--faint)" strokeDasharray="3 3" label={{ value: "75", position: "insideTopRight", fontSize: 8, fill: "var(--faint)", fontFamily: "var(--font-chivo-mono)" }} />
          <Bar
            dataKey="score"
            radius={0}
            maxBarSize={14}
            isAnimationActive="auto"
            animationDuration={800}
            animationEasing="ease-out"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={dimColor(entry.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Sentiment PieChart ───────────────────────────────────────────────────────

type SentimentData = { positive: number; neutral: number; negative: number };

export function SentimentChart({ sentiment }: { sentiment: SentimentData }) {
  const total = sentiment.positive + sentiment.neutral + sentiment.negative;
  if (total === 0) return null;
  const data = [
    { name: "Positive", value: sentiment.positive, color: "var(--go)" },
    { name: "Neutral", value: sentiment.neutral, color: "var(--faint)" },
    { name: "Negative", value: sentiment.negative, color: "var(--kill)" },
  ].filter((d) => d.value > 0);
  return (
    <div className="rpt-chart-wrap no-print" style={{ width: "100%", height: 110, display: "flex", alignItems: "center", gap: 16 }}>
      <ResponsiveContainer width={110} height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={28}
            outerRadius={48}
            dataKey="value"
            strokeWidth={0}
            isAnimationActive="auto"
            animationDuration={800}
            animationEasing="ease-out"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ fontFamily: "var(--font-chivo-mono)", fontSize: 10, border: "1px solid var(--line)", background: "var(--surface)", borderRadius: 0, boxShadow: "none" }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="rpt-sent-legend">
        {data.map((d) => (
          <div key={d.name} className="rpt-sent-leg-row">
            <span className="rpt-sent-dot" style={{ background: d.color }} />
            <span className="rpt-sent-lbl">{d.name}</span>
            <span className="rpt-sent-pct">{Math.round((d.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Revenue BarChart ─────────────────────────────────────────────────────────

type Scenario = { name: string; mrr6: number; mrr12: number; mrr24: number };

function fmtK(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n}`;
}

const SCENARIO_COLORS: Record<string, string> = {
  conservative: "var(--faint)",
  moderate: "var(--pivot)",
  optimistic: "var(--go)",
};

export function RevenueBarChart({ scenarios }: { scenarios: Scenario[] }) {
  const data = [
    { month: "MRR 6m", ...Object.fromEntries(scenarios.map((s) => [s.name, s.mrr6])) },
    { month: "MRR 12m", ...Object.fromEntries(scenarios.map((s) => [s.name, s.mrr12])) },
    { month: "MRR 24m", ...Object.fromEntries(scenarios.map((s) => [s.name, s.mrr24])) },
  ];
  return (
    <div className="rpt-chart-wrap no-print" style={{ width: "100%", height: 130 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="month" tick={{ fontSize: 9, fontFamily: "var(--font-chivo-mono)", fill: "var(--dim)" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 9, fontFamily: "var(--font-chivo-mono)", fill: "var(--faint)" }} tickLine={false} axisLine={false} tickFormatter={fmtK} width={40} />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            contentStyle={{ fontFamily: "var(--font-chivo-mono)", fontSize: 10, border: "1px solid var(--line)", background: "var(--surface)", borderRadius: 0, boxShadow: "none" }}
          />
          {scenarios.map((s) => (
            <Bar
              key={s.name}
              dataKey={s.name}
              fill={SCENARIO_COLORS[s.name] ?? "var(--dim)"}
              maxBarSize={20}
              radius={0}
              isAnimationActive="auto"
              animationDuration={800}
              animationEasing="ease-out"
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
