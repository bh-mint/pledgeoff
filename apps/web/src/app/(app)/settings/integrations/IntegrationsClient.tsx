"use client";

import { useState, useEffect } from "react";
import { getAuthToken } from "@/lib/auth-client";
import { GitHubConnectCard } from "@/components/engineering/GitHubConnectCard";

type Props = {
  githubParam?: string | null;
  loginProvider?: string;
  plan?: string;
};

function SlackSection({ plan }: { plan: string }) {
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isTeamPlus = ["team", "studio", "enterprise"].includes(plan);

  useEffect(() => {
    void (async () => {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch("/api/v1/teams/slack-webhook", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = (await res.json()) as { data: { webhookUrl: string | null } };
        const url = json.data?.webhookUrl ?? "";
        setSaved(url || null);
        setWebhookUrl(url);
      }
    })();
  }, []);

  const handleSave = async (test = false) => {
    if (test) setTesting(true);
    else setSaving(true);
    setError(null);
    setTestResult(null);

    const token = await getAuthToken();
    if (!token) { setSaving(false); setTesting(false); return; }

    const res = await fetch("/api/v1/teams/slack-webhook", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ webhookUrl: webhookUrl.trim() || null, test }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: { code?: string } };
      setError(body.error?.code === "VALIDATION_FAILED" ? "Invalid Slack webhook URL — must start with https://hooks.slack.com/" : "Failed to save. Please try again.");
    } else {
      const json = (await res.json()) as { data: { webhookUrl: string | null; testOk?: boolean } };
      setSaved(json.data.webhookUrl);
      if (test) setTestResult(json.data.testOk ? "ok" : "fail");
    }

    setSaving(false);
    setTesting(false);
  };

  if (!isTeamPlus) {
    return (
      <div className="rounded-lg border p-6" style={{ background: "var(--surface)", borderColor: "var(--line)", opacity: 0.65 }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-medium" style={{ color: "var(--ink)" }}>Slack Integration</h3>
            <p className="mt-1 text-sm" style={{ color: "var(--dim)" }}>
              Get notified in Slack when analysis tools complete.
            </p>
          </div>
          <span className="mono text-[10px] px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--line)", color: "var(--faint)" }}>
            Team+
          </span>
        </div>
        <p className="mt-3 text-xs" style={{ color: "var(--faint)" }}>Upgrade to Team or higher to connect Slack.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-6" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-sm font-medium" style={{ color: "var(--ink)" }}>
            Slack Integration
            {saved && <span className="ml-2 text-[10px] mono" style={{ color: "var(--validated)" }}>● Connected</span>}
          </h3>
          <p className="mt-1 text-sm" style={{ color: "var(--dim)" }}>
            Receive a message when Competitor Analysis, Market Landscape, or Battlecard is ready.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        <input
          type="url"
          value={webhookUrl}
          onChange={(e) => { setWebhookUrl(e.target.value); setTestResult(null); }}
          placeholder="https://hooks.slack.com/services/..."
          className="finp"
          style={{ flex: 1, fontSize: 12, fontFamily: "var(--mono)" }}
        />
        <button
          className="btn-g"
          onClick={() => void handleSave(false)}
          disabled={saving || testing || webhookUrl.trim() === (saved ?? "")}
          style={{ fontSize: 12, padding: "0 14px" }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && webhookUrl.trim() === saved && (
          <button
            className="btn-g"
            onClick={() => void handleSave(true)}
            disabled={testing || saving}
            style={{ fontSize: 12, padding: "0 14px" }}
          >
            {testing ? "Sending…" : "Test →"}
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-xs" style={{ color: "var(--caution)" }}>{error}</p>}
      {testResult === "ok" && <p className="mt-2 text-xs" style={{ color: "var(--validated)" }}>Test message sent to Slack</p>}
      {testResult === "fail" && <p className="mt-2 text-xs" style={{ color: "var(--caution)" }}>Slack returned an error — check the webhook URL in your Slack app settings.</p>}

      {saved && (
        <button
          onClick={() => { if (confirm("Remove the Slack connection? You'll stop getting alerts until you reconnect.")) { setWebhookUrl(""); void handleSave(false); } }}
          className="mt-3 text-xs"
          style={{ color: "var(--kill)", background: "none", border: "none", padding: 0, cursor: "pointer" }}
        >
          Remove connection
        </button>
      )}
    </div>
  );
}

export function IntegrationsClient({ githubParam, loginProvider, plan = "free" }: Props) {
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
        style={{ color: "var(--ink)" }}
      >
        Integrations
      </h1>
      <p className="text-[13px] mb-8" style={{ color: "var(--dim)" }}>
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

      <div className="space-y-4">
        <GitHubConnectCard
          isConnected={githubConnected}
          githubOrg={githubOrg}
          loginProvider={loginProvider}
          onDisconnect={() => {
            setGithubConnected(false);
            setGithubOrg(undefined);
          }}
        />

        <SlackSection plan={plan} />
      </div>
    </div>
  );
}
