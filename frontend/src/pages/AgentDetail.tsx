import { useParams, useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Settings,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ListTodo,
  Cpu,
  MessageCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import { AgentsLayout } from "@/components/agents/AgentsLayout";
import { AgentTerminal } from "@/components/agents/AgentTerminal";
import { agents } from "@/lib/agents-data";
import { cn } from "@/lib/utils";

const taskStatusConfig = {
  completed: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  in_progress: { icon: Loader2, color: "text-amber-400", bg: "bg-amber-400/10", animate: true },
  queued: { icon: Clock, color: "text-slate-400", bg: "bg-slate-400/10" },
  failed: { icon: XCircle, color: "text-red-400", bg: "bg-red-400/10" },
};

const functionalityConfig = {
  full: { label: "100% Funcional", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
  partial: { label: "Parcialmente Funcional", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: AlertCircle },
  ui_only: { label: "Solo Interfaz Visual", color: "text-zinc-400", bg: "bg-zinc-500/10 border-zinc-500/20", icon: Clock },
  planned: { label: "Planificado", color: "text-zinc-600", bg: "bg-zinc-800/50 border-zinc-700/20", icon: Info },
};

export default function AgentDetail() {
  const { ts } = useI18n();
  const { agentId } = useParams();
  const navigate = useNavigate();
  const agent = agents.find((a) => a.id === agentId);

  if (!agent) {
    return (
      <AgentsLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-sm text-slate-500">Agente no encontrado</p>
          <button onClick={() => navigate("/agents")} className="mt-3 text-xs text-cyan-400 hover:underline">
            Volver al panel
          </button>
        </div>
      </AgentsLayout>
    );
  }

  const Icon = agent.icon;
  const func = functionalityConfig[agent.functionalityLevel];
  const FuncIcon = func.icon;
  const funcMetric = agent.metrics.find(m => m.label === "Funcionalidad");
  const funcPercent = funcMetric ? funcMetric.value : 0;

  return (
    <AgentsLayout>
      {/* Back + Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/agents")}
          className="mb-4 flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300"
        >
          <ArrowLeft className="h-3 w-3" />
          Volver al Centro de Agentes
        </button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: `${agent.color}15` }}
            >
              <Icon className="h-7 w-7" style={{ color: agent.color }} />
            </motion.div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
                <div className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-0.5", func.bg)}>
                  <FuncIcon className={cn("h-3 w-3", func.color)} />
                  <span className={cn("text-[10px] font-medium", func.color)}>{func.label}</span>
                </div>
              </div>
              <p className="text-sm text-slate-400">{agent.codename}</p>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">{agent.longDescription}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/agents/${agent.id}/chat`)}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-white transition-all bg-gradient-to-r ${agent.gradient} hover:opacity-90 shadow-lg`}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Chatear con {agent.name}
            </button>
            <button className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-[#12131A] px-3 py-2 text-xs text-slate-400 transition-colors hover:bg-[#1A1B25] hover:text-white">
              <Settings className="h-3 w-3" />
              Configurar
            </button>
          </div>
        </div>
      </div>

      {/* Functionality Status Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 rounded-xl border border-white/[0.06] bg-[#12131A] px-6 py-4"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FuncIcon className={cn("h-4 w-4", func.color)} />
            <span className={cn("text-xs font-semibold", func.color)}>{func.label}</span>
            {funcPercent > 0 && (
              <span className="text-xs font-bold text-white ml-2">{funcPercent}%</span>
            )}
          </div>
        </div>
        {funcPercent > 0 && (
          <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden mb-3">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-1000",
                funcPercent >= 80 ? "bg-gradient-to-r from-emerald-600 to-emerald-400" :
                funcPercent >= 40 ? "bg-gradient-to-r from-amber-600 to-amber-400" :
                "bg-gradient-to-r from-zinc-600 to-zinc-400"
              )}
              style={{ width: `${funcPercent}%` }}
            />
          </div>
        )}
        <p className="text-[11px] text-slate-500">{agent.functionalityNote}</p>
      </motion.div>

      {/* Metrics Grid */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {agent.metrics.map((metric, i) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-white/[0.06] bg-[#12131A] p-5"
          >
            <p className="mb-1 text-xs text-slate-500">{metric.label}</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-white">
                {metric.unit === "✓" || metric.unit === "OK" ? "Sí" : metric.unit === "✗" ? "No" : (
                  typeof metric.value === "number" && metric.value >= 1000 ? metric.value.toLocaleString() : metric.value
                )}
              </span>
              {metric.unit && metric.unit !== "✓" && metric.unit !== "✗" && metric.unit !== "OK" && (
                <span className="mb-1 text-sm text-slate-500">{metric.unit}</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-white/[0.06] bg-[#12131A]"
        >
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3">
            <ListTodo className="h-3.5 w-3.5 text-slate-500" />
            <h3 className="text-xs font-semibold text-white">Estado de Implementación</h3>
          </div>
          <div className="divide-y divide-white/[0.03]">
            {agent.recentTasks.map((task) => {
              const config = taskStatusConfig[task.status];
              const StatusIcon = config.icon;
              return (
                <div key={task.id} className="flex items-center gap-3 px-5 py-3">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-md ${config.bg}`}>
                    <StatusIcon className={`h-3 w-3 ${config.color} ${"animate" in config ? "animate-spin" : ""}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs text-white">{task.description}</p>
                    <p className="text-[10px] text-slate-500">{task.timestamp}{task.duration ? ` · ${task.duration}` : ""}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Terminal Logs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <AgentTerminal logs={agent.logs} agentName={agent.name} color={agent.color} />
        </motion.div>
      </div>

      {/* Capabilities */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-6 rounded-xl border border-white/[0.06] bg-[#12131A]"
      >
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3">
          <Cpu className="h-3.5 w-3.5 text-slate-500" />
          <h3 className="text-xs font-semibold text-white">Capacidades</h3>
        </div>
        <div className="grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {agent.capabilities.map((cap, i) => {
            const isPending = cap.startsWith("[Pendiente]");
            return (
              <motion.div
                key={cap}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 + i * 0.03 }}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2",
                  isPending ? "bg-white/[0.01]" : "bg-white/[0.02]"
                )}
              >
                {isPending ? (
                  <Clock className="h-3 w-3 text-zinc-600 shrink-0" />
                ) : (
                  <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: agent.color }} />
                )}
                <span className={cn("text-[11px]", isPending ? "text-slate-600" : "text-slate-400")}>
                  {isPending ? cap.replace("[Pendiente] ", "") : cap}
                </span>
                {isPending && (
                  <span className="ml-auto text-[8px] text-zinc-700 bg-zinc-800/50 px-1.5 py-0.5 rounded">PENDIENTE</span>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </AgentsLayout>
  );
}