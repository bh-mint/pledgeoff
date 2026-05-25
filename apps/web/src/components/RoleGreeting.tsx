"use client";

import { useState } from "react";

const ROLE_MESSAGES: Record<string, { headline: string; sub: string }> = {
  indie: {
    headline: "Built for solo builders.",
    sub: "Validate before you code. Kill bad ideas early. Ship what the market actually wants.",
  },
  pm: {
    headline: "Gate the roadmap with evidence.",
    sub: "One validation per idea. GO, KILL, or PIVOT — before it hits the sprint.",
  },
  agency: {
    headline: "Vet client briefs before you pitch.",
    sub: "Run validation across multiple briefs in parallel. Show clients data, not opinions. White-label reports available on Studio.",
  },
};

function readRoleMessage(): { headline: string; sub: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const role = localStorage.getItem("pledgeoff_role");
    if (role && ROLE_MESSAGES[role]) return ROLE_MESSAGES[role]!;
  } catch { /* ignore */ }
  return null;
}

export function RoleGreeting() {
  const [msg] = useState<{ headline: string; sub: string } | null>(readRoleMessage);

  if (!msg) return null;

  return (
    <div
      className="rounded-md border px-5 py-4 mb-4"
      style={{
        borderColor: "color-mix(in srgb, var(--accent) 20%, transparent)",
        background: "color-mix(in srgb, var(--accent) 4%, transparent)",
      }}
    >
      <div className="display text-[14px] font-semibold mb-0.5" style={{ color: "var(--t1)" }}>
        {msg.headline}
      </div>
      <p className="text-[12px] leading-[1.55]" style={{ color: "var(--t2)" }}>
        {msg.sub}
      </p>
    </div>
  );
}
