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

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible section
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => {
            const aTop = a.boundingClientRect.top;
            const bTop = b.boundingClientRect.top;
            return aTop - bTop;
          });

        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-10% 0px -80% 0px",
        threshold: 0,
      }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
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
        const prefix = sepIdx !== -1 ? label.slice(0, sepIdx + 2) : "";
        const text = sepIdx !== -1 ? label.slice(sepIdx + 3) : label;
        return (
          <a
            key={id}
            href={`#${id}`}
            className={activeId === id ? "active" : ""}
            onClick={(e) => handleClick(e, id)}
            style={{ display: "block" }}
          >
            {prefix && (
              <span style={{ color: "var(--accent)" }}>{prefix}</span>
            )}{" "}
            {text}
          </a>
        );
      })}
    </nav>
  );
}
