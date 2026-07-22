"use client";

import { useEffect, useRef, useState } from "react";

import { formatNumber } from "@/lib/utils/format";

/**
 * Animates a number toward `value` with an ease-out curve. Starts when the
 * element scrolls into view (or immediately if IntersectionObserver is
 * unavailable). Re-animates from the current value if `value` changes later
 * (e.g. once admin-configured stats load). Respects prefers-reduced-motion by
 * snapping straight to the final value.
 */
export function CountUp({
  value,
  durationMs = 1400,
  className,
  format
}: {
  value: number;
  durationMs?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;

    const reduceMotion =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const from = displayRef.current;
    if (reduceMotion || durationMs <= 0 || from === value) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    let raf = 0;
    const tick = (nowTs: number) => {
      const t = Math.min(1, (nowTs - start) / durationMs);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, durationMs]);

  // Deterministic default grouping (not locale-default toLocaleString) so the
  // SSR value and the first client render are identical.
  const formatted = format ? format(display) : formatNumber(display);
  return (
    <span ref={ref} className={className}>
      {formatted}
    </span>
  );
}
