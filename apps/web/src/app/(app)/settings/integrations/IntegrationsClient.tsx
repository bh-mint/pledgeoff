"use client";

import { useState, useEffect } from "react";
import { getAuthToken } from "@/lib/auth-client";
import { GitHubConnectCard } from "@/components/engineering/GitHubConnectCard";

type Props = {
  githubParam?: string | null;
};

export function IntegrationsClient({ githubParam }: Props) {
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubOrg, setGithubOrg] = useState<string | undefined>(undefined);

  useEffect(() => {
    void (async () => {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch("/api/v1/engineering/snapshot", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = (await res.json()) as {
          data: { githubOrg: string } | null;
        };
        if (json.data) {
          setGithubConnected(true);
          setGithubOrg(json.data.githubOrg);
        }
      }
    })();
  }, []);

  return (
    <div>
      <h1
        className="display text-[28px] font-semibold tracking-tight mb-1"
        style={{ color: "var(--t1)" }}
      >
        Integrations
      </h1>
      <p className="text-[13px] mb-8" style={{ color: "var(--t2)" }}>
        Connect your existing tools so PledgeOFF can give you context-aware decisions — not just generic advice.
      </p>

      {githubParam === "connected" && (
        <div
          className="mb-6 rounded-lg border px-4 py-3 text-sm"
          style={{
            background: "#0d1f0d",
            borderColor: "var(--validated)",
            color: "var(--validated)",
          }}
        >
          GitHub connected successfully. Velocity metrics will be available
          shortly.
        </div>
      )}
      {githubParam === "error" && (
        <div
          className="mb-6 rounded-lg border px-4 py-3 text-sm"
          style={{
            background: "#1f0d0d",
            borderColor: "var(--kill)",
            color: "var(--kill)",
          }}
        >
          GitHub connection failed. Please try again.
        </div>
      )}

      <GitHubConnectCard
        isConnected={githubConnected}
        githubOrg={githubOrg}
        onDisconnect={() => {
          setGithubConnected(false);
          setGithubOrg(undefined);
        }}
      />
    </div>
  );
}
