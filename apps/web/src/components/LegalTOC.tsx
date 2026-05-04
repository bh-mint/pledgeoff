"use client";

import { useEffect, useRef, useState } from "react";

interface TocItem {
  id: string;
  label: string;
}

interface LegalTOCProps {
  items: TocItem[];
}

export function LegalTOC({ items }: LegalTOCProps) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const ids = items.map((item) => item.id);
    const lastId = items[items.length - 1]?.id;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-10% 0px -40% 0px",
        threshold: 0,
      }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    // Activate last item when scrolled to page bottom
    const handleScroll = () => {
      if (!lastId) return;
      const nearBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 80;
      if (nearBottom) setActiveId(lastId);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      observerRef.current?.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [items]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
      // Update URL hash without triggering jump
      window.history.replaceState(null, "", `#${id}`);
    }
  };

  return (
    <nav
      className="toc flex flex-col gap-2 mono text-[11px]"
      style={{ borderLeft: "1px solid var(--border)", paddingLeft: "12px" }}
    >
      {items.map(({ id, label }) => {
        const sepIdx = label.indexOf(" · ");
        const num = sepIdx !== -1 ? label.slice(0, sepIdx) : label;
        const text = sepIdx !== -1 ? label.slice(sepIdx + 3) : "";
        return (
          <a
            key={id}
            href={`#${id}`}
            className={activeId === id ? "active" : ""}
            onClick={(e) => handleClick(e, id)}
            style={{ display: "block" }}
          >
            {num}{" "}
            {sepIdx !== -1 && (
              <span style={{ color: "var(--accent)" }}>·</span>
            )}{" "}
            {text}
          </a>
        );
      })}
    </nav>
  );
}
