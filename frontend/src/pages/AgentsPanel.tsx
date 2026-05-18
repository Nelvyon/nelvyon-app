import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bot, Activity, Search, CheckCircle2, AlertCircle, Clock, Loader2, Database, AlertTriangle, Shield, ScrollText, UserCog } from "lucide-react";
import { AgentsLayout } from "@/components/agents/AgentsLayout";
import { AgentCard } from "@/components/agents/AgentCard";
import { GlobalMetricsBar } from "@/components/agents/AgentMetrics";
import { type Agent } from "@/lib/agents-data";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

/* Icon imports for mapping backend icon_name → component */
import {
  Globe, ShoppingCart, Share2, Megaphone, Mail, Workflow as WorkflowIcon,
  Target, Palette, FileText, Zap, Users, BarChart3,
  MessageSquare, Phone, Calendar, CreditCard, Layers, BookOpen,
  Headphones, Rocket, Eye, Lock, Brain, Sparkles,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  Globe, ShoppingCart, Share2, Megaphone, Mail, Workflow: WorkflowIcon,
  Target, Palette, FileText, Zap, Shield, Users, BarChart3,
  MessageSquare, Phone, Calendar, CreditCard, Layers, BookOpen,
  Headphones, Rocket, Eye, Lock, Brain, Bot, Activity, Sparkles,
};

/* ═══════════════════════════════════════════════
   RBAC — Roles & Permissions
═══════════════════════════════════════════════ */
type Role = "Admin" | "Manager" | "Editor" | "Visor";
const ROLES: Role[] = ["Admin", "Manager", "Editor", "Visor"];

interface Permission {
  viewDetail: boolean;
  manageAgents: boolean;
  viewLogs: boolean;
}

const ROLE_PERMISSIONS: Record<Role, Permission> = {
  Admin:   { viewDetail: true,  manageAgents: true,  viewLogs: true },
  Manager: { viewDetail: true,  manageAgents: true,  viewLogs: true },
  Editor:  { viewDetail: true,  manageAgents: false, viewLogs: false },
  Visor:   { viewDetail: true,  manageAgents: false, viewLogs: false },
};

const ROLE_COLORS: Record<Role, string> = {
  Admin: "bg-red-500/20 text-red-300 border-red-500/30",
  Manager: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  Editor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  Visor: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
};

/* ═══════════════════════════════════════════════
   Audit Trail
═══════════════════════════════════════════════ */
interface AuditEntry {
  id: string;
  action: string;
  detail: string;
  user: string;
  role: Role;
  timestamp: string;
}

export default function AgentsPanel() {
  const { ts } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendConnected, setBackendConnected] = useState(false);
  const [backendError, setBackendError] = useState(false);

  // RBAC
  const [currentRole, setCurrentRole] = useState<Role>("Admin");
  const perms = ROLE_PERMISSIONS[currentRole];

  // Audit Trail
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [showAudit, setShowAudit] = useState(false);

  const addAudit = useCallback((action: string, detail: string) => {
    setAuditLog(prev => [{
      id: crypto.randomUUID(),
      action,
      detail,
      user: user?.name || user?.email || "Sistema",
      role: currentRole,
      timestamp: new Date().toLocaleString("es-ES"),
    }, ...prev].slice(0, 100));
  }, [currentRole, user]);

  useEffect(() => {
    const loadAgents = async () => {
      try {
        setLoading(true);
        setBackendError(false);
        const res = await api.getAgents(0, 50);
        if (res.items && res.items.length > 0) {
          const mapped: Agent[] = res.items.map((ba) => {
            const iconName = (ba.icon_name as string) || "Bot";
            const IconComp = ICON_MAP[iconName] || Bot;
            return {
              id: (ba.agent_id as string) || `agent-${ba.id}`,
              name: (ba.name as string) || "Agent",
              codename: (ba.codename as string) || "",
              description: (ba.description as string) || "",
              longDescription: (ba.long_description as string) || "",
              color: (ba.color as string) || "#8b5cf6",
              gradient: (ba.gradient as string) || "from-violet-500 to-purple-500",
              icon: IconComp,
              status: ((ba.status as string) || "active") as Agent["status"],
              uptime: (ba.uptime as string) || "99.9%",
              tasksCompleted: (ba.tasks_completed as number) ?? 0,
              tasksToday: (ba.tasks_today as number) ?? 0,
              successRate: (ba.success_rate as number) ?? 95,
              functionalityLevel: ((ba.functionality_level as string) || "full") as Agent["functionalityLevel"],
              functionalityNote: (ba.functionality_note as string) || "",
              capabilities: parseJsonSafe(ba.capabilities, []),
              metrics: parseJsonSafe(ba.metrics, []),
              recentTasks: parseJsonSafe(ba.recent_tasks, []),
              logs: parseJsonSafe(ba.logs, []),
            };
          });
          setAgents(mapped);
          setBackendConnected(true);
          addAudit("LOAD_AGENTS", `${mapped.length} agentes cargados desde backend`);
        } else {
          setAgents([]);
          setBackendConnected(true);
        }
      } catch {
        setAgents([]);
        setBackendError(true);
      } finally {
        setLoading(false);
      }
    };

    loadAgents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.codename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "full" && agent.functionalityLevel === "full") ||
      (statusFilter === "partial" && agent.functionalityLevel === "partial") ||
      (statusFilter === "ui_only" && (agent.functionalityLevel === "ui_only" || agent.functionalityLevel === "planned"));
    return matchesSearch && matchesStatus;
  });

  const fullCount = agents.filter(a => a.functionalityLevel === "full").length;
  const partialCount = agents.filter(a => a.functionalityLevel === "partial").length;
  const uiOnlyCount = agents.filter(a => a.functionalityLevel === "ui_only" || a.functionalityLevel === "planned").length;

  const globalMetrics = {
    totalAgents: agents.length,
    activeAgents: agents.filter(a => a.status === "active").length,
    totalTasksCompleted: agents.reduce((sum, a) => sum + a.tasksCompleted, 0),
    averageSuccessRate: agents.length > 0
      ? Math.round(agents.reduce((sum, a) => sum + a.successRate, 0) / agents.length)
      : 0,
    systemUptime: "99.9%",
  };

  const handleAgentClick = (agent: Agent) => {
    if (!perms.viewDetail) return;
    addAudit("VIEW_AGENT", `Agente consultado: ${agent.name} (${agent.id})`);
    navigate(`/agents/${agent.id}`);
  };

  return (
    <AgentsLayout>
      <div className="space-y-6">
        {/* RBAC Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#111113] border border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <UserCog className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-zinc-400">Rol:</span>
              <select
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value as Role)}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:border-cyan-500/50 focus:outline-none"
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <Badge className={cn("text-[10px]", ROLE_COLORS[currentRole])}>{currentRole}</Badge>
            <div className="flex gap-1.5 ml-2">
              {Object.entries(perms).map(([key, val]) => (
                <span key={key} className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded border",
                  val ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-zinc-800 text-zinc-600 border-zinc-700 line-through"
                )}>
                  {key === "viewDetail" ? "Ver Detalle" : key === "manageAgents" ? "Gestionar" : "Ver Logs"}
                </span>
              ))}
            </div>
          </div>
          {perms.viewLogs && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAudit(!showAudit)}
              className={cn("h-7 text-[10px] border-white/10", showAudit ? "bg-cyan-600/20 text-cyan-300" : "text-zinc-400")}
            >
              <ScrollText className="w-3 h-3 mr-1" />
              Audit Log ({auditLog.length})
            </Button>
          )}
        </div>

        {/* Audit Trail Panel */}
        {showAudit && perms.viewLogs && (
          <div className="rounded-xl bg-[#0d0d0f] border border-cyan-500/20 overflow-hidden">
            <div className="px-4 py-3 border-b border-cyan-500/10 flex items-center justify-between">
              <h4 className="text-xs font-semibold text-cyan-300 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" /> Audit Trail — Agents Panel
              </h4>
              <span className="text-[9px] text-zinc-500">{auditLog.length} registros</span>
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-white/[0.03]">
              {auditLog.length === 0 ? (
                <p className="text-xs text-zinc-600 p-4 text-center">Sin registros de auditoría</p>
              ) : auditLog.map(entry => (
                <div key={entry.id} className="px-4 py-2 flex items-center gap-3 text-[11px]">
                  <span className="text-zinc-600 w-32 shrink-0">{entry.timestamp}</span>
                  <Badge className={cn("text-[9px]", ROLE_COLORS[entry.role])}>{entry.role}</Badge>
                  <span className="text-zinc-400">{entry.user}</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-500/10 text-blue-400">{entry.action}</span>
                  <span className="text-zinc-500 truncate">{entry.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Backend status */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${backendConnected ? "bg-emerald-400 animate-pulse" : backendError ? "bg-red-400" : "bg-amber-400 animate-pulse"}`} />
          <span className="text-[10px] text-zinc-500">
            {backendConnected
              ? `${agents.length} agentes cargados desde PostgreSQL`
              : backendError
                ? "Error de conexión al backend — sin datos estáticos de respaldo"
                : "Conectando con el backend..."}
          </span>
          <Database className="w-3 h-3 text-zinc-600" />
          {backendError && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
              <AlertTriangle className="w-2.5 h-2.5 inline mr-0.5" />SIN FALLBACK
            </span>
          )}
        </div>

        <GlobalMetricsBar metrics={globalMetrics} />

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar agente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#111113] border border-white/[0.06] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/30"
            />
          </div>
          <div className="flex gap-2">
            {[
              { id: "all", label: "Todos", count: agents.length },
              { id: "full", label: "Funcional", count: fullCount, icon: CheckCircle2, color: "text-emerald-400" },
              { id: "partial", label: "Parcial", count: partialCount, icon: AlertCircle, color: "text-amber-400" },
              { id: "ui_only", label: "UI Only", count: uiOnlyCount, icon: Clock, color: "text-zinc-400" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  statusFilter === f.id
                    ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                    : "bg-white/[0.03] text-zinc-500 border border-white/[0.06] hover:text-white"
                }`}
              >
                {f.icon && <f.icon className={`w-3 h-3 ${f.color || ""}`} />}
                {f.label}
                <span className="text-[10px] opacity-60">({f.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Agent Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            <span className="ml-2 text-sm text-zinc-400">Cargando agentes del backend...</span>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {filteredAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onClick={() => handleAgentClick(agent)}
              />
            ))}
          </motion.div>
        )}

        {!loading && filteredAgents.length === 0 && (
          <div className="text-center py-12">
            <Bot className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">
              {backendError
                ? "No se pudo conectar al backend. Los agentes se cargan exclusivamente desde PostgreSQL."
                : agents.length === 0
                  ? "No hay agentes registrados en el backend. Crea agentes desde el panel de administración."
                  : "No se encontraron agentes con los filtros seleccionados."}
            </p>
          </div>
        )}
      </div>
    </AgentsLayout>
  );
}

function parseJsonSafe<T>(val: unknown, fallback: T): T {
  if (Array.isArray(val)) return val as T;
  if (typeof val === "string") {
    try { return JSON.parse(val) as T; } catch { return fallback; }
  }
  if (val && typeof val === "object") return val as T;
  return fallback;
}