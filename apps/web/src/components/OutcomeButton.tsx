"use client";

import { useState } from "react";
import type { OutcomeType } from "@pledgeoff/core";

const OPTIONS: Array<{ type: OutcomeType; label: string; color: string }> = [
  { type: "built_worked", label: "Built it — worked", color: "var(--go)" },
  { type: "built_failed", label: "Built it — didn't work", color: "var(--kill)" },
  { type: "not_built",    label: "Didn't build it", color: "var(--t3)" },
];

interface OutcomeButtonProps {
  ideaId: string;
  initialOutcome: OutcomeType | null;
}

export function OutcomeButton({ ideaId, initialOutcome }: OutcomeButtonProps) {
  const [current, setCurrent] = useState<OutcomeType | null>(initialOutcome);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function report(type: OutcomeType) {
    setSaving(true);
    setOpen(false);
    try {
      await fetch(`/api/v1/ideas/${ideaId}/outcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcomeType: type }),
      });
      setCurrent(type);
    } finally {
      setSaving(false);
    }
  }

  const active = OPTIONS.find((o) => o.type === current);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: active ? active.color : "var(--t2)",
          fontSize: 12,
          fontFamily: "monospace",
          cursor: saving ? "wait" : "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: 14 }}>{current ? "✓" : "○"}</span>
        {saving ? "Saving…" : active ? active.label : "How did it go?"}
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0,
          zIndex: 50,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "6px",
          minWidth: 210,
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
        }}>
          {OPTIONS.map((opt) => (
            <button
              key={opt.type}
              onClick={() => report(opt.type)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                borderRadius: 6,
                border: "none",
                background: current === opt.type ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "transparent",
                color: opt.color,
                fontSize: 12,
                fontFamily: "monospace",
                cursor: "pointer",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
