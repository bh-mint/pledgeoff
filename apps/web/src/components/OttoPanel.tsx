"use client";

import { useState } from "react";

interface OttoPanelProps {
  children: React.ReactNode;
}

export function OttoPanel({ children }: OttoPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating button — bottom right */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close Otto chat" : "Open Otto chat"}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-lg transition-all hover:scale-105"
        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
      >
        <div className="w-2 h-2 rounded-full otto-dot flex-shrink-0" style={{ background: "var(--accent-fg)" }} aria-hidden="true" />
        <span className="mono text-[11px] font-medium">{open ? "Close" : "Ask Otto"}</span>
      </button>

      {/* Panel — always rendered for RSC children, toggled with hidden */}
      <div
        className={`fixed bottom-20 right-6 z-40 w-96 max-w-[calc(100vw-48px)] rounded-2xl shadow-2xl overflow-hidden${open ? "" : " hidden"}`}
        style={{ border: "1px solid var(--border)" }}
      >
        {children}
      </div>
    </>
  );
}
