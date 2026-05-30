"use client";

import { useState, useEffect } from "react";
import { getAuthToken } from "@/lib/auth-client";

type WebhookStatus = { url: string; active: boolean; createdAt: string } | null;

export function WebhookConfigSection() {
  const [config, setConfig] = useState<WebhookStatus | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [urlInput, setUrlInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const token = await getAuthToken();
        const res = await fetch("/api/v1/webhooks/config", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json() as { data: WebhookStatus };
          setConfig(json.data);
          if (json.data?.url) setUrlInput(json.data.url);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNewSecret(null);
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/v1/webhooks/config", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: urlInput }),
      });
      const json = await res.json() as { data?: { url: string; active: boolean; secret: string }; error?: { message: string } };
      if (!res.ok) {
        setError(json.error?.message ?? "An error occurred");
        return;
      }
      setNewSecret(json.data!.secret);
      setConfig({ url: json.data!.url, active: json.data!.active, createdAt: new Date().toISOString() });
    } catch {
      setError("Failed to save. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Remove webhook? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const token = await getAuthToken();
      await fetch("/api/v1/webhooks/config", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setConfig(null);
      setUrlInput("");
      setNewSecret(null);
    } finally {
      setDeleting(false);
    }
  }

  async function copySecret() {
    if (!newSecret) return;
    await navigator.clipboard.writeText(newSecret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="h-8 flex items-center">
        <span className="mono text-[11px]" style={{ color: "var(--t3)" }}>Loading…</span>
      </div>
    );
  }

  return (
    <div>
      <h2
        className="display text-[18px] font-semibold tracking-tight mb-1"
        style={{ color: "var(--t1)" }}
      >
        Webhook endpoint
      </h2>
      <p className="text-[13px] mb-5" style={{ color: "var(--t2)" }}>
        PledgeOFF will POST a signed <code className="mono text-[12px]">decision.ready</code> event to your URL every time a verdict is generated.
        Verify the <code className="mono text-[12px]">X-PledgeOFF-Signature</code> header using HMAC-SHA256 with your signing secret.
      </p>

      {/* Secret reveal (shown only on new registration) */}
      {newSecret && (
        <div
          className="mb-5 rounded-md border p-4"
          style={{ borderColor: "var(--caution)", background: "var(--surface)" }}
        >
          <div className="mono text-[11px] uppercase tracking-wider mb-2" style={{ color: "var(--caution)" }}>
            Copy your signing secret now — it won&apos;t be shown again
          </div>
          <div className="flex items-center gap-2">
            <code
              className="mono text-[12px] flex-1 truncate rounded px-2 py-1.5"
              style={{ background: "var(--canvas)", color: "var(--t1)", border: "1px solid var(--border)" }}
            >
              {newSecret}
            </code>
            <button
              type="button"
              onClick={copySecret}
              className="h-8 px-3 rounded-md mono text-[11px] font-medium transition-opacity hover:opacity-80 shrink-0"
              style={{ background: secretCopied ? "var(--validated)" : "var(--accent)", color: "var(--accent-fg)" }}
            >
              {secretCopied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* Current config */}
      {config && !newSecret && (
        <div
          className="mb-5 flex items-center gap-3 rounded-md border px-4 py-3 text-[13px]"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--validated)" }} aria-hidden="true" />
          <span className="flex-1 truncate mono text-[12px]" style={{ color: "var(--t1)" }}>{config.url}</span>
          <span className="mono text-[10px] shrink-0" style={{ color: "var(--t3)" }}>Active</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <label
            htmlFor="webhook-url"
            className="block mono text-[11px] uppercase tracking-wider mb-1.5"
            style={{ color: "var(--t3)" }}
          >
            Endpoint URL
          </label>
          <input
            id="webhook-url"
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://your-server.com/webhook"
            required
            className="w-full h-9 rounded-md px-3 mono text-[13px] outline-none focus:ring-1"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--t1)",
            }}
          />
          <p className="mt-1 text-[11px]" style={{ color: "var(--t3)" }}>
            Must be an https:// URL. Registering a new URL invalidates the previous secret.
          </p>
        </div>

        {error && (
          <p className="text-[13px]" style={{ color: "var(--kill)" }}>{error}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="h-9 px-4 rounded-md display text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            {saving ? "Saving…" : config ? "Update endpoint →" : "Register endpoint →"}
          </button>

          {config && !newSecret && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="h-9 px-3 rounded-md display text-[13px] font-medium transition-opacity hover:opacity-80 disabled:opacity-50 border"
              style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--kill)" }}
            >
              {deleting ? "Removing…" : "Remove"}
            </button>
          )}
        </div>
      </form>

      {/* Payload example */}
      <details className="mt-6">
        <summary
          className="cursor-pointer mono text-[11px] uppercase tracking-wider select-none"
          style={{ color: "var(--t3)" }}
        >
          Example payload
        </summary>
        <pre
          className="mt-3 rounded-md p-4 mono text-[11px] leading-relaxed overflow-x-auto"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--t2)" }}
        >{`{
  "event": "decision.ready",
  "version": "1",
  "timestamp": "2026-05-30T14:00:00.000Z",
  "data": {
    "ideaId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "ideaText": "An AI-powered code review tool for solo developers",
    "verdict": "GO",
    "score": 78,
    "verdictUrl": "https://pledgeoff.com/ideas/3fa85f64-...",
    "traceId": "a1b2c3d4-..."
  }
}`}</pre>
        <p className="mt-2 text-[12px]" style={{ color: "var(--t3)" }}>
          Verify the signature: <code className="mono">HMAC-SHA256(signing_secret, raw_body)</code> → compare with <code className="mono">X-PledgeOFF-Signature</code> header (prefix <code className="mono">sha256=</code>).
        </p>
      </details>
    </div>
  );
}
