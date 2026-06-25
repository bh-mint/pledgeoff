"use client";

import { useState, useEffect } from "react";
import { ApiKeySection } from "../ApiKeySection";
import { WebhookConfigSection } from "@/components/WebhookConfigSection";
import type { ApiRequestSummary } from "@pledgeoff/core";

const PERIODS = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
] as const;

function UsageSection() {
  type UsageState =
    | { status: "loading"; data: null; error: null }
    | { status: "forbidden"; data: null; error: null }
    | { status: "error"; data: null; error: string }
    | { status: "ok"; data: ApiRequestSummary; error: null };

  const [days, setDays] = useState(30);
  const [usageState, setUsageState] = useState<UsageState>({ status: "loading", data: null, error: null });
  const [copiedTrace, setCopiedTrace] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/v1/api-keys/usage?days=${days}`);
        if (res.status === 403) { setUsageState({ status: "forbidden", data: null, error: null }); return; }
        if (!res.ok) throw new Error("Failed to load usage");
        const json = await res.json() as { data: ApiRequestSummary };
        setUsageState({ status: "ok", data: json.data, error: null });
      } catch {
        setUsageState({ status: "error", data: null, error: "Failed to load API usage" });
      }
    }
    void load();
  }, [days]);

  const copyTrace = (traceId: string) => {
    navigator.clipboard.writeText(traceId).catch(() => undefined);
    setCopiedTrace(traceId);
    setTimeout(() => setCopiedTrace(null), 1500);
  };

  if (usageState.status === "loading") {
    return (
      <div className="sec">
        <div className="sec-hd">API USAGE</div>
        <div className="dev-usage-loading">Loading…</div>
      </div>
    );
  }

  if (usageState.status === "error") {
    return (
      <div className="sec">
        <div className="sec-hd">API USAGE</div>
        <div className="dev-usage-err">{usageState.error}</div>
      </div>
    );
  }

  if (usageState.status === "forbidden") return null;

  const { summary, byEndpoint, byKey, recentErrors } = usageState.data;
  const maxCalls = Math.max(...byEndpoint.map((e) => e.calls), 1);

  return (
    <div className="sec">
      <div className="sec-hd">
        API USAGE
        <span className="dev-usage-period">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              className={`dev-usage-tab${days === p.value ? " on" : ""}`}
              onClick={() => { setUsageState({ status: "loading", data: null, error: null }); setDays(p.value); }}
            >
              {p.label}
            </button>
          ))}
        </span>
      </div>

      {/* Summary strip */}
      <div className="dev-usage-strip">
        <div className="dev-usage-stat">
          <span className="dev-usage-val">{summary.totalCalls.toLocaleString()}</span>
          <span className="dev-usage-lbl">total calls</span>
        </div>
        <div className="dev-usage-stat">
          <span className={`dev-usage-val${summary.errorCalls > 0 ? " err" : " ok"}`}>
            {summary.totalCalls > 0 ? `${Math.round(summary.successRate * 100)}%` : "—"}
          </span>
          <span className="dev-usage-lbl">success rate</span>
        </div>
        <div className="dev-usage-stat">
          <span className="dev-usage-val">
            {summary.avgLatencyMs > 0 ? `${(summary.avgLatencyMs / 1000).toFixed(1)}s` : "—"}
          </span>
          <span className="dev-usage-lbl">avg latency</span>
        </div>
        <div className="dev-usage-stat">
          <span className="dev-usage-val">
            {summary.p95LatencyMs > 0 ? `${(summary.p95LatencyMs / 1000).toFixed(1)}s` : "—"}
          </span>
          <span className="dev-usage-lbl">p95 latency</span>
        </div>
        <div className="dev-usage-stat">
          <span className={`dev-usage-val${summary.errorCalls > 0 ? " err" : ""}`}>
            {summary.errorCalls}
          </span>
          <span className="dev-usage-lbl">errors</span>
        </div>
      </div>

      {summary.totalCalls === 0 && (
        <div className="dev-usage-empty">No API calls in the last {days} days.</div>
      )}

      {/* By endpoint */}
      {byEndpoint.length > 0 && (
        <div className="dev-usage-block">
          <div className="dev-usage-sub">BY ENDPOINT</div>
          <div className="dev-usage-rows">
            {byEndpoint.map((ep) => (
              <div key={ep.endpoint} className="dev-usage-row">
                <span className="dev-usage-ep">{ep.endpoint}</span>
                <div className="dev-usage-bar-wrap">
                  <div
                    className="dev-usage-bar"
                    style={{ width: `${Math.round((ep.calls / maxCalls) * 100)}%` }}
                  />
                </div>
                <span className="dev-usage-count">{ep.calls}</span>
                {ep.errors > 0 && (
                  <span className="dev-usage-errbadge">{ep.errors} err</span>
                )}
                <span className="dev-usage-lat">{(ep.avgLatencyMs / 1000).toFixed(1)}s</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By key */}
      {byKey.length > 0 && (
        <div className="dev-usage-block">
          <div className="dev-usage-sub">BY KEY</div>
          <div className="dev-usage-rows">
            {byKey.map((k) => (
              <div key={k.apiKeyId} className="dev-usage-row">
                <span className="dev-usage-ep">{k.name}</span>
                <span className="dev-usage-prefix">{k.keyPrefix}…</span>
                <span className="dev-usage-count">{k.calls} calls</span>
                {k.errors > 0 && (
                  <span className="dev-usage-errbadge">{k.errors} err</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent errors */}
      {recentErrors.length > 0 && (
        <div className="dev-usage-block">
          <div className="dev-usage-sub">RECENT ERRORS</div>
          <div className="dev-usage-errs">
            {recentErrors.map((e) => (
              <div key={e.traceId} className="dev-usage-errrow">
                <span className={`dev-usage-status s${e.statusCode}`}>{e.statusCode}</span>
                <span className="dev-usage-ep">{e.endpoint}</span>
                <span className="dev-usage-time">
                  {new Date(e.at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                </span>
                <button
                  className="dev-usage-trace"
                  onClick={() => copyTrace(e.traceId)}
                  title="Copy trace ID"
                >
                  {copiedTrace === e.traceId ? "copied!" : e.traceId.slice(0, 8) + "…"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function DeveloperClient() {
  return (
    <div>
      <UsageSection />
      <ApiKeySection />
      <WebhookConfigSection />
    </div>
  );
}
