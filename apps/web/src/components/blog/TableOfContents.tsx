"use client";

import { useEffect, useLayoutEffect, useState } from "react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function TableOfContents() {
  const [items, setItems] = useState<TocItem[]>([]);
  const [active, setActive] = useState("");
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    const headings = document.querySelectorAll<HTMLHeadingElement>(
      ".prose-pledgeoff h2, .prose-pledgeoff h3"
    );

    const parsed: TocItem[] = Array.from(headings).map((h) => {
      if (!h.id) {
        h.id = h.textContent
          ?.toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") ?? "";
      }
      return {
        id: h.id,
        text: h.textContent ?? "",
        level: parseInt(h.tagName[1]),
      };
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(parsed);
  }, []);

  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-20% 0% -70% 0%" }
    );

    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  const navList = (
    <ul className="space-y-1 mt-2">
      {items.map((item) => (
        <li key={item.id} style={{ paddingLeft: item.level === 3 ? "0.75rem" : 0 }}>
          <a
            href={`#${item.id}`}
            onClick={() => setOpen(false)}
            className={`block text-[12px] leading-relaxed transition-colors py-0.5 ${
              active === item.id
                ? "text-(--accent)"
                : "text-(--t3) hover:text-(--t2)"
            }`}
          >
            {item.text}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <nav aria-label="Table of contents">
      {/* Mobile: accordion */}
      <div className="md:hidden">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between rounded-md border px-4 py-2.5 mono text-[11px] transition-colors"
          style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--t2)" }}
          aria-expanded={open}
        >
          <span>On this page</span>
          <span style={{ color: "var(--t3)" }}>{open ? "▲" : "▾"}</span>
        </button>
        {open && (
          <div className="mt-1 rounded-md border px-4 pb-3 pt-1" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            {navList}
          </div>
        )}
      </div>

      {/* Desktop: always expanded */}
      <div className="hidden md:block">
        <p className="mono text-[10px] uppercase tracking-[0.12em] text-(--t3) mb-1">
          On this page
        </p>
        {navList}
      </div>
    </nav>
  );
}
