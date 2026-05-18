import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, Minus, CheckCircle2, AlertCircle, Clock, Bot, Activity, Shield } from "lucide-react";
import type { globalMetrics as GlobalMetricsType } from "@/lib/agents-data";

interface GlobalMetricsBarProps {
  metrics: typeof GlobalMetricsType;
}

const metricItems = [
  { key: "totalAgents" as const, label: "Total Agentes", icon: Bot, format: (v: number) => `${v}`, color: "#8B5CF6" },
  { key: "activeAgents" as const, label: "Con Funcionalidad", icon: Activity, format: (v: number) => `${v}`, color: "#10B981" },
  { key: "fullFunctionality" as const, label: "100% Funcional", icon: CheckCircle2, format: (v: number) => `${v}`, color: "#10B981" },
  { key: "partialFunctionality" as const, label: "Parcial", icon: AlertCircle, format: (v: number) => `${v}`, color: "#F59E0B" },
  { key: "uiOnly" as const, label: "Solo UI", icon: Clock, format: (v: number) => `${v}`, color: "#64748B" },
  { key: "systemHealth" as const, label: "Calidad Global", icon: Shield, format: (v: number) => `${v}%`, color: "#06B6D4" },
];

export function GlobalMetricsBar({ metrics }: GlobalMetricsBarProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {metricItems.map((item, i) => {
        const Icon = item.icon;
        const value = metrics[item.key];
        return (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-white/[0.06] bg-[#12131A] p-4"
          >
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${item.color}15` }}>
                <Icon className="h-3.5 w-3.5" style={{ color: item.color }} />
              </div>
              <span className="text-[10px] font-medium text-slate-500">{item.label}</span>
            </div>
            <p className="text-lg font-bold text-white">{item.format(value)}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

interface MetricDetailProps {
  label: string;
  value: number;
  unit: string;
  change: number;
  trend: "up" | "down" | "stable";
  color: string;
  isPositiveDown?: boolean;
}

export function MetricDetail({ label, value, unit, change, trend, color, isPositiveDown }: MetricDetailProps) {
  const isPositive = isPositiveDown ? trend === "down" : trend === "up";

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#12131A] p-5">
      <p className="mb-1 text-xs text-slate-500">{label}</p>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-white">
          {typeof value === "number" && value >= 1000 ? value.toLocaleString() : value}
        </span>
        {unit && <span className="mb-1 text-sm text-slate-500">{unit}</span>}
      </div>
      <div className={`mt-2 flex items-center gap-1 text-xs ${isPositive ? "text-emerald-400" : trend === "stable" ? "text-slate-500" : "text-red-400"}`}>
        {trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : trend === "down" ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
        <span>{Math.abs(change)}% vs ayer</span>
      </div>
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/[0.04]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, (value / (value * 1.2)) * 100)}%` }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}