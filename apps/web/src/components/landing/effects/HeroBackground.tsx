"use client";

import { BRAND } from "../shared";

export function HeroBackground() {
  return (
    <>
      <div
        aria-hidden
        className="nelvyon-grid-bg pointer-events-none absolute inset-0"
      />
      <div aria-hidden className="nelvyon-particles pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(0,102,255,0.25), transparent 42%),
            radial-gradient(circle at 80% 70%, rgba(0,207,255,0.15), transparent 38%)
          `,
        }}
      />
      <div aria-hidden className="nelvyon-hero-sphere pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2" />
    </>
  );
}

export function SectionGlow({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 opacity-40 ${className}`}
      style={{
        background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${BRAND.blue}22, transparent 70%)`,
      }}
    />
  );
}
