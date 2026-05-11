"use client";

import React, { useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

const STORAGE_KEY = "pledgeoff-theme";

function applyTheme(theme: Theme) {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.setAttribute("data-theme", resolved);
}

function IconDark() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M9.5 7.2A4 4 0 1 1 4.8 2.5 3.2 3.2 0 0 0 9.5 7.2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function IconLight() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6 1.2v1.4M6 9.4v1.4M1.2 6h1.4M9.4 6h1.4M2.6 2.6l1 1M8.4 8.4l1 1M2.6 9.4l1-1M8.4 3.6l1-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconSystem() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="4.2" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="6" cy="6" r="1.6" fill="currentColor" />
    </svg>
  );
}

const SEGMENTS: { value: Theme; label: string; Icon: () => React.ReactElement }[] = [
  { value: "dark",   label: "Dark",   Icon: IconDark },
  { value: "light",  label: "Light",  Icon: IconLight },
  { value: "system", label: "System", Icon: IconSystem },
];

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem(STORAGE_KEY) as Theme) ?? "dark";
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    applyTheme(theme);

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function select(t: Theme) {
    setTheme(t);
    localStorage.setItem(STORAGE_KEY, t);
    applyTheme(t);
  }

  if (!mounted) return null;

  return (
    <div
      role="group"
      aria-label="Theme"
      className="inline-flex items-stretch overflow-hidden rounded-md border"
      style={{ height: 32, borderColor: "var(--border)" }}
    >
      {SEGMENTS.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            onClick={() => select(value)}
            aria-pressed={active}
            className="inline-flex items-center gap-1.5 px-3 mono text-[11px] uppercase tracking-[0.1em] border-0 cursor-pointer transition-colors"
            style={{
              background: active ? "var(--accent)" : "transparent",
              color: active ? "var(--accent-fg)" : "var(--t2)",
            }}
            onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = "var(--t1)"; }}
            onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = "var(--t2)"; }}
          >
            <Icon />
            {label}
          </button>
        );
      })}
    </div>
  );
}
