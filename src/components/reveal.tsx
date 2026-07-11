"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fades + slides its children in when they scroll into view. Lightweight
 * (IntersectionObserver + CSS transition, no animation library). Falls back to
 * visible immediately when IntersectionObserver is unavailable, and skips the
 * offset for prefers-reduced-motion users.
 */
export function Reveal({
  children,
  className,
  delayMs = 0,
  as: Tag = "div"
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  as?: "div" | "article" | "section" | "li";
}) {
  const [shown, setShown] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      style={{ transitionDelay: `${delayMs}ms` }}
      className={`transition-all duration-700 ease-out ${
        shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      } ${className ?? ""}`}
    >
      {children}
    </Tag>
  );
}
