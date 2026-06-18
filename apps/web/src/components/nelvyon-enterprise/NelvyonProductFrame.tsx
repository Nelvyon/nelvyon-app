"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Mac-style product frame — ported from Simplistic SaaS hero preview block. */
export function NelvyonProductFrame() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      className="relative mx-auto mt-16 max-w-5xl md:mt-20"
      initial={reduceMotion ? false : { opacity: 0, y: 32 }}
      transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="nv-enterprise-product-frame overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0e]/80 shadow-[0_40px_120px_rgba(0,102,255,0.15)] backdrop-blur-md">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-500/90" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/90" />
            <span className="h-3 w-3 rounded-full bg-green-500/90" />
          </div>
          <span className="flex-1 text-center text-xs text-zinc-500">app.nelvyon.com/dashboard</span>
          <span className="w-12" aria-hidden />
        </div>
        <div className="grid gap-0 md:grid-cols-[220px_1fr]">
          <div aria-hidden className="hidden border-r border-white/10 bg-gradient-to-b from-[#07122a] to-[#0b1428] p-4 md:block">
            <div className="mb-6 h-3 w-20 rounded bg-gradient-to-r from-white to-[#66a3ff]" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  className={`h-8 rounded-lg ${i === 1 ? "bg-[#0084ff]/30 ring-1 ring-[#0084ff]/40" : "bg-white/5"}`}
                  key={i}
                />
              ))}
            </div>
          </div>
          <div className="p-4 md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="h-8 w-48 rounded-lg bg-white/10" />
              <div className="h-6 w-24 rounded-full border border-[#0084ff]/40 bg-[#0084ff]/15" />
            </div>
            <div className="mb-4 h-28 rounded-xl border border-[#0084ff]/25 bg-gradient-to-br from-[#07122a] via-[#0b1428] to-[#07122a] p-4">
              <div className="h-3 w-32 rounded bg-[#66a3ff]/40" />
              <div className="mt-3 h-4 w-3/4 max-w-md rounded bg-white/20" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {["ROAS 3.1x", "Leads +340%", "24/7 OS"].map((label) => (
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center text-xs text-zinc-400" key={label}>
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-8 -bottom-8 h-24 bg-[radial-gradient(ellipse_at_center,rgba(0,102,255,0.25),transparent_70%)]"
      />
    </motion.div>
  );
}
