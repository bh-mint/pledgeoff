"use client";

import { useState } from "react";

export function ShareVerdictButton({ ideaId }: { ideaId: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = `${window.location.origin}/v/${ideaId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleShare}
      className="mono text-[11px] px-3 h-8 rounded border transition-all flex items-center gap-1.5 shrink-0"
      style={
        copied
          ? {
              borderColor: "rgba(125,214,107,0.4)",
              color: "var(--validated)",
              background: "rgba(125,214,107,0.06)",
            }
          : {
              borderColor: "var(--border)",
              color: "var(--t2)",
              background: "var(--surface)",
            }
      }
    >
      {copied ? (
        <>
          <span>✓</span>
          <span>Link copied</span>
        </>
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M6.5 3.5H4A1.5 1.5 0 002.5 5v7A1.5 1.5 0 004 13.5h7A1.5 1.5 0 0012.5 12V9.5M9 2.5h4.5V7M13.5 2.5l-7 7"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Share verdict</span>
        </>
      )}
    </button>
  );
}
