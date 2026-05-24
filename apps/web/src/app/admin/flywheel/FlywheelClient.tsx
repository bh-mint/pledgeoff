"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Period = "3m" | "6m" | "1y" | "all";

const PERIODS: { key: Period; label: string }[] = [
  { key: "3m", label: "3 months" },
  { key: "6m", label: "6 months" },
  { key: "1y", label: "1 year" },
  { key: "all", label: "All time" },
];

export function PeriodSelector({ current }: { current: Period }) {
  const router = useRouter();
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {PERIODS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => router.push(`?period=${key}`)}
          style={{
            fontFamily: "monospace",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            padding: "4px 10px",
            borderRadius: 4,
            border: `1px solid ${current === key ? "var(--accent)" : "var(--border)"}`,
            background: current === key ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent",
            color: current === key ? "var(--accent)" : "var(--t3)",
            cursor: "pointer",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function ExportCsvButton({ period }: { period: Period }) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/flywheel/export?period=${period}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `flywheel-outcomes-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      style={{
        fontFamily: "monospace",
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        padding: "4px 12px",
        borderRadius: 4,
        border: "1px solid var(--border)",
        background: "transparent",
        color: "var(--t2)",
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.5 : 1,
      }}
    >
      {loading ? "exporting…" : "export csv ↓"}
    </button>
  );
}
