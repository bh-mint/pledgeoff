"use client";

import { useState } from "react";

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — silently ignore, X/LinkedIn links remain
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="mono text-[11px] uppercase tracking-[0.06em] transition-colors hover:opacity-70"
      style={{ color: "var(--faint)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
    >
      {copied ? "Copied ✓" : "Copy link"}
    </button>
  );
}
