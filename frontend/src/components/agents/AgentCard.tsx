import { motion } from "framer-motion";
import { ChevronRight, CheckCircle2, AlertCircle, Clock, XCircle } from "lucide-react";
import type { Agent } from "@/lib/agents-data";
import { cn } from "@/lib/utils";

interface AgentCardProps {
  agent: Agent;
  index: number;
  onClick: () => void;
}

const statusConfig = {
  active: { label: "Activo", color: "bg-emerald-500", pulse: true },
  processing: { label: "Procesando", color: "bg-amber-500", pulse: true },
  idle: { label: "Solo UI", color: "bg-slate-500", pulse: false },
  error: { label: "Error", color: "bg-red-500", pulse: true },
};

const functionalityConfig = {
  full: { label: "100% Funcional", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
  partial: { label: "Parcial", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: AlertCircle },
  ui_only: { label: "Solo UI", color: "text-zinc-400", bg: "bg-zinc-500/10 border-zinc-500/20", icon: Clock },
  planned: { label: "Planificado", color: "text-zinc-600", bg: "bg-zinc-800/50 border-zinc-700/20", icon: XCircle },
};

export function AgentCard({ agent, index, onClick }: AgentCardProps) {
  const status = statusConfig[agent.status];
  const functionality = functionalityConfig[agent.functionalityLevel];
  const FuncIcon = functionality.icon;
  const Icon = agent.icon;

  // Find the "Funcionalidad" metric for the progress bar
  const funcMetric = agent.metrics.find(m => m.label === "Funcionalidad");
  const funcPercent = funcMetric ? funcMetric.value : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      onClick={onClick}
      className="group relative cursor-pointer rounded-xl border border-white/[0.06] bg-[#12131A] p-5 transition-all duration-300 hover:border-white/[0.12] hover:bg-[#1A1B25] hover:shadow-2xl hover:shadow-black/20"
    >
      {/* Colored top accent */}
      <div
        className="absolute left-0 top-0 h-[2px] w-full rounded-t-xl opacity-60 transition-opacity group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg, ${agent.color}, transparent)` }}
      />

      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ background: `${agent.color}15` }}
          >
            <Icon className="h-5 w-5" style={{ color: agent.color }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">{agent.name}</h3>
              <div className="flex items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full ${status.color} ${status.pulse ? "animate-pulse" : ""}`} />
                <span className="text-[10px] font-medium text-slate-500">{status.label}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500">{agent.codename}</p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-600 transition-all group-hover:translate-x-0.5 group-hover:text-slate-400" />
      </div>

      {/* Functionality Badge */}
      <div className={cn("mb-3 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5", functionality.bg)}>
        <FuncIcon className={cn("h-3 w-3", functionality.color)} />
        <span className={cn("text-[10px] font-semibold", functionality.color)}>{functionality.label}</span>
        {funcPercent > 0 && (
          <span className="ml-auto text-[10px] font-bold text-white">{funcPercent}%</span>
        )}
      </div>

      {/* Description */}
      <p className="mb-3 text-[11px] leading-relaxed text-slate-400 line-clamp-2">{agent.description}</p>

      {/* Functionality Progress Bar */}
      {funcPercent > 0 && (
        <div className="mb-3">
          <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                funcPercent >= 80 ? "bg-gradient-to-r from-emerald-600 to-emerald-400" :
                funcPercent >= 40 ? "bg-gradient-to-r from-amber-600 to-amber-400" :
                "bg-gradient-to-r from-zinc-600 to-zinc-400"
              )}
              style={{ width: `${funcPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Quick Metrics — show first 2 non-Funcionalidad metrics */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        {agent.metrics.filter(m => m.label !== "Funcionalidad").slice(0, 2).map((metric) => (
          <div key={metric.label} className="rounded-lg bg-white/[0.03] px-3 py-2">
            <p className="text-[10px] text-slate-500 truncate">{metric.label}</p>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-white">
                {metric.unit === "✓" ? "Sí" : metric.unit === "✗" ? "No" : (
                  typeof metric.value === "number" && metric.value >= 1000
                    ? metric.value.toLocaleString()
                    : metric.value
                )}
                {metric.unit && metric.unit !== "✓" && metric.unit !== "✗" && (
                  <span className="text-[10px] text-slate-500 ml-0.5">{metric.unit}</span>
                )}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer — Honest note */}
      <div className="border-t border-white/[0.04] pt-3">
        <p className="text-[9px] text-slate-600 leading-relaxed line-clamp-2">{agent.functionalityNote}</p>
      </div>
    </motion.div>
  );
}