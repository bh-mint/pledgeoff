"use client";

import { ApiKeySection } from "../ApiKeySection";
import { WebhookConfigSection } from "@/components/WebhookConfigSection";

export function DeveloperClient() {
  return (
    <div>
      <ApiKeySection />
      <WebhookConfigSection />
    </div>
  );
}
