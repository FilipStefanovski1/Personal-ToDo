"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts up to `value` on mount and whenever it changes. Deliberately short —
 * the number should settle before you've finished reading the label.
 */
export function AnimatedNumber({
  value,
  duration = 620,
  format = (n: number) => n.toLocaleString(),
  className = "",
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = fromRef.current;
    if (reduced || from === value) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
      else fromRef.current = value;
    };

    frameRef.current = requestAnimationFrame(tick);

    // Safety net: rAF is throttled or paused in background tabs, which would
    // otherwise leave the counter frozen on a stale number. This guarantees
    // the correct value lands whether or not any frame ever runs.
    const settle = setTimeout(() => {
      setDisplay(value);
      fromRef.current = value;
    }, duration + 60);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      clearTimeout(settle);
      fromRef.current = value;
    };
  }, [value, duration]);

  return <span className={`tabular ${className}`}>{format(display)}</span>;
}
