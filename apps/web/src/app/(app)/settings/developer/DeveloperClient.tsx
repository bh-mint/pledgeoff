"use client";

import { ApiKeySection } from "../ApiKeySection";

export function DeveloperClient() {
  return (
    <div>
      <h1
        className="display text-[28px] font-semibold tracking-tight mb-1"
        style={{ color: "var(--t1)" }}
      >
        Developer
      </h1>
      <p className="text-[13px] mb-10" style={{ color: "var(--t2)" }}>
        Programmatic access to PledgeOFF. Use API keys to submit ideas and retrieve decisions from your own tools.
      </p>

      <ApiKeySection />
    </div>
  );
}
