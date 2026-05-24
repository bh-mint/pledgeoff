"use client";

import { useEffect, useRef, useState } from "react";

interface StatNumberProps {
  value: number | null;
  fallback?: string;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function StatNumber({ value, fallback = "—", duration = 600, className, style }: StatNumberProps) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === null) return;
    const start = performance.now();
    const target = value;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  if (value === null) {
    return <span className={className} style={style}>{fallback}</span>;
  }

  return <span className={className} style={style}>{display}</span>;
}
