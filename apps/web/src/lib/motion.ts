"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void): () => void {
  const mql = window.matchMedia(REDUCE_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * True when the OS asks for reduced motion. SSR renders assume no
 * preference (matches the CSS default); the client store takes over on
 * hydration and follows live changes to the setting.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCE_QUERY).matches,
    () => false
  );
}

/**
 * Animated count from 0 to `target` with cubic ease-out. Respects reduced
 * motion (jumps straight to the target). `done` flips true when the count
 * settles — used for follow-up effects like the score settle tick.
 */
export function useCountUp(
  target: number,
  { duration = 900, delay = 0 }: { duration?: number; delay?: number } = {}
): { value: number; done: boolean } {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (reduced) {
      const id = requestAnimationFrame(() => {
        setValue(target);
        setDone(true);
      });
      return () => cancelAnimationFrame(id);
    }

    let rafId = 0;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (startTime === null) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        setDone(true);
      }
    };
    const t = setTimeout(() => { rafId = requestAnimationFrame(step); }, delay);

    return () => { clearTimeout(t); cancelAnimationFrame(rafId); };
  }, [target, duration, delay, reduced]);

  return { value, done };
}

/**
 * Fires once when the element scrolls into view — used to hold chart mounts
 * so their entrance animation plays where the user can actually see it.
 * Falls back to visible immediately when IntersectionObserver is missing.
 */
export function useInView<T extends Element>(
  threshold = 0.25
): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (typeof IntersectionObserver === "undefined") {
      const t = setTimeout(() => setInView(true), 0);
      return () => clearTimeout(t);
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, inView]);

  return [ref, inView];
}
