"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  ideaId: string;
}

export function ExportButtons({ ideaId }: Props) {
  const [jsonLoading, setJsonLoading] = useState(false);

  async function downloadJson() {
    setJsonLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/v1/ideas/${ideaId}/export`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pledgeoff-idea-${ideaId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setJsonLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <a
        href={`/ideas/${ideaId}/report?print=1`}
        target="_blank"
        rel="noopener noreferrer"
        className="mono text-[10px] px-3 py-1.5 rounded transition-opacity hover:opacity-80"
        style={{ border: "1px solid var(--border)", color: "var(--t2)" }}
      >
        Export PDF ↗
      </a>
      <button
        onClick={downloadJson}
        disabled={jsonLoading}
        className="mono text-[10px] px-3 py-1.5 rounded transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ border: "1px solid var(--border)", color: "var(--t2)" }}
      >
        {jsonLoading ? "Exporting…" : "Export JSON"}
      </button>
    </div>
  );
}
