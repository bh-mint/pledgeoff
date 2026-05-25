"use client";

import { useEffect, useState } from "react";

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

export function LastValidatedBadge() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/v1/public/last-validated")
      .then((r) => r.json())
      .then((json) => {
        const ts = (json as { data: { lastValidatedAt: string } | null }).data?.lastValidatedAt;
        if (ts && mounted) setLabel(timeAgo(ts));
      })
      .catch(() => {/* silent */});
    return () => { mounted = false; };
  }, []);

  if (!label) return null;

  return (
    <span className="inline-flex items-center gap-1.5 mono text-[10px]" style={{ color: "var(--t3)" }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--validated)", opacity: 0.8 }} />
      Last validated {label}
    </span>
  );
}
