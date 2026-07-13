"use client";

import type { ReactNode } from "react";
import { useInView, usePrefersReducedMotion } from "@/lib/motion";

interface RevealProps {
  children: ReactNode;
  delayMs?: number;
  className?: string;
}

/** Fades + slides its children in once scrolled into view. No-op under prefers-reduced-motion. */
export function Reveal({ children, delayMs = 0, className }: RevealProps) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const reduced = usePrefersReducedMotion();

  return (
    <div
      ref={ref}
      className={className}
      style={
        reduced
          ? undefined
          : {
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(8px)",
              transition: `opacity 600ms cubic-bezier(0.16,1,0.3,1) ${delayMs}ms, transform 600ms cubic-bezier(0.16,1,0.3,1) ${delayMs}ms`,
            }
      }
    >
      {children}
    </div>
  );
}
