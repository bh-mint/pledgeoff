"use client";

import { useState } from "react";

interface OttoPanelProps {
  children: React.ReactNode;
}

export function OttoPanel({ children }: OttoPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Pill button — fixed bottom right */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open Otto AI analyst"
        className="otto-pill-btn"
      >
        <span
          className="otto-dot"
          style={{
            display: "inline-block",
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "currentColor",
            opacity: 0.7,
            flexShrink: 0,
          }}
          aria-hidden="true"
        />
        Ask Otto
      </button>

      {/* Overlay */}
      <div
        className={`otto-drawer-overlay${open ? " open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`otto-drawer${open ? " open" : ""}`}
        role="dialog"
        aria-label="Otto AI analyst"
        aria-modal="true"
      >
        <div className="otto-drawer-hd">
          <div>
            <div className="otto-drawer-name">Otto</div>
            <div className="otto-drawer-sub">Chief Analyst</div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="otto-drawer-close"
            aria-label="Close Otto"
          >
            Close ×
          </button>
        </div>
        <div className="otto-drawer-body">
          {children}
        </div>
      </div>
    </>
  );
}
