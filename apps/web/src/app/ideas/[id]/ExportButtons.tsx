"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Plan } from "@pledgeoff/core";

interface Props {
  ideaId: string;
  plan: Plan;
}

export function ExportButtons({ ideaId, plan }: Props) {
  const [jsonLoading, setJsonLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  async function downloadJson() {
    setJsonLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
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

  async function downloadPdf() {
    setPdfLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/v1/ideas/${ideaId}/pdf`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${ideaId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {(plan === "studio" || plan === "enterprise") ? (
        <button
          onClick={downloadPdf}
          disabled={pdfLoading}
          className="mono text-[10px] px-3 py-1.5 rounded transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ border: "1px solid var(--border)", color: "var(--t2)" }}
        >
          {pdfLoading ? "Generating…" : "White-label PDF"}
        </button>
      ) : (
        <a
          href={`/ideas/${ideaId}/report?print=1`}
          target="_blank"
          rel="noopener noreferrer"
          className="mono text-[10px] px-3 py-1.5 rounded transition-opacity hover:opacity-80"
          style={{ border: "1px solid var(--border)", color: "var(--t2)" }}
        >
          Export PDF ↗
        </a>
      )}
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
