"use client";

import { motion } from "framer-motion";

import { fade, str } from "../shared";

export function Hero3dFallback({
  headline,
  subheadline,
  ctaText,
  ctaUrl,
  imageUrl,
}: {
  headline: string;
  subheadline: string;
  ctaText?: string;
  ctaUrl?: string;
  imageUrl?: string;
}) {
  return (
    <div
      className="relative flex min-h-[420px] flex-col items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 px-6 py-20 text-center"
      style={imageUrl ? { backgroundImage: `url(${imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
    >
      <div className="absolute inset-0 bg-slate-950/60" />
      <div className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-indigo-500/30 blur-3xl" />
      <div className="absolute -right-16 bottom-8 h-48 w-48 rounded-full bg-violet-500/25 blur-3xl" />
      <motion.div className="relative z-10 max-w-3xl" {...fade}>
        <h1 className="text-4xl font-bold tracking-tight text-white md:text-6xl">{headline}</h1>
        {subheadline ? <p className="mt-6 text-lg text-white/85 md:text-xl">{subheadline}</p> : null}
        {ctaText ? (
          <a
            className="mt-10 inline-flex min-h-[48px] items-center rounded-full bg-white px-10 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:scale-[1.02]"
            href={ctaUrl ?? "#"}
          >
            {ctaText}
          </a>
        ) : null}
      </motion.div>
    </div>
  );
}

export function Product3dFallback({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center gap-8 py-12 md:flex-row md:justify-center">
      <motion.div
        animate={{ rotateY: 360 }}
        className="flex h-48 w-48 items-center justify-center rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-slate-800 to-indigo-900 shadow-2xl"
        transition={{ duration: 8, ease: "linear", repeat: Infinity }}
      >
        <div className="h-24 w-24 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 shadow-inner" />
      </motion.div>
      <div className="max-w-md text-center md:text-left">
        <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
        {subtitle ? <p className="mt-3 text-muted-foreground">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export function Stats3dFallback({ stats }: { stats: { label?: string; value?: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
      {stats.map((s, i) => (
        <motion.div
          animate={{ y: [0, -6, 0] }}
          className="rounded-2xl border border-border/60 bg-card/80 p-6 text-center shadow-card"
          key={i}
          transition={{ duration: 2.5, delay: i * 0.15, repeat: Infinity, ease: "easeInOut" }}
        >
          <p className="text-3xl font-bold tabular-nums tracking-tight md:text-4xl">{str(s.value, "—")}</p>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
