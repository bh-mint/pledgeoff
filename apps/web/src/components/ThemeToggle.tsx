"use client";

import React, { useEffect, useRef, useState } from "react";

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

function IconChevron() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2.5 3.5L5 6.5L7.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const OPTIONS: { value: Theme; label: string; Icon: () => React.ReactElement }[] = [
  { value: "dark",   label: "Dark",   Icon: IconDark },
  { value: "light",  label: "Light",  Icon: IconLight },
  { value: "system", label: "System", Icon: IconSystem },
];

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem(STORAGE_KEY) as Theme) ?? "dark";
  });
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function select(t: Theme) {
    setTheme(t);
    localStorage.setItem(STORAGE_KEY, t);
    applyTheme(t);
    setOpen(false);
  }

  if (!mounted) return null;

  const current = OPTIONS.find((o) => o.value === theme) ?? OPTIONS[0]!;
  const CurrentIcon = current.Icon;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Change theme"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 px-2.5 mono text-[11px] uppercase tracking-[0.1em] cursor-pointer transition-colors rounded-md border"
        style={{
          height: 32,
          background: "transparent",
          borderColor: open ? "var(--accent)" : "var(--border)",
          color: open ? "var(--accent)" : "var(--t2)",
        }}
        onMouseEnter={(e) => {
          if (!open) (e.currentTarget as HTMLButtonElement).style.color = "var(--t1)";
        }}
        onMouseLeave={(e) => {
          if (!open) (e.currentTarget as HTMLButtonElement).style.color = "var(--t2)";
        }}
      >
        <CurrentIcon />
        <span>{current.label}</span>
        <IconChevron />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 rounded-md border overflow-hidden z-50"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            minWidth: 110,
            boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
          }}
        >
          {OPTIONS.map(({ value, label, Icon }) => {
            const active = theme === value;
            return (
              <button
                key={value}
                onClick={() => select(value)}
                className="w-full flex items-center gap-2 px-3 mono text-[11px] uppercase tracking-[0.1em] cursor-pointer transition-colors text-left border-0"
                style={{
                  height: 34,
                  background: active ? "var(--accent)" : "transparent",
                  color: active ? "var(--accent-fg)" : "var(--t2)",
                }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)";
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                <Icon />
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
