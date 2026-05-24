"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export function MidArticleCTA() {
  const [visible, setVisible] = useState(false);
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;

    const sentinel = document.createElement("div");
    sentinel.style.position = "absolute";
    sentinel.style.top = "60%";
    sentinel.style.left = "0";
    sentinel.style.width = "1px";
    sentinel.style.height = "1px";
    sentinel.style.pointerEvents = "none";

    const article = document.querySelector("article");
    if (!article) return;

    article.style.position = "relative";
    article.appendChild(sentinel);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !shown.current) {
          shown.current = true;
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0 }
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
      sentinel.remove();
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="my-10 rounded-md border-l-2 pl-5 pr-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      style={{ borderColor: "var(--accent)", background: "rgba(var(--accent-rgb, 99,102,241),0.05)" }}
    >
      <div>
        <div className="mono text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--accent)" }}>
          Quick question
        </div>
        <p className="text-[14px] font-medium leading-snug" style={{ color: "var(--t1)" }}>
          Have an idea you&apos;re not sure about?
        </p>
        <p className="text-[13px] mt-0.5" style={{ color: "var(--t2)" }}>
          PledgeOFF gives you a GO / KILL / PIVOT verdict in under 60 seconds.
        </p>
      </div>
      <Link
        href="/ideas/new"
        className="inline-flex items-center gap-1.5 rounded-md h-9 px-4 display text-[13px] font-semibold shrink-0 transition-opacity hover:opacity-90"
        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
      >
        Validate free →
      </Link>
    </div>
  );
}
