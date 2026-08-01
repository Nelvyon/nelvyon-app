"use client";

import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import type { MouseEvent, ReactNode } from "react";

/** Aceternity-inspired spotlight — soft, enterprise-safe (no neon). */
export function SpotlightHero({ children, className = "" }: { children: ReactNode; className?: string }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  }

  return (
    <div className={`relative overflow-hidden ${className}`.trim()} onMouseMove={onMove}>
      <motion.div
        className="pointer-events-none absolute -inset-px opacity-70"
        style={{
          background: useMotionTemplate`radial-gradient(520px circle at ${mouseX}px ${mouseY}px, rgba(0,132,255,0.10), transparent 55%)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(10,37,64,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(10,37,64,0.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_70%_55%_at_50%_0%,#000_35%,transparent_75%)]"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function SoftBeams({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`.trim()}>
      <div className="absolute left-1/2 top-0 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(0,132,255,0.08),transparent)] blur-2xl" />
      <div className="absolute -left-24 top-24 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,rgba(0,102,204,0.06),transparent)] blur-3xl" />
      <div className="absolute -right-16 top-40 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(10,37,64,0.05),transparent)] blur-3xl" />
    </div>
  );
}

export function HoverDepthCard({
  children,
  className = "",
  href,
}: {
  children: ReactNode;
  className?: string;
  href?: string;
}) {
  const Comp = href ? "a" : "div";
  return (
    <Comp
      href={href}
      className={`group relative block overflow-hidden rounded-2xl border border-[var(--nv-border)] bg-white p-6 shadow-[var(--nv-shadow-sm)] transition duration-300 hover:-translate-y-1 hover:border-[rgba(0,132,255,0.28)] hover:shadow-[var(--nv-shadow-md)] ${className}`.trim()}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: "radial-gradient(400px circle at var(--x,50%) var(--y,0%), rgba(0,132,255,0.06), transparent 50%)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </Comp>
  );
}
