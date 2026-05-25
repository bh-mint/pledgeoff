"use client";

import { useEffect, useState } from "react";

interface Popover {
  x: number;
  y: number;
  text: string;
}

export function HighlightToTweet() {
  const [popover, setPopover] = useState<Popover | null>(null);

  useEffect(() => {
    function handleSelectionChange() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        setPopover(null);
        return;
      }

      const text = sel.toString().trim();
      if (text.length < 20 || text.length > 280) {
        setPopover(null);
        return;
      }

      // Scope to prose content
      const range = sel.getRangeAt(0);
      const proseEl = document.querySelector(".prose-pledgeoff");
      if (!proseEl || !proseEl.contains(range.commonAncestorContainer)) {
        setPopover(null);
        return;
      }

      const rect = range.getBoundingClientRect();
      setPopover({
        x: rect.left + rect.width / 2,
        y: rect.top + window.scrollY - 8,
        text,
      });
    }

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  function handleTweet() {
    if (!popover) return;
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(`"${popover.text}" — via @pledgeoff\nhttps://pledgeoff.com`)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setPopover(null);
  }

  if (!popover) return null;

  return (
    <div
      className="fixed z-50 -translate-x-1/2 -translate-y-full pointer-events-none"
      style={{ left: popover.x, top: popover.y }}
    >
      <button
        onMouseDown={(e) => { e.preventDefault(); handleTweet(); }}
        className="pointer-events-auto mono text-[11px] px-3 h-8 rounded-full border flex items-center gap-1.5 shadow-md transition-opacity hover:opacity-90"
        style={{
          background: "var(--canvas)",
          borderColor: "var(--border)",
          color: "var(--t1)",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        Share on X
      </button>
      <div
        className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-b border-r"
        style={{ background: "var(--canvas)", borderColor: "var(--border)", bottom: "-5px" }}
      />
    </div>
  );
}
