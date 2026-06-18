"use client";

import React, { useEffect, useState } from "react";

const STORAGE_KEY = "pledgeoff-theme";

function getInitialTheme(): "dark" | "light" {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const theme = getInitialTheme();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(theme === "dark");
    setMounted(true);
  }, []);

  function toggle() {
    const next = dark ? "light" : "dark";
    setDark(!dark);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* storage blocked */ }
    document.documentElement.setAttribute("data-theme", next);
  }

  if (!mounted) return <div style={{ width: 44, height: 24 }} />;

  return (
    <button
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={toggle}
      style={{
        display: "inline-flex",
        alignItems: "center",
        width: 44,
        height: 24,
        borderRadius: 0,
        border: "1px solid var(--line)",
        background: dark ? "var(--ink)" : "var(--surface-2)",
        cursor: "pointer",
        padding: "3px",
        transition: "background 0.2s, border-color 0.2s",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          display: "block",
          width: 16,
          height: 16,
          borderRadius: 0,
          background: dark ? "var(--bg)" : "var(--ink)",
          transform: dark ? "translateX(20px)" : "translateX(0)",
          transition: "transform 0.2s, background 0.2s",
          flexShrink: 0,
        }}
      />
    </button>
  );
}
