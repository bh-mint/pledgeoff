"use client";

import { ApiKeySection } from "../ApiKeySection";
import { WebhookConfigSection } from "@/components/WebhookConfigSection";

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

      <div className="my-10 h-px" style={{ background: "var(--border)" }} />

      <WebhookConfigSection />
    </div>
  );
}
