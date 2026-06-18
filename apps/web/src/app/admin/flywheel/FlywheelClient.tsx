"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Period = "3m" | "6m" | "1y" | "all";

const PERIODS: { key: Period; label: string }[] = [
  { key: "3m", label: "3M" },
  { key: "6m", label: "6M" },
  { key: "1y", label: "1Y" },
  { key: "all", label: "All" },
];

export function PeriodSelector({ current }: { current: Period }) {
  const router = useRouter();
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {PERIODS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => router.push(`?period=${key}`)}
          className={`btn-xs ${current === key ? "p" : ""}`}
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
    <button onClick={handleExport} disabled={loading} className="btn-xs">
      {loading ? "exporting…" : "Export CSV ↓"}
    </button>
  );
}
