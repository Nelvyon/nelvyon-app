import { useState, useMemo, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import SaasLayout from "@/components/SaasLayout";
import { client } from "@/lib/api";
import {
  Bot, Zap, Users, Globe, ShieldCheck, Megaphone, FileText,
  MessageCircle, Phone, BarChart3, Settings, ChevronRight,
  CheckCircle2, AlertCircle, Clock, XCircle, Play, Pause,
  Activity, Info, ArrowRight, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ─── Honest Agent Definitions ─── */
interface AutopilotAgent {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  gradient: string;
  description: string;
  functionalityLevel: "full" | "partial" | "ui_only" | "planned";
  functionalityPercent: number;
  functionalityNote: string;
  capabilities: { name: string; status: "done" | "partial" | "planned" }[];
  enabled: boolean;
}

const initialAgents: AutopilotAgent[] = [
  {
    id: "operator", name: "OPERATOR", icon: Bot, color: "#8B5CF6",
    gradient: "from-violet-500 to-purple-600",
    description: "Orquestador central del OS. Coordina proyectos y genera outputs con IA.",
    functionalityLevel: "partial", functionalityPercent: 60,
    functionalityNote: "Genera outputs con IA real. Orquestación multi-agente es simulada en UI.",
    capabilities: [
      { name: "Generación de outputs con IA", status: "done" },
      { name: "Gestión de proyectos CRUD", status: "done" },
      { name: "QA automático de outputs", status: "done" },
      { name: "Orquestación multi-agente real", status: "planned" },
      { name: "Priorización automática", status: "planned" },
    ],
    enabled: true,
  },
  {
    id: "acquisition", name: "ACQUISITION", icon: Users, color: "#10B981",
    gradient: "from-emerald-500 to-green-600",
    description: "Captación de clientes. Actualmente es gestión manual via CRM.",
    functionalityLevel: "partial", functionalityPercent: 40,
    functionalityNote: "CRM funcional para gestión de clientes. Captación automática no implementada.",
    capabilities: [
      { name: "CRM: CRUD de clientes", status: "done" },
      { name: "Filtrado y búsqueda", status: "done" },
      { name: "Captación automática multicanal", status: "planned" },
      { name: "Lead scoring con IA", status: "planned" },
    ],
    enabled: true,
  },
  {
    id: "marketing", name: "MARKETING", icon: Megaphone, color: "#F59E0B",
    gradient: "from-amber-500 to-orange-600",
    description: "Generación de campañas y contenido de marketing.",
    functionalityLevel: "partial", functionalityPercent: 45,
    functionalityNote: "Genera contenido de marketing via el generador IA. Automatización de campañas pendiente.",
    capabilities: [
      { name: "Generación de copy con IA", status: "done" },
      { name: "Plantillas de campañas", status: "partial" },
      { name: "Envío automático de emails", status: "planned" },
      { name: "A/B testing automático", status: "planned" },
    ],
    enabled: true,
  },
  {
    id: "segmenter", name: "SEGMENTER", icon: BarChart3, color: "#06B6D4",
    gradient: "from-cyan-500 to-blue-600",
    description: "Segmentación y análisis de datos de clientes.",
    functionalityLevel: "ui_only", functionalityPercent: 15,
    functionalityNote: "Interfaz visual disponible. Segmentación real de datos no implementada.",
    capabilities: [
      { name: "Vista de segmentos (UI)", status: "partial" },
      { name: "Segmentación automática con ML", status: "planned" },
      { name: "Análisis predictivo", status: "planned" },
    ],
    enabled: false,
  },
  {
    id: "dealmaker", name: "DEALMAKER", icon: Sparkles, color: "#EF4444",
    gradient: "from-red-500 to-rose-600",
    description: "Cierre de ventas y gestión de deals.",
    functionalityLevel: "ui_only", functionalityPercent: 20,
    functionalityNote: "Pipeline visual disponible. Automatización de cierre no implementada.",
    capabilities: [
      { name: "Pipeline visual (UI)", status: "partial" },
      { name: "Propuestas automáticas con IA", status: "planned" },
      { name: "Cierre automático", status: "planned" },
    ],
    enabled: false,
  },
  {
    id: "voice", name: "VOICE AI", icon: Phone, color: "#A855F7",
    gradient: "from-purple-500 to-fuchsia-600",
    description: "Asistente de voz con IA para atención al cliente.",
    functionalityLevel: "planned", functionalityPercent: 0,
    functionalityNote: "No implementado. Requiere integración con servicio de voz (Twilio, etc.).",
    capabilities: [
      { name: "Reconocimiento de voz", status: "planned" },
      { name: "Respuestas con IA", status: "planned" },
      { name: "Multiidioma", status: "planned" },
    ],
    enabled: false,
  },
  {
    id: "legal", name: "LEGAL", icon: FileText, color: "#64748B",
    gradient: "from-slate-500 to-zinc-600",
    description: "Generación de documentos legales y contratos.",
    functionalityLevel: "ui_only", functionalityPercent: 10,
    functionalityNote: "Plantillas básicas en UI. Generación legal real no implementada.",
    capabilities: [
      { name: "Plantillas de contratos (UI)", status: "partial" },
      { name: "Generación legal con IA", status: "planned" },
      { name: "Firma digital", status: "planned" },
    ],
    enabled: false,
  },
  {
    id: "billing", name: "BILLING", icon: ShieldCheck, color: "#14B8A6",
    gradient: "from-teal-500 to-emerald-600",
    description: "Facturación y procesamiento de pagos.",
    functionalityLevel: "partial", functionalityPercent: 55,
    functionalityNote: "Stripe integrado para pagos reales. Facturación automática parcial.",
    capabilities: [
      { name: "Pagos con Stripe", status: "done" },
      { name: "Historial de transacciones", status: "done" },
      { name: "Facturación automática", status: "partial" },
      { name: "Suscripciones recurrentes", status: "planned" },
    ],
    enabled: true,
  },
  {
    id: "support", name: "SUPPORT", icon: MessageCircle, color: "#3B82F6",
    gradient: "from-blue-500 to-indigo-600",
    description: "Soporte al cliente con chat IA.",
    functionalityLevel: "partial", functionalityPercent: 50,
    functionalityNote: "Chat con IA funcional via ATLAS. Sistema de tickets no implementado.",
    capabilities: [
      { name: "Chat con IA (ATLAS)", status: "done" },
      { name: "Respuestas contextuales", status: "done" },
      { name: "Sistema de tickets", status: "planned" },
      { name: "Escalación automática", status: "planned" },
    ],
    enabled: true,
  },
  {
    id: "security", name: "SENTINEL", icon: ShieldCheck, color: "#EF4444",
    gradient: "from-red-600 to-rose-700",
    description: "Seguridad y protección del sistema.",
    functionalityLevel: "ui_only", functionalityPercent: 10,
    functionalityNote: "Dashboard de seguridad visual. Protección real depende de la infraestructura del hosting.",
    capabilities: [
      { name: "Dashboard de seguridad (UI)", status: "partial" },
      { name: "Detección de amenazas", status: "planned" },
      { name: "Firewall inteligente", status: "planned" },
    ],
    enabled: false,
  },
];

const funcConfig = {
  full: { label: "Funcional", color: "text-emerald-400", bg: "bg-emerald-500/10", icon: CheckCircle2 },
  partial: { label: "Parcial", color: "text-amber-400", bg: "bg-amber-500/10", icon: AlertCircle },
  ui_only: { label: "Solo UI", color: "text-zinc-400", bg: "bg-zinc-500/10", icon: Clock },
  planned: { label: "Planificado", color: "text-zinc-600", bg: "bg-zinc-800/50", icon: XCircle },
};

/* Icon mapping for backend agents */
const ICON_MAP: Record<string, React.ElementType> = {
  Bot, Zap, Users, Globe, ShieldCheck, Megaphone, FileText,
  MessageCircle, Phone, BarChart3, Settings, Sparkles, Activity,
};

export default function SaasAutopilot() {
  const { ts } = useI18n();
  const navigate = useNavigate();
  const [agents, setAgents] = useState(initialAgents);
  const [selectedAgent, setSelectedAgent] = useState<AutopilotAgent | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [backendJobs, setBackendJobs] = useState<Array<Record<string, unknown>>>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);

  /* Load agents from backend nelvyon_agents, merge with icon config */
  const loadBackendAgents = useCallback(async () => {
    setLoadingAgents(true);
    try {
      const res = await client.entities.nelvyon_agents.query({ sort: "-id", limit: 50 });
      const items = (res.data?.items || []) as Array<Record<string, unknown>>;
      if (items.length > 0) {
        const mapped: AutopilotAgent[] = items.map((item) => {
          const agentId = (item.agent_id as string) || "";
          const fallback = initialAgents.find(a => a.id === agentId);
          let caps: { name: string; status: "done" | "partial" | "planned" }[] = [];
          try {
            const raw = JSON.parse((item.capabilities as string) || "[]");
            caps = Array.isArray(raw) ? raw.map((c: unknown) => {
              if (typeof c === "string") return { name: c, status: "done" as const };
              const obj = c as { name?: string; status?: string };
              return { name: obj.name || "", status: (obj.status || "planned") as "done" | "partial" | "planned" };
            }) : [];
          } catch (err) { if (import.meta.env.DEV) console.warn("[SaasAutopilot] Error:", err); caps = fallback?.capabilities || []; }
          return {
            id: agentId,
            name: (item.name as string) || fallback?.name || agentId,
            icon: ICON_MAP[(item.icon_name as string) || ""] || fallback?.icon || Bot,
            color: (item.color as string) || fallback?.color || "#8B5CF6",
            gradient: (item.gradient as string) || fallback?.gradient || "from-violet-500 to-purple-600",
            description: (item.description as string) || fallback?.description || "",
            functionalityLevel: ((item.functionality_level as string) || fallback?.functionalityLevel || "planned") as AutopilotAgent["functionalityLevel"],
            functionalityPercent: (item.success_rate as number) || fallback?.functionalityPercent || 0,
            functionalityNote: (item.functionality_note as string) || fallback?.functionalityNote || "",
            capabilities: caps,
            enabled: ((item.status as string) || "") === "online" || (fallback?.enabled ?? false),
          };
        });
        setAgents(mapped);
      }
    } catch (err) { if (import.meta.env.DEV) console.warn("[SaasAutopilot] Error:", err); /* keep initialAgents as fallback */ }
    setLoadingAgents(false);
  }, []);

  const loadBackendJobs = useCallback(async () => {
    try {
      const res = await client.entities.automation_jobs.query({ sort: "-created_at", limit: 50 });
      setBackendJobs((res.data?.items as Array<Record<string, unknown>>) || []);
    } catch (err) { if (import.meta.env.DEV) console.warn("[SaasAutopilot] Error:", err); /* fallback */ }
  }, []);

  useEffect(() => { loadBackendAgents(); loadBackendJobs(); }, [loadBackendAgents, loadBackendJobs]);

  const toggleAgent = async (id: string) => {
    const agent = agents.find(a => a.id === id);
    if (!agent) return;
    const newEnabled = !agent.enabled;
    const newStatus = newEnabled ? "online" : "offline";

    // Optimistic UI update
    setAgents(prev => prev.map(a => a.id === id ? { ...a, enabled: newEnabled } : a));

    try {
      // Find the backend record ID for this agent
      const res = await client.entities.nelvyon_agents.query({ sort: "-id", limit: 50 });
      const items = (res.data?.items || []) as Array<Record<string, unknown>>;
      const backendAgent = items.find(item => (item.agent_id as string) === id);

      if (backendAgent && backendAgent.id) {
        // Update the agent's status in nelvyon_agents
        await client.entities.nelvyon_agents.update({
          id: String(backendAgent.id),
          data: { status: newStatus },
        });
      }

      // Also log the toggle action to automation_jobs
      await client.entities.automation_jobs.create({
        data: {
          job_type: "agent_toggle",
          source: id,
          status: "completed",
          input_data: JSON.stringify({ agent_id: id, new_status: newStatus }),
          created_at: new Date().toISOString(),
        },
      });

      toast.success(`Agente ${agent.name} ${newEnabled ? "activado" : "desactivado"}`);
    } catch {
      // Revert on failure
      setAgents(prev => prev.map(a => a.id === id ? { ...a, enabled: !newEnabled } : a));
      toast.error("Error al cambiar estado del agente");
    }
  };

  const enabledCount = useMemo(() => agents.filter(a => a.enabled).length, [agents]);
  const avgFunc = useMemo(() => {
    const enabled = agents.filter(a => a.enabled);
    return enabled.length ? Math.round(enabled.reduce((s, a) => s + a.functionalityPercent, 0) / enabled.length) : 0;
  }, [agents]);

  const filteredAgents = agents.filter(a => {
    if (filter === "all") return true;
    if (filter === "enabled") return a.enabled;
    return a.functionalityLevel === filter;
  });

  return (
    <SaasLayout title="Autopilot" subtitle="Sistema de agentes autónomos SaaS">
      {/* Honest Banner */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-400">Estado Real del Autopilot</p>
            <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
              El sistema Autopilot es un concepto en desarrollo. Los agentes que se muestran como "habilitados" tienen funcionalidad
              parcial — principalmente generación de contenido con IA y CRUD básico. La automatización autónoma real (captación automática,
              cierre de ventas, llamadas de voz, etc.) <strong className="text-amber-400">no está implementada</strong>.
              Los toggles permiten marcar qué agentes quieres activar cuando estén disponibles.
            </p>
          </div>
        </div>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Agentes Totales", value: agents.length, icon: Bot, color: "#8B5CF6" },
          { label: "Habilitados", value: enabledCount, icon: Play, color: "#10B981" },
          { label: "Func. Promedio", value: `${avgFunc}%`, icon: Activity, color: "#F59E0B" },
          { label: "100% Funcional", value: agents.filter(a => a.functionalityLevel === "full").length, icon: CheckCircle2, color: "#10B981" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/[0.06] bg-[#0A0E13] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${s.color}15` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
            </div>
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-[10px] text-zinc-600">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {[
          { key: "all", label: "Todos" },
          { key: "enabled", label: "Habilitados" },
          { key: "partial", label: "Parciales" },
          { key: "ui_only", label: "Solo UI" },
          { key: "planned", label: "Planificados" },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={cn("px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all border",
              filter === f.key ? "bg-violet-500/10 border-violet-500/20 text-violet-400" : "border-white/[0.06] text-zinc-500 hover:text-zinc-300"
            )}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <AnimatePresence mode="popLayout">
          {filteredAgents.map((agent, i) => {
            const func2 = funcConfig[agent.functionalityLevel];
            const FuncIcon = func2.icon;
            return (
              <motion.div
                key={agent.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.03 }}
                className={cn(
                  "rounded-xl border p-5 transition-all cursor-pointer group",
                  agent.enabled
                    ? "border-white/[0.08] bg-[#12131A] hover:border-white/[0.15]"
                    : "border-white/[0.04] bg-[#0A0C10] opacity-60 hover:opacity-80"
                )}
                onClick={() => setSelectedAgent(agent)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br", agent.gradient)}>
                      <agent.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">{agent.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <FuncIcon className={cn("w-3 h-3", func2.color)} />
                        <span className={cn("text-[9px] font-semibold", func2.color)}>{func2.label}</span>
                      </div>
                    </div>
                  </div>
                  {/* Toggle */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleAgent(agent.id); }}
                    className={cn("w-10 h-5 rounded-full transition-all relative",
                      agent.enabled ? "bg-emerald-500" : "bg-zinc-700"
                    )}
                  >
                    <div className={cn("w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all",
                      agent.enabled ? "left-5.5" : "left-0.5"
                    )} style={{ left: agent.enabled ? "22px" : "2px" }} />
                  </button>
                </div>

                {/* Description */}
                <p className="text-[10px] text-zinc-500 mb-3 line-clamp-2">{agent.description}</p>

                {/* Progress */}
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] text-zinc-600">Funcionalidad</span>
                    <span className="text-[9px] font-bold text-white">{agent.functionalityPercent}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-700",
                        agent.functionalityPercent >= 50 ? "bg-gradient-to-r from-emerald-600 to-emerald-400" :
                        agent.functionalityPercent >= 20 ? "bg-gradient-to-r from-amber-600 to-amber-400" :
                        "bg-gradient-to-r from-zinc-600 to-zinc-400"
                      )}
                      style={{ width: `${agent.functionalityPercent}%` }}
                    />
                  </div>
                </div>

                {/* Capabilities summary */}
                <div className="flex items-center gap-3 text-[9px] text-zinc-600">
                  <span className="text-emerald-400">{agent.capabilities.filter(c => c.status === "done").length} hechas</span>
                  <span className="text-amber-400">{agent.capabilities.filter(c => c.status === "partial").length} parcial</span>
                  <span className="text-zinc-500">{agent.capabilities.filter(c => c.status === "planned").length} pendientes</span>
                </div>

                <ChevronRight className="w-3.5 h-3.5 text-zinc-700 mt-2 group-hover:text-zinc-400 transition-colors" />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Selected Agent Detail */}
      <AnimatePresence>
        {selectedAgent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="rounded-xl border border-white/[0.08] bg-[#12131A] p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br", selectedAgent.gradient)}>
                  <selectedAgent.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">{selectedAgent.name}</h2>
                  <p className="text-xs text-zinc-500">{selectedAgent.description}</p>
                </div>
              </div>
              <button onClick={() => setSelectedAgent(null)} className="text-xs text-zinc-500 hover:text-zinc-300">
                Cerrar
              </button>
            </div>

            {/* Functionality Note */}
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.04] p-3 mb-4">
              <p className="text-[11px] text-zinc-400 leading-relaxed">{selectedAgent.functionalityNote}</p>
            </div>

            {/* Capabilities List */}
            <h3 className="text-xs font-semibold text-white mb-3">Capacidades</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedAgent.capabilities.map((cap) => (
                <div key={cap.name} className={cn("flex items-center gap-2 rounded-lg px-3 py-2",
                  cap.status === "done" ? "bg-emerald-500/[0.05]" :
                  cap.status === "partial" ? "bg-amber-500/[0.05]" : "bg-zinc-800/30"
                )}>
                  {cap.status === "done" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : cap.status === "partial" ? (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                  )}
                  <span className={cn("text-[11px]",
                    cap.status === "done" ? "text-emerald-300" :
                    cap.status === "partial" ? "text-amber-300" : "text-zinc-500"
                  )}>{cap.name}</span>
                  {cap.status === "planned" && (
                    <span className="ml-auto text-[8px] text-zinc-700 bg-zinc-800/50 px-1.5 py-0.5 rounded">PENDIENTE</span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Generador IA", path: "/generator", icon: Sparkles, desc: "Generar outputs con IA real", color: "text-violet-400" },
          { label: "CRM", path: "/saas/crm", icon: Users, desc: "Gestión de clientes", color: "text-blue-400" },
          { label: "Pagos", path: "/saas/payments", icon: ShieldCheck, desc: "Stripe integrado", color: "text-emerald-400" },
          { label: "Agentes OS", path: "/agents", icon: Bot, desc: "Ver todos los agentes", color: "text-cyan-400" },
        ].map(nav => (
          <button key={nav.label} onClick={() => navigate(nav.path)}
            className="p-4 rounded-xl border border-white/[0.06] bg-[#0A0E13] hover:border-white/[0.1] transition-all text-left group">
            <nav.icon className={cn("w-5 h-5 mb-2", nav.color)} />
            <p className="text-xs font-semibold text-white group-hover:text-violet-300 transition-colors">{nav.label}</p>
            <p className="text-[9px] text-zinc-600 mt-0.5">{nav.desc}</p>
            <ArrowRight className="w-3 h-3 text-zinc-700 mt-2 group-hover:text-zinc-400 transition-colors" />
          </button>
        ))}
      </div>
    </SaasLayout>
  );
}