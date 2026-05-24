"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { OutcomeType } from "@pledgeoff/core";

const OPTIONS: Array<{ type: OutcomeType; label: string }> = [
  { type: "built_worked", label: "Built it — worked" },
  { type: "built_failed", label: "Built it — didn't work" },
  { type: "not_built", label: "Didn't build it" },
];

interface OutcomeBannerProps {
  ideaId: string;
  daysOld: number;
}

export function OutcomeBanner({ ideaId, daysOld }: OutcomeBannerProps) {
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function report(type: OutcomeType) {
    setSaving(true);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    await fetch(`/api/v1/ideas/${ideaId}/outcome`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ outcomeType: type }),
    });
    setSaving(false);
    setDone(true);
  }

  if (done) return null;

  return (
    <div
      style={{
        background: "rgba(232,179,65,0.06)",
        borderBottom: "1px solid rgba(232,179,65,0.2)",
      }}
    >
      <div className="max-w-360 mx-auto px-4 sm:px-8 py-2.5 flex items-center gap-3 flex-wrap">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: "var(--caution)" }}
        />
        <p className="text-[13px] flex-1 min-w-0" style={{ color: "var(--caution)" }}>
          This idea is{" "}
          <span className="font-medium">{daysOld} days old.</span> How did it go?
        </p>

        {!expanded ? (
          <button
            onClick={() => setExpanded(true)}
            className="mono text-[11px] shrink-0 transition-opacity hover:opacity-70"
            style={{ color: "var(--caution)" }}
          >
            Tell us →
          </button>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {OPTIONS.map((opt) => (
              <button
                key={opt.type}
                onClick={() => report(opt.type)}
                disabled={saving}
                className="mono text-[11px] px-3 h-7 rounded border transition-all shrink-0"
                style={{
                  borderColor: "rgba(232,179,65,0.35)",
                  color: saving ? "var(--t3)" : "var(--caution)",
                  background: "rgba(232,179,65,0.05)",
                  cursor: saving ? "wait" : "pointer",
                }}
              >
                {saving ? "Saving…" : opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
