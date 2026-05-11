"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LandingPage } from "@pledgeoff/core";

interface Props {
  ideaId: string;
  initialLanding: LandingPage | null;
}

export function LandingClient({ ideaId, initialLanding }: Props) {
  const [landing, setLanding] = useState<LandingPage | null>(initialLanding);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const router = useRouter();

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/ideas/${ideaId}/landing`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: { message?: string } }).error?.message ?? "Generation failed. Try again.");
        return;
      }
      const body = await res.json() as { data: LandingPage };
      setLanding(body.data);
      router.refresh();
    } catch {
      setError("Network error. Check connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  if (!landing) {
    return (
      <div
        className="rounded-md border p-8 text-center"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="mono text-[11px] mb-3" style={{ color: "var(--t3)" }}>
          Landing page copy not yet generated
        </div>
        <p className="text-[14px] mb-6" style={{ color: "var(--t2)" }}>
          PledgeOFF will write headline, subheadline, 3 features, CTA, and waitlist copy — ready to publish.
        </p>
        {error && (
          <p className="mono text-[11px] mb-4" style={{ color: "var(--caution)" }}>{error}</p>
        )}
        <button
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center gap-2 h-10 px-6 rounded-md display text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          {loading ? "Generating…" : "Generate landing page →"}
        </button>
      </div>
    );
  }

  const sections: Array<{ key: string; label: string; value: string | string[] }> = [
    { key: "headline", label: "Headline", value: landing.headline },
    { key: "subheadline", label: "Subheadline", value: landing.subheadline },
    { key: "features", label: "Features", value: landing.features },
    { key: "ctaText", label: "CTA Text", value: landing.ctaText },
    { key: "waitlistHeadline", label: "Waitlist Headline", value: landing.waitlistHeadline },
  ];

  return (
    <div className="space-y-6">
      {sections.map(({ key, label, value }) => (
        <div
          key={key}
          className="rounded-md border p-5"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="mono text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--t3)" }}>
              {label}
            </div>
            <button
              onClick={() => {
                const text = Array.isArray(value) ? value.join("\n") : value;
                void copyToClipboard(text, key);
              }}
              className="mono text-[10px] px-2 py-1 rounded transition-colors"
              style={{
                color: copied === key ? "var(--validated)" : "var(--t3)",
                border: "1px solid var(--border)",
              }}
            >
              {copied === key ? "Copied!" : "Copy"}
            </button>
          </div>

          {Array.isArray(value) ? (
            <ul className="space-y-2">
              {value.map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mono text-[10px] mt-1 flex-shrink-0" style={{ color: "var(--accent)" }}>✓</span>
                  <span className="text-[15px] font-medium leading-snug" style={{ color: "var(--t1)" }}>{feature}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p
              className={key === "headline" ? "display font-bold leading-tight" : "text-[15px] leading-relaxed"}
              style={{
                color: "var(--t1)",
                fontSize: key === "headline" ? "24px" : undefined,
                letterSpacing: key === "headline" ? "-0.02em" : undefined,
              }}
            >
              {value}
            </p>
          )}
        </div>
      ))}

      <div className="flex items-center justify-between pt-2">
        <p className="mono text-[10px]" style={{ color: "var(--t3)" }}>
          Generated {new Date(landing.createdAt).toLocaleDateString()} · AI-written, human-reviewed
        </p>
        <button
          onClick={generate}
          disabled={loading}
          className="mono text-[10px] px-3 py-1.5 rounded transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ border: "1px solid var(--border)", color: "var(--t2)" }}
        >
          {loading ? "Regenerating…" : "Regenerate"}
        </button>
      </div>
    </div>
  );
}
