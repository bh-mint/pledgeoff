"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { LaunchKit } from "@pledgeoff/core";

interface Props {
  ideaId: string;
  initialKit: LaunchKit | null;
}

type Tab = "headlines" | "emails" | "pricing";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      onClick={handleCopy}
      className="mono text-[10px] px-2 py-1 rounded border transition-colors hover:border-(--t2)"
      style={{ borderColor: "var(--border)", color: copied ? "var(--validated)" : "var(--t3)" }}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}

export function LaunchKitClient({ ideaId, initialKit }: Props) {
  const [kit, setKit] = useState<LaunchKit | null>(initialKit);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("headlines");

  async function generate() {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const res = await fetch(`/api/v1/ideas/${ideaId}/launch-kit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const json = await res.json() as { data: LaunchKit };
      setKit(json.data);
    }
    setLoading(false);
  }

  function downloadFile(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!kit) {
    return (
      <div
        className="rounded border px-4 py-8 text-center"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <p className="text-[13px] mb-1" style={{ color: "var(--t1)" }}>
          Generate your launch kit
        </p>
        <p className="mono text-[10px] mb-5" style={{ color: "var(--t3)" }}>
          3 headline A/B variants · 3-email waitlist sequence · pricing recommendation
        </p>
        <button
          onClick={generate}
          disabled={loading}
          className="mono text-[11px] px-4 py-2 rounded border transition-colors hover:border-(--t2) disabled:opacity-50"
          style={{ borderColor: "var(--border)", color: "var(--t2)" }}
        >
          {loading ? "Generating…" : "Generate Launch Kit →"}
        </button>
      </div>
    );
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "headlines", label: "A/B Headlines" },
    { key: "emails", label: "Email Sequence" },
    { key: "pricing", label: "Pricing" },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-0 mb-5 border-b" style={{ borderColor: "var(--border)" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="mono text-[10px] uppercase tracking-[0.08em] px-4 py-2.5 border-b-2 transition-colors"
            style={{
              borderBottomColor: tab === t.key ? "var(--accent)" : "transparent",
              color: tab === t.key ? "var(--t1)" : "var(--t3)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Headlines tab */}
      {tab === "headlines" && (
        <div className="space-y-3">
          {kit.headlines.map((h) => (
            <div
              key={h.variant}
              className="rounded border p-4"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <span
                  className="mono text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0"
                  style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}
                >
                  Variant {h.variant}
                </span>
                <CopyButton text={h.headline} label="Copy" />
              </div>
              <p className="text-[15px] font-semibold leading-snug mb-2" style={{ color: "var(--t1)" }}>
                {h.headline}
              </p>
              <p className="mono text-[10px]" style={{ color: "var(--t3)" }}>
                Angle: {h.angle}
              </p>
            </div>
          ))}
          <div className="flex justify-end mt-1">
            <button
              onClick={() => downloadFile(
                kit.headlines.map((h) => `Variant ${h.variant},"${h.headline}","${h.angle}"`).join("\n"),
                `headlines-${ideaId.slice(0, 8)}.csv`,
                "text/csv",
              )}
              className="mono text-[10px] px-3 py-1.5 rounded border transition-colors hover:border-(--t2)"
              style={{ borderColor: "var(--border)", color: "var(--t3)" }}
            >
              Download CSV →
            </button>
          </div>
        </div>
      )}

      {/* Emails tab */}
      {tab === "emails" && (
        <div className="space-y-4">
          {kit.emailSequence.map((email) => {
            const LABELS: Record<number, string> = { 1: "Welcome", 2: "Follow-up", 3: "Pitch" };
            return (
              <div
                key={email.sequence}
                className="rounded border p-4"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="mono text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}
                    >
                      #{email.sequence} {LABELS[email.sequence] ?? ""}
                    </span>
                    <span className="mono text-[10px]" style={{ color: "var(--t3)" }}>
                      Send: {email.sendAt}
                    </span>
                  </div>
                  <CopyButton text={`Subject: ${email.subject}\n\n${email.body}`} label="Copy email" />
                </div>
                <p className="text-[12px] font-semibold mb-2" style={{ color: "var(--t2)" }}>
                  Subject: {email.subject}
                </p>
                <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--t2)" }}>
                  {email.body}
                </p>
              </div>
            );
          })}
          <div className="flex justify-end mt-1">
            <button
              onClick={() => downloadFile(
                kit.emailSequence.map((e) => `--- Email #${e.sequence} (${e.sendAt}) ---\nSubject: ${e.subject}\n\n${e.body}`).join("\n\n"),
                `email-sequence-${ideaId.slice(0, 8)}.txt`,
                "text/plain",
              )}
              className="mono text-[10px] px-3 py-1.5 rounded border transition-colors hover:border-(--t2)"
              style={{ borderColor: "var(--border)", color: "var(--t3)" }}
            >
              Download TXT →
            </button>
          </div>
        </div>
      )}

      {/* Pricing tab */}
      {tab === "pricing" && (
        <div
          className="rounded border p-5"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-[32px] font-bold" style={{ color: "var(--t1)" }}>
              ${kit.pricingRecommendation.priceMonthly}
            </span>
            <span className="mono text-[11px]" style={{ color: "var(--t3)" }}>
              {kit.pricingRecommendation.currency}/mo · {kit.pricingRecommendation.tier}
            </span>
          </div>

          <div className="mb-4">
            <p className="mono text-[10px] uppercase tracking-[0.08em] mb-1.5" style={{ color: "var(--t3)" }}>
              Rationale
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--t2)" }}>
              {kit.pricingRecommendation.rationale}
            </p>
          </div>

          <div
            className="rounded border px-4 py-3"
            style={{ borderColor: "color-mix(in srgb, var(--accent) 25%, transparent)", background: "color-mix(in srgb, var(--accent) 6%, transparent)" }}
          >
            <p className="mono text-[10px] uppercase tracking-[0.08em] mb-1" style={{ color: "var(--accent)" }}>
              Anchoring
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--t2)" }}>
              {kit.pricingRecommendation.anchoring}
            </p>
          </div>

          <div className="flex justify-end mt-4">
            <CopyButton
              text={`Tier: ${kit.pricingRecommendation.tier}\nPrice: $${kit.pricingRecommendation.priceMonthly}/${kit.pricingRecommendation.currency}/mo\n\nRationale:\n${kit.pricingRecommendation.rationale}\n\nAnchoring:\n${kit.pricingRecommendation.anchoring}`}
              label="Copy pricing notes"
            />
          </div>
        </div>
      )}
    </div>
  );
}
