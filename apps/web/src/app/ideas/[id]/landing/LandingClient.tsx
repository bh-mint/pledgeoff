"use client";

import { useState } from "react";
import type { LandingPage } from "@pledgeoff/core";
import { createClient } from "@/lib/supabase/client";

interface Props {
  ideaId: string;
  initialLanding: LandingPage | null;
}

function generateHtml(landing: LandingPage): string {
  const featuresHtml = landing.features
    .map(
      (f) =>
        `    <li style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px"><span style="color:#D6FF3D;font-size:14px;margin-top:2px;flex-shrink:0">✓</span><span>${f}</span></li>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${landing.headline}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#0A0A0A;color:#E8E8E8;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:40px 20px}
    .wrap{max-width:600px;width:100%;text-align:center}
    h1{font-size:clamp(32px,6vw,52px);font-weight:700;letter-spacing:-0.03em;line-height:1.1;color:#FFFFFF;margin-bottom:20px}
    .sub{font-size:18px;line-height:1.6;color:#A0A0A0;margin-bottom:40px}
    ul{list-style:none;text-align:left;display:inline-block;margin-bottom:40px;font-size:15px;line-height:1.5}
    .cta{display:inline-block;background:#D6FF3D;color:#000;font-weight:700;font-size:16px;padding:16px 36px;border-radius:8px;text-decoration:none;letter-spacing:-0.01em}
    .waitlist{margin-top:32px;font-size:13px;color:#666}
  </style>
</head>
<body>
  <div class="wrap">
    <h1>${landing.headline}</h1>
    <p class="sub">${landing.subheadline}</p>
    <ul>
${featuresHtml}
    </ul>
    <br>
    <a href="#" class="cta">${landing.ctaText}</a>
    <p class="waitlist">${landing.waitlistHeadline}</p>
  </div>
</body>
</html>`;
}

export function LandingClient({ ideaId, initialLanding }: Props) {
  const [landing, setLanding] = useState<LandingPage | null>(initialLanding);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("Not authenticated."); setLoading(false); return; }
      const res = await fetch(`/api/v1/ideas/${ideaId}/landing`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: { message?: string } }).error?.message ?? "Generation failed. Try again.");
        return;
      }
      const body = await res.json() as { data: LandingPage };
      setLanding(body.data);
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
    if (loading) {
      return (
        <div
          className="rounded-md border p-8 text-center"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <p className="mono text-[11px] animate-pulse mb-2" style={{ color: "var(--t3)" }}>
            Writing landing page copy…
          </p>
          <p className="mono text-[10px]" style={{ color: "var(--t3)" }}>
            This may take 15–30 seconds
          </p>
        </div>
      );
    }

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
          className="inline-flex items-center gap-2 h-10 px-6 rounded-md display text-[13px] font-semibold transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          Generate landing page →
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
      {/* Visual preview toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowPreview((v) => !v)}
          className="mono text-[11px] px-3 py-1.5 rounded transition-colors"
          style={{
            border: `1px solid ${showPreview ? "var(--accent)" : "var(--border)"}`,
            color: showPreview ? "var(--accent)" : "var(--t2)",
          }}
        >
          {showPreview ? "← Hide preview" : "Preview page →"}
        </button>
        <button
          onClick={() => void copyToClipboard(generateHtml(landing), "html")}
          className="inline-flex items-center gap-2 h-8 px-4 rounded-md mono text-[11px] font-semibold transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          {copied === "html" ? "Copied!" : "Copy HTML"}
        </button>
      </div>

      {/* Inline visual preview */}
      {showPreview && (
        <div
          className="rounded-md border overflow-hidden"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="mono text-[10px] uppercase tracking-[0.12em] px-4 py-2"
            style={{ color: "var(--t3)", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
          >
            Page preview
          </div>
          <div
            className="p-8 text-center"
            style={{ background: "#0A0A0A" }}
          >
            <h2
              className="display font-bold leading-tight mb-4"
              style={{ color: "#FFFFFF", fontSize: "clamp(22px, 4vw, 36px)", letterSpacing: "-0.03em" }}
            >
              {landing.headline}
            </h2>
            <p
              className="mb-8 mx-auto"
              style={{ color: "#A0A0A0", fontSize: "15px", lineHeight: "1.6", maxWidth: "420px" }}
            >
              {landing.subheadline}
            </p>
            <ul className="inline-block text-left mb-8 space-y-3">
              {landing.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mono text-[12px] shrink-0 mt-0.5" style={{ color: "#D6FF3D" }}>✓</span>
                  <span style={{ color: "#E8E8E8", fontSize: "14px", lineHeight: "1.5" }}>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="mb-6">
              <span
                className="inline-block display font-bold rounded-md px-8 py-3"
                style={{ background: "#D6FF3D", color: "#000", fontSize: "14px" }}
              >
                {landing.ctaText}
              </span>
            </div>
            <p style={{ color: "#555", fontSize: "12px" }}>{landing.waitlistHeadline}</p>
          </div>
        </div>
      )}

      {/* Copy sections */}
      {sections.map(({ key, label, value }) => (
        <div
          key={key}
          className="rounded-md border p-5"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="mono text-[10px] uppercase tracking-[0.12em]" style={{ color: "var(--t3)" }}>
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
                  <span className="mono text-[10px] mt-1 shrink-0" style={{ color: "var(--accent)" }}>✓</span>
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
