"use client";

import { useState, useEffect, useRef } from "react";

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
      const token = await getToken();
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

  async function getToken(): Promise<string> {
    const { createSupabaseBrowserClient } = await import("@/lib/supabase/client");
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? "";
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
        Authorization: `Bearer ${await getToken()}`,
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
    setRevoking(id);
    const res = await fetch(`/api/v1/api-keys/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${await getToken()}` },
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
    <div>
      <h1 className="display text-[28px] font-semibold tracking-tight text-(--t1) mb-1">API</h1>
      <p className="text-[13px] mb-8" style={{ color: "var(--t2)" }}>
        Programmatic access to your validations and decisions.
      </p>

      {/* New key revealed — show once */}
      {newKey && (
        <div
          className="border rounded-md p-5 mb-6"
          style={{ borderColor: "var(--accent)", background: "rgba(214,255,61,0.04)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-semibold" style={{ color: "var(--accent)" }}>
              Key created — copy it now. It will not be shown again.
            </p>
            <button
              onClick={() => setNewKey(null)}
              className="text-[11px] px-3 h-7 rounded border"
              style={{ borderColor: "var(--border)", color: "var(--t3)" }}
            >
              Dismiss
            </button>
          </div>
          <p className="text-[12px] mb-3" style={{ color: "var(--t2)" }}>
            <span className="mono" style={{ color: "var(--t3)" }}>Name:</span> {newKey.name}
          </p>
          <div
            className="flex items-center gap-3 rounded p-3"
            style={{ background: "var(--canvas)", border: "1px solid var(--border)" }}
          >
            <code className="mono text-[12px] flex-1 break-all" style={{ color: "var(--t1)" }}>
              {newKey.key}
            </code>
            <button
              onClick={() => handleCopy(newKey.key)}
              className="shrink-0 text-[12px] px-3 h-7 rounded font-semibold display"
              style={{
                background: copied ? "var(--validated)" : "var(--accent)",
                color: "#000",
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* Create form */}
      <div
        className="border rounded-md p-5 mb-6"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <h2 className="display text-[15px] font-semibold text-(--t1) mb-4">New API key</h2>
        <form onSubmit={handleCreate} className="flex gap-3">
          <input
            type="text"
            placeholder="Key name (e.g. Production)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            maxLength={64}
            className="flex-1 text-[13px] px-3 h-9 rounded border outline-none"
            style={{
              background: "var(--canvas)",
              borderColor: "var(--border)",
              color: "var(--t1)",
            }}
          />
          <button
            type="submit"
            disabled={creating || !newKeyName.trim()}
            className="display text-[13px] font-semibold px-5 h-9 rounded disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            {creating ? "Creating…" : "Generate key"}
          </button>
        </form>
        {error && (
          <p className="text-[12px] mt-2" style={{ color: "var(--kill)" }}>{error}</p>
        )}
      </div>

      {/* Active keys */}
      <div className="mb-2">
        <div
          className="mono text-[10px] uppercase tracking-[0.12em] mb-3"
          style={{ color: "var(--t3)" }}
        >
          Active keys ({activeKeys.length} / 10)
        </div>

        {loading ? (
          <p className="text-[13px]" style={{ color: "var(--t3)" }}>Loading…</p>
        ) : activeKeys.length === 0 ? (
          <div
            className="border rounded-md p-6 text-center"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <p className="text-[13px]" style={{ color: "var(--t2)" }}>No active API keys.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {activeKeys.map((key) => (
              <div
                key={key.id}
                className="border rounded-md px-4 py-3 flex items-center justify-between gap-4"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-(--t1) truncate">{key.name}</p>
                  <p className="mono text-[11px] mt-0.5" style={{ color: "var(--t3)" }}>
                    {key.keyPrefix}••••••••••••••••••••••••••••••••••••••••••••••••••
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px]" style={{ color: "var(--t3)" }}>
                    Created {formatDate(key.createdAt)}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--t3)" }}>
                    {key.lastUsedAt ? `Last used ${formatDate(key.lastUsedAt)}` : "Never used"}
                  </p>
                </div>
                <button
                  onClick={() => handleRevoke(key.id)}
                  disabled={revoking === key.id}
                  className="shrink-0 text-[12px] px-3 h-7 rounded border disabled:opacity-40"
                  style={{ borderColor: "var(--border)", color: "var(--kill)" }}
                >
                  {revoking === key.id ? "Revoking…" : "Revoke"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revoked keys */}
      {revokedKeys.length > 0 && (
        <div className="mt-6">
          <div
            className="mono text-[10px] uppercase tracking-[0.12em] mb-3"
            style={{ color: "var(--t3)" }}
          >
            Revoked keys
          </div>
          <div className="flex flex-col gap-2">
            {revokedKeys.map((key) => (
              <div
                key={key.id}
                className="border rounded-md px-4 py-3 flex items-center justify-between gap-4 opacity-50"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-(--t1) truncate line-through">{key.name}</p>
                  <p className="mono text-[11px] mt-0.5" style={{ color: "var(--t3)" }}>
                    {key.keyPrefix}••••••••••••••••••••••••••••••••••••••••••••••••••
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px]" style={{ color: "var(--t3)" }}>
                    Revoked {formatDate(key.revokedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage docs */}
      <div
        className="border rounded-md p-5 mt-6"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <h2 className="display text-[14px] font-semibold text-(--t1) mb-3">Usage</h2>
        <p className="text-[13px] mb-3" style={{ color: "var(--t2)" }}>
          Pass your key in the <code className="mono text-[12px] px-1.5 py-0.5 rounded" style={{ background: "var(--canvas)", color: "var(--t1)" }}>X-API-Key</code> header:
        </p>
        <pre
          className="mono text-[12px] rounded p-4 overflow-x-auto"
          style={{ background: "var(--canvas)", border: "1px solid var(--border)", color: "var(--t2)" }}
        >{`curl https://pledgeoff.com/api/v1/ideas \\
  -H "X-API-Key: po_live_your_key_here"`}</pre>
        <p className="text-[12px] mt-3" style={{ color: "var(--t3)" }}>
          Full reference at <a href="/api-docs" target="_blank" style={{ color: "var(--accent)" }}>/api-docs</a>.
        </p>
      </div>
    </div>
  );
}
