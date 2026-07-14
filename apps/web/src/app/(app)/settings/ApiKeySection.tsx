"use client";

import { useState, useEffect, useRef } from "react";
import { getAuthToken } from "@/lib/auth-client";

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatRelative(iso: string | null): string {
  if (!iso) return "Never used";
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "Used just now";
  if (h < 24) return `Used ${h}h ago`;
  const d = Math.floor(h / 24);
  return `Used ${d}d ago`;
}

export function ApiKeySection() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<{ key: string; name: string } | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const refreshRef = useRef(0);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      const token = (await getAuthToken()) ?? "";
      const res = await fetch("/api/v1/api-keys", { headers: { Authorization: `Bearer ${token}` } });
      if (!active) return;
      if (res.ok) {
        const json = (await res.json()) as { data: ApiKey[] };
        setKeys(json.data ?? []);
      }
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [refreshCount]);

  function triggerRefresh() {
    refreshRef.current += 1;
    setRefreshCount(refreshRef.current);
    setLoading(true);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreating(true);
    setError(null);
    const res = await fetch("/api/v1/api-keys", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${(await getAuthToken()) ?? ""}`,
      },
      body: JSON.stringify({ name: newKeyName.trim() }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error?.message ?? "Failed to create API key");
    } else {
      setNewKey({ key: json.data.key, name: json.data.name });
      setNewKeyName("");
      triggerRefresh();
    }
    setCreating(false);
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this API key? Anything using it will stop working immediately.")) return;
    setRevoking(id);
    const res = await fetch(`/api/v1/api-keys/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${(await getAuthToken()) ?? ""}` },
    });
    if (res.ok) {
      setKeys((prev) => prev.map((k) => k.id === id ? { ...k, revokedAt: new Date().toISOString() } : k));
    }
    setRevoking(null);
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const activeKeys = keys.filter((k) => !k.revokedAt);
  const revokedKeys = keys.filter((k) => k.revokedAt);

  return (
    <>
      {/* New key revealed — show once */}
      {newKey && (
        <div className="sec" style={{ borderColor: "rgba(26,106,60,0.4)" }}>
          <div className="sec-hd" style={{ background: "var(--go-mid)", color: "var(--go)" }}>
            Key created — copy it now
            <span className="r">Will not be shown again</span>
          </div>
          <div className="sec-bd">
            <p className="fine" style={{ marginBottom: 12 }}>Name: {newKey.name}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg)", border: "1px solid var(--line)", padding: "10px 14px" }}>
              <code style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 12, flex: 1, wordBreak: "break-all", color: "var(--ink)" }}>
                {newKey.key}
              </code>
              <button
                className={`btn-xs${copied ? "" : " p"}`}
                onClick={() => handleCopy(newKey.key)}
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
            </div>
            <button className="btn-xs" style={{ marginTop: 12 }} onClick={() => setNewKey(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Active keys */}
      <div className="sec">
        <div className="sec-hd">
          API keys
          <span className="r">{activeKeys.length} active</span>
        </div>
        <div className="sec-bd">
          {loading ? (
            <p className="fine">Loading…</p>
          ) : activeKeys.length > 0 ? (
            <div style={{ marginBottom: 20 }}>
              {activeKeys.map((key) => (
                <div key={key.id} className="krow">
                  <div>
                    <div className="knm">{key.name}</div>
                    <div className="ksub">Created {formatDate(key.createdAt)}</div>
                  </div>
                  <span className="kpfx">{key.keyPrefix}···</span>
                  <span className="kmeta">{formatRelative(key.lastUsedAt)}</span>
                  <button
                    className="btn-xs d"
                    onClick={() => handleRevoke(key.id)}
                    disabled={revoking === key.id}
                  >
                    {revoking === key.id ? "…" : "Revoke"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--dim)", marginBottom: 16 }}>No active API keys.</p>
          )}

          {/* Create form */}
          <div className="fg">
            <label className="flbl">Create new key</label>
            <form onSubmit={handleCreate} className="finp-row">
              <input
                className="finp"
                type="text"
                placeholder="Key name — e.g. staging, ci-pipeline"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                maxLength={64}
              />
              <button
                type="submit"
                className="btn-xs p"
                style={{ padding: "10px 14px" }}
                disabled={creating || !newKeyName.trim()}
              >
                {creating ? "Creating…" : "Create key"}
              </button>
            </form>
            {error && (
              <p className="fine" style={{ color: "var(--kill)" }}>{error}</p>
            )}
            <p className="fine">New keys are shown once. Copy and store them immediately — they cannot be retrieved after creation.</p>
          </div>
        </div>
      </div>

      {/* Revoked keys */}
      {revokedKeys.length > 0 && (
        <div className="sec">
          <div className="sec-hd">
            Revoked keys
            <span className="r">{revokedKeys.length}</span>
          </div>
          <div className="sec-bd">
            {revokedKeys.map((key) => (
              <div key={key.id} className="krow" style={{ opacity: 0.45 }}>
                <div>
                  <div className="knm" style={{ textDecoration: "line-through" }}>{key.name}</div>
                  <div className="ksub">Revoked {formatDate(key.revokedAt)}</div>
                </div>
                <span className="kpfx">{key.keyPrefix}···</span>
                <span className="kmeta">—</span>
                <span />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Docs */}
      <div className="sec">
        <div className="sec-hd">Documentation</div>
        <div className="sec-bd">
          <p style={{ fontSize: 13, color: "var(--dim)", marginBottom: 14 }}>
            Pass your key in the <code style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 11 }}>X-API-Key</code> header:
          </p>
          <pre
            style={{
              fontFamily: "var(--font-chivo-mono), monospace",
              fontSize: 11,
              background: "var(--bg)",
              border: "1px solid var(--line)",
              padding: "12px 14px",
              color: "var(--dim)",
              overflowX: "auto",
            }}
          >{`curl https://pledgeoff.com/api/v1/ideas \\
  -H "X-API-Key: po_live_your_key_here"`}</pre>
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <a href="/api-docs" className="btn-g" target="_blank">API reference</a>
            <a href="/changelog" className="btn-g">Changelog</a>
          </div>
        </div>
      </div>
    </>
  );
}
