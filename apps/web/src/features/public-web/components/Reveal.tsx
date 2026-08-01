"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function Reveal({
  children,
  className = "",
  delayMs = 0,
  eager = false,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  /** Above-the-fold: visible immediately (no opacity:0 flash). */
  eager?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const show = () => {
      window.setTimeout(() => el.classList.add("is-visible"), delayMs);
    };

    if (eager || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      show();
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.95 && rect.bottom > 0) {
      show();
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            show();
            obs.disconnect();
          }
        }
      },
      { threshold: 0.08, rootMargin: "64px 0px 0px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delayMs, eager]);

  return (
    <div
      ref={ref}
      className={`nv-public-fade-up ${eager ? "is-visible" : ""} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
