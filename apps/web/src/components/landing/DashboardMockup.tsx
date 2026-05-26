"use client";

import { motion } from "framer-motion";

const METRICS = [
  { label: "Leads hoy", value: "127", delta: "+18%" },
  { label: "ROAS", value: "4.2x", delta: "+12%" },
  { label: "Conversión", value: "8.4%", delta: "+3%" },
  { label: "Ingresos", value: "€24.8k", delta: "+22%" },
];

export function DashboardMockup({ className = "" }: { className?: string }) {
  return (
    <motion.div
      animate={{ y: [0, -8, 0] }}
      className={`overflow-hidden rounded-2xl border shadow-2xl ${className}`}
      style={{
        borderColor: "rgba(0, 102, 255, 0.3)",
        background: "linear-gradient(145deg, #0A0F1E 0%, #050510 100%)",
        boxShadow: "0 25px 80px rgba(0, 102, 255, 0.15)",
      }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
        <span className="ml-2 text-xs text-zinc-500">NELVYON — Dashboard</span>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
        {METRICS.map((m) => (
          <div
            className="rounded-xl border border-white/5 bg-black/40 p-3"
            key={m.label}
          >
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">{m.label}</p>
            <p className="mt-1 text-lg font-bold text-white">{m.value}</p>
            <p className="text-xs font-medium text-[#00CFFF]">{m.delta}</p>
          </div>
        ))}
      </div>
      <div className="mx-4 mb-4 h-28 rounded-xl border border-white/5 bg-gradient-to-r from-[#0066FF]/20 to-[#00CFFF]/10 p-3">
        <div className="flex h-full items-end gap-1">
          {[40, 65, 45, 80, 55, 90, 70, 95, 60, 85].map((h, i) => (
            <div
              className="flex-1 rounded-t bg-[#0066FF]/60"
              key={i}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
