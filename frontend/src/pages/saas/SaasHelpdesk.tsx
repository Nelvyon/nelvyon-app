import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import SaasLayout from "@/components/SaasLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Headphones, Plus, RefreshCw, Search, Clock, CheckCircle2,
  AlertTriangle, XCircle, MessageSquare, Database, Loader2,
  Trash2, Edit, X, Send, User, Bot, Filter, UserCheck,
  ArrowUpDown, Eye, Save, ChevronRight, Star, BarChart3,
  Link2, Share2, TrendingUp, AlertCircle,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { api, getApiErrorMessage, type HelpdeskTicket } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { parseE2EParams, buildE2EUrl } from "@/lib/e2e-flow";
import E2EContextBanner from "@/components/E2EContextBanner";
import HelpdeskAnalyticsTab from "@/components/analytics/HelpdeskAnalyticsTab";

const priorityConfig: Record<string, { color: string; label: string; weight: number }> = {
  urgent: { color: "bg-red-500/10 text-red-400 border-red-500/20", label: "Urgente", weight: 4 },
  critical: { color: "bg-red-500/10 text-red-400 border-red-500/20", label: "Crítico", weight: 4 },
  high: { color: "bg-orange-500/10 text-orange-400 border-orange-500/20", label: "Alto", weight: 3 },
  medium: { color: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "Medio", weight: 2 },
  low: { color: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "Bajo", weight: 1 },
};

const statusConfig: Record<string, { color: string; icon: typeof Clock; label: string }> = {
  open: { color: "bg-blue-500/10 text-blue-400", icon: Clock, label: "Abierto" },
  pending: { color: "bg-blue-500/10 text-blue-400", icon: Clock, label: "Abierto" },
  in_progress: { color: "bg-amber-500/10 text-amber-400", icon: Loader2, label: "En Progreso" },
  waiting: { color: "bg-violet-500/10 text-violet-400", icon: Clock, label: "En espera" },
  resolved: { color: "bg-emerald-500/10 text-emerald-400", icon: CheckCircle2, label: "Resuelto" },
  closed: { color: "bg-slate-500/10 text-slate-400", icon: XCircle, label: "Cerrado" },
};

const categoryOptions = ["Técnico", "Facturación", "Ventas", "General", "Bug", "Feature Request"];
const channelOptions = ["web", "email", "whatsapp", "phone", "chat"];

/* ─── SLA Configuration (hours) ─── */
const SLA_LIMITS: Record<string, { response: number; resolution: number }> = {
  urgent: { response: 1, resolution: 4 },
  critical: { response: 1, resolution: 4 },
  high: { response: 4, resolution: 12 },
  medium: { response: 8, resolution: 24 },
  low: { response: 24, resolution: 72 },
};

function getSLAStatus(ticket: { priority?: string; status?: string; created_at?: string; resolved_at?: string }) {
  const raw = (ticket.priority || "medium").toLowerCase();
  const priority = raw === "critical" ? "urgent" : raw;
  const limits = SLA_LIMITS[priority] || SLA_LIMITS.medium;
  const created = ticket.created_at ? new Date(ticket.created_at).getTime() : Date.now();
  const now = ticket.resolved_at ? new Date(ticket.resolved_at).getTime() : Date.now();
  const elapsedH = (now - created) / 3600000;
  const resLimit = limits.resolution;
  const pct = Math.min((elapsedH / resLimit) * 100, 100);
  const remaining = Math.max(resLimit - elapsedH, 0);
  const breached = elapsedH > resLimit && ticket.status !== "resolved" && ticket.status !== "closed";
  const warning = !breached && pct >= 75 && ticket.status !== "resolved" && ticket.status !== "closed";
  const resolved = ticket.status === "resolved" || ticket.status === "closed";

  let label: string;
  if (resolved) {
    label = elapsedH < resLimit ? `Resuelto en ${elapsedH.toFixed(1)}h` : `Resuelto (fuera SLA)`;
  } else if (breached) {
    label = `SLA excedido +${(elapsedH - resLimit).toFixed(1)}h`;
  } else if (remaining < 1) {
    label = `${(remaining * 60).toFixed(0)}min restantes`;
  } else {
    label = `${remaining.toFixed(1)}h restantes`;
  }

  return { pct, remaining, breached, warning, resolved, label, resLimit };
}

const emptyTicket: Partial<HelpdeskTicket> = {
  subject: "", description: "", priority: "medium", category: "General",
  status: "open", channel: "web", client_name: "", client_email: "",
  assigned_to: "", resolution_notes: "",
};

export default function SaasHelpdesk() {
  const { user, loading: authLoading } = useAuth();
  const { activeWorkspace, needsWorkspaceSelection } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const e2eParams = parseE2EParams(location.search);

  const [tickets, setTickets] = useState<HelpdeskTicket[]>([]);
  const [loading, setLoading] = useState(true);
  /** Fallo al cargar tickets (red, workspace, permisos); distinto de lista vacía o filtros. */
  const [loadError, setLoadError] = useState<string | null>(null);
  const [backendConnected, setBackendConnected] = useState(false);
  const [slaBreaches, setSlaBreaches] = useState<Set<number>>(() => new Set());
  const [slaWarnings, setSlaWarnings] = useState<Set<number>>(() => new Set());
  const [slaCounts, setSlaCounts] = useState<{ breaches: number; warnings: number; checkedAt: string | null }>({
    breaches: 0,
    warnings: 0,
    checkedAt: null,
  });
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "priority">("date");
  const [showForm, setShowForm] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Partial<HelpdeskTicket>>(emptyTicket);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<HelpdeskTicket | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [hdActiveTab, setHdActiveTab] = useState<"tickets" | "analytics">("tickets");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [e2eAutoFilled, setE2eAutoFilled] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/saas");
  }, [user, authLoading, navigate]);

  /** Al cambiar de workspace: no dejar detalle de otro tenant. */
  useEffect(() => {
    setSelectedTicket(null);
    setShowDetail(false);
    setResolutionNotes("");
  }, [activeWorkspace?.id]);

  // E2E: Auto-open create form with pre-filled context when coming from Social
  useEffect(() => {
    if (e2eAutoFilled) return;
    const source = e2eParams.source;
    if (source === "social_incident" && e2eParams.social_post_id) {
      const prefilled: Partial<HelpdeskTicket> = {
        ...emptyTicket,
        subject: `Incidencia Social Post #${e2eParams.social_post_id}${e2eParams.campaign_name ? ` — ${e2eParams.campaign_name}` : ""}`,
        description: `Ticket creado automáticamente desde Social Media.\n\nPost ID: ${e2eParams.social_post_id}${e2eParams.campaign_name ? `\nCampaña: ${e2eParams.campaign_name}` : ""}${e2eParams.contract_id ? `\nContrato: #${e2eParams.contract_id}` : ""}${e2eParams.project_id ? `\nProyecto: #${e2eParams.project_id}` : ""}${e2eParams.client_id ? `\nCliente: #${e2eParams.client_id}` : ""}\n\nContexto E2E vinculado automáticamente.`,
        priority: "medium",
        category: "Técnico",
        status: "open",
      };
      setEditingTicket(prefilled);
      setIsEditing(false);
      setShowForm(true);
      setE2eAutoFilled(true);
      toast.info("Ticket pre-rellenado con contexto E2E desde Social");
    } else if (source === "contract" && e2eParams.contract_id) {
      const prefilled: Partial<HelpdeskTicket> = {
        ...emptyTicket,
        subject: `Incidencia Contrato #${e2eParams.contract_id}${e2eParams.campaign_name ? ` — ${e2eParams.campaign_name}` : ""}`,
        description: `Ticket creado desde Contratos.\n\nContrato: #${e2eParams.contract_id}${e2eParams.project_id ? `\nProyecto: #${e2eParams.project_id}` : ""}${e2eParams.client_id ? `\nCliente: #${e2eParams.client_id}` : ""}\n\nContexto E2E vinculado automáticamente.`,
        priority: "medium",
        category: "Facturación",
        status: "open",
      };
      setEditingTicket(prefilled);
      setIsEditing(false);
      setShowForm(true);
      setE2eAutoFilled(true);
      toast.info("Ticket pre-rellenado con contexto E2E desde Contratos");
    }
  }, [e2eParams, e2eAutoFilled]);

  const fetchTickets = useCallback(async () => {
    const wsId = activeWorkspace?.id;
    if (!wsId) {
      setTickets([]);
      setSlaBreaches(new Set());
      setSlaWarnings(new Set());
      setSlaCounts({ breaches: 0, warnings: 0, checkedAt: null });
      setLoadError(null);
      setLoading(false);
      setBackendConnected(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.getHelpdeskTickets(0, 200);
      setTickets(res.items || []);
      setBackendConnected(true);
      try {
        const sla = await api.getHelpdeskSlaBreaches();
        setSlaBreaches(new Set(sla.breaches.map((b) => b.ticket_id)));
        setSlaWarnings(new Set(sla.warnings.map((w) => w.ticket_id)));
        setSlaCounts({
          breaches: sla.breach_count,
          warnings: sla.warning_count,
          checkedAt: sla.checked_at ?? null,
        });
      } catch (slaErr) {
        setSlaBreaches(new Set());
        setSlaWarnings(new Set());
        setSlaCounts({ breaches: 0, warnings: 0, checkedAt: null });
        toast.warning(
          getApiErrorMessage(slaErr, "No se pudo cargar el resumen SLA. La lista de tickets sigue disponible."),
        );
      }
    } catch (err) {
      const msg = getApiErrorMessage(
        err,
        "No se pudieron cargar los tickets. Revisa conexión, workspace (X-Workspace-Id) o permisos.",
      );
      setLoadError(msg);
      toast.error(msg);
      setTickets([]);
      setBackendConnected(false);
      setSlaBreaches(new Set());
      setSlaWarnings(new Set());
      setSlaCounts({ breaches: 0, warnings: 0, checkedAt: null });
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    if (user) void fetchTickets();
  }, [user, fetchTickets]);

  /** Mantener detalle alineado con la lista tras assign/transition/refetch. */
  useEffect(() => {
    if (!selectedTicket) return;
    const fresh = tickets.find((x) => x.id === selectedTicket.id);
    if (fresh) setSelectedTicket(fresh);
    else {
      setSelectedTicket(null);
      setShowDetail(false);
    }
  }, [tickets, selectedTicket?.id]);

  const handleSave = async () => {
    if (!editingTicket.subject?.trim()) {
      toast.error("El asunto es obligatorio");
      return;
    }
    setSaving(true);
    try {
      if (isEditing && editingTicket.id) {
        await api.updateHelpdeskTicket(editingTicket.id, editingTicket);
        toast.success("Ticket actualizado");
      } else {
        // Attach E2E relationship fields when creating
        const ticketWithE2E = {
          ...editingTicket,
          ...(e2eParams.client_id && { client_id: e2eParams.client_id }),
          ...(e2eParams.project_id && { project_id: e2eParams.project_id }),
          ...(e2eParams.contract_id && { contract_id: e2eParams.contract_id }),
          ...(e2eParams.social_post_id && { social_post_id: e2eParams.social_post_id }),
        };
        await api.createHelpdeskTicket(ticketWithE2E);
        toast.success("Ticket creado" + (e2eParams.source ? " (con contexto E2E)" : ""));
      }
      setShowForm(false);
      fetchTickets();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Error guardando ticket"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteHelpdeskTicket(id);
      toast.success("Ticket eliminado");
      if (selectedTicket?.id === id) { setSelectedTicket(null); setShowDetail(false); }
      fetchTickets();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Error eliminando ticket"));
    }
  };

  const handleStatusChange = async (ticket: HelpdeskTicket, newStatus: string): Promise<boolean> => {
    try {
      await api.helpdeskTransition(ticket.id, newStatus, "");
      toast.success(`Estado: ${statusConfig[newStatus]?.label || newStatus}`);
      await fetchTickets();
      return true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "No se pudo cambiar el estado"));
      return false;
    }
  };

  const handlePriorityChange = async (ticket: HelpdeskTicket, newPriority: string) => {
    try {
      await api.updateHelpdeskTicket(ticket.id, { priority: newPriority });
      toast.success(`Prioridad cambiada a ${priorityConfig[newPriority]?.label || newPriority}`);
      fetchTickets();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Error actualizando prioridad"));
    }
  };

  const handleAssign = async (ticket: HelpdeskTicket, assignee: string) => {
    try {
      await api.helpdeskAssign(ticket.id, assignee || "");
      toast.success(assignee ? `Asignado a ${assignee}` : "Asignación actualizada");
      await fetchTickets();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Error asignando ticket"));
    }
  };

  const handleSaveResolutionNotes = async () => {
    if (!selectedTicket) return;
    setSavingNotes(true);
    try {
      await api.updateHelpdeskTicket(selectedTicket.id, { resolution_notes: resolutionNotes });
      toast.success("Notas de resolución guardadas");
      fetchTickets();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Error guardando notas"));
    } finally {
      setSavingNotes(false);
    }
  };

  const openNew = () => {
    setEditingTicket({ ...emptyTicket });
    setIsEditing(false);
    setShowForm(true);
  };

  const openEdit = (t: HelpdeskTicket) => {
    setEditingTicket({ ...t });
    setIsEditing(true);
    setShowForm(true);
  };

  const openDetail = (t: HelpdeskTicket) => {
    setSelectedTicket(t);
    setResolutionNotes(t.resolution_notes || "");
    setShowDetail(true);
  };

  const workspaceLabel = useMemo(() => {
    if (!activeWorkspace) return null;
    return `${activeWorkspace.name} · #${activeWorkspace.id}`;
  }, [activeWorkspace]);

  const formatDate = (d?: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const lastActivityTs = (t: HelpdeskTicket) =>
    Math.max(
      t.resolved_at ? new Date(t.resolved_at).getTime() : 0,
      t.created_at ? new Date(t.created_at).getTime() : 0,
    );

  const filtered = tickets
    .filter((t) => {
      const matchSearch = !search || t.subject.toLowerCase().includes(search.toLowerCase()) ||
        (t.client_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (t.assigned_to || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || t.status === filterStatus;
      const matchPriority = filterPriority === "all" || t.priority === filterPriority;
      const matchCategory = filterCategory === "all" || t.category === filterCategory;
      return matchSearch && matchStatus && matchPriority && matchCategory;
    })
    .sort((a, b) => {
      if (sortBy === "priority") {
        const wa = priorityConfig[a.priority || "medium"]?.weight || 0;
        const wb = priorityConfig[b.priority || "medium"]?.weight || 0;
        if (wb !== wa) return wb - wa;
      }
      return lastActivityTs(b) - lastActivityTs(a);
    });

  // Stats
  const openCount = tickets.filter((t) =>
    ["open", "pending", "in_progress", "waiting"].includes(t.status || ""),
  ).length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length;
  const criticalCount = tickets.filter(
    (t) =>
      (t.priority === "critical" || t.priority === "urgent") &&
      t.status !== "resolved" &&
      t.status !== "closed",
  ).length;
  const avgSatisfaction = tickets.filter((t) => t.satisfaction_score).reduce((s, t) => s + (t.satisfaction_score || 0), 0) /
    (tickets.filter((t) => t.satisfaction_score).length || 1);
  const avgResponseTime = tickets.filter((t) => t.first_response_minutes).reduce((s, t) => s + (t.first_response_minutes || 0), 0) /
    (tickets.filter((t) => t.first_response_minutes).length || 1);
  const assignedAgents = [...new Set(tickets.map(t => t.assigned_to).filter(Boolean))];

  return (
    <SaasLayout>
      {/* E2E Context Banner */}
      <E2EContextBanner
        currentModule="helpdesk"
        context={{
          client_id: e2eParams.client_id,
          project_id: e2eParams.project_id,
          contract_id: e2eParams.contract_id,
          social_post_id: e2eParams.social_post_id,
          campaign_name: e2eParams.campaign_name,
          source: e2eParams.source,
        }}
      />
      <div className="space-y-6" data-testid="helpdesk-root">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Headphones className="w-6 h-6 text-cyan-400" /> Helpdesk
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Tickets del workspace: lista, estado y asignación
              {workspaceLabel ? (
                <span className="text-cyan-400/90"> · {workspaceLabel}</span>
              ) : null}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
              backendConnected
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
            )}>
              <Database className="w-3 h-3" />
              {backendConnected ? "PostgreSQL conectado" : "Backend vacío"}
            </div>
            <Button size="sm" variant="outline" onClick={fetchTickets} className="border-white/10 text-slate-300 hover:bg-white/5">
              <RefreshCw className={cn("w-4 h-4 mr-1", loading && "animate-spin")} />
            </Button>
            <Button size="sm" onClick={openNew} className="bg-cyan-600 hover:bg-cyan-700 text-white">
              <Plus className="w-4 h-4 mr-1" /> Nuevo Ticket
            </Button>
          </div>
        </div>

        {user && needsWorkspaceSelection && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Selecciona un workspace arriba para cargar tickets; sin él la API no devuelve datos aislados por cuenta.
          </div>
        )}

        {activeWorkspace?.id && !loadError ? (
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
            <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1">
              SLA (API):{" "}
              <span className="text-red-400 font-medium">{slaCounts.breaches}</span> incumplimiento
              {" · "}
              <span className="text-amber-400 font-medium">{slaCounts.warnings}</span> avisos
              {slaCounts.checkedAt ? (
                <span className="text-slate-500"> · {new Date(slaCounts.checkedAt).toLocaleString("es")}</span>
              ) : null}
            </span>
          </div>
        ) : null}

        {/* Tab Navigation */}
        <div className="flex gap-2 p-1 bg-[#0A0E13] border border-white/[0.06] rounded-xl w-fit">
          <button
            onClick={() => setHdActiveTab("tickets")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors",
              hdActiveTab === "tickets" ? "bg-cyan-500/10 text-cyan-400" : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Headphones className="w-3.5 h-3.5" /> Tickets
          </button>
          <button
            onClick={() => setHdActiveTab("analytics")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors",
              hdActiveTab === "analytics" ? "bg-cyan-500/10 text-cyan-400" : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Analytics
          </button>
        </div>

        {/* Analytics Tab */}
        {hdActiveTab === "analytics" && <HelpdeskAnalyticsTab />}

        {/* Tickets Tab */}
        {hdActiveTab === "tickets" && <>
        {/* KPI Cards — ocultos si falló la carga de tickets */}
        {!loadError && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[
            { label: "Abiertos", value: openCount, icon: Clock, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "En Progreso", value: inProgressCount, icon: Loader2, color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "Resueltos", value: resolvedCount, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Críticos", value: criticalCount, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10" },
            { label: "Satisfacción", value: avgSatisfaction > 0 ? `${avgSatisfaction.toFixed(1)}/5` : "—", icon: Star, color: "text-violet-400", bg: "bg-violet-500/10" },
            { label: "Resp. Media", value: avgResponseTime > 0 ? `${Math.round(avgResponseTime)}m` : "—", icon: BarChart3, color: "text-cyan-400", bg: "bg-cyan-500/10" },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-[#12141A] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">{kpi.label}</span>
                <div className={cn("p-1.5 rounded-lg", kpi.bg)}>
                  <kpi.icon className={cn("w-3.5 h-3.5", kpi.color)} />
                </div>
              </div>
              <p className="text-xl font-bold text-white">{kpi.value}</p>
            </div>
          ))}
        </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por asunto, cliente o asignado…"
              data-testid="helpdesk-search"
              className="pl-9 bg-[#12141A] border-white/10 text-white" />
          </div>

          {/* Status filter */}
          <div className="flex gap-1">
            {["all", "open", "in_progress", "waiting", "resolved", "closed"].map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={cn("px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all",
                  filterStatus === s ? "bg-violet-600/20 text-violet-300" : "text-slate-400 hover:text-white hover:bg-white/5")}>
                {s === "all" ? "Todos" : statusConfig[s]?.label || s}
              </button>
            ))}
          </div>

          {/* Priority filter */}
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-[#12141A] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white">
            <option value="all">Prioridad: Todas</option>
            <option value="urgent">Urgente</option>
            <option value="critical">Crítico</option>
            <option value="high">Alto</option>
            <option value="medium">Medio</option>
            <option value="low">Bajo</option>
          </select>

          {/* Category filter */}
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-[#12141A] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white">
            <option value="all">Categoría: Todas</option>
            {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Sort */}
          <button onClick={() => setSortBy(sortBy === "date" ? "priority" : "date")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortBy === "date" ? "Por fecha" : "Por prioridad"}
          </button>
        </div>

        {/* Tickets List */}
        <div className="bg-[#12141A] border border-white/[0.06] rounded-xl overflow-hidden" data-testid="helpdesk-ticket-list">
          {loading ? (
            <div className="divide-y divide-white/[0.04]">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse px-5 py-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-3.5 bg-white/[0.06] rounded w-1/3" />
                        <div className="h-4 w-14 bg-white/[0.04] rounded-full" />
                      </div>
                      <div className="h-2.5 bg-white/[0.04] rounded w-2/3" />
                    </div>
                    <div className="h-5 w-20 bg-white/[0.04] rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-6" role="alert">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-red-200 text-sm">No se pudo cargar la lista de tickets</p>
                <p className="text-red-200/80 text-xs mt-1 break-words">{loadError}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-red-500/30 text-red-100 shrink-0"
                onClick={() => void fetchTickets()}
              >
                <RefreshCw className="w-3 h-3 mr-1.5" /> Reintentar
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-white/[0.08] rounded-lg m-3">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-4">
                <Headphones className="w-7 h-7 text-cyan-400" />
              </div>
              <p className="text-sm text-slate-300 font-medium">
                {tickets.length === 0
                  ? "No hay tickets en este workspace"
                  : "Ningún ticket coincide con búsqueda o filtros"}
              </p>
              <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
                {tickets.length === 0
                  ? "Crea el primero para empezar a gestionar incidencias y SLA."
                  : "Prueba a limpiar filtros o ajustar la búsqueda."}
              </p>
              {tickets.length === 0 ? (
                <Button className="mt-5 bg-cyan-600 hover:bg-cyan-700 text-white" onClick={openNew}>
                  <Plus className="w-4 h-4 mr-1.5" /> Nuevo ticket
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="mt-5 border-white/10 text-slate-300"
                  onClick={() => {
                    setSearch("");
                    setFilterStatus("all");
                    setFilterPriority("all");
                    setFilterCategory("all");
                  }}
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              <div
                className="hidden md:grid md:grid-cols-[minmax(0,1fr)_72px_104px_120px_100px_168px] md:gap-2 md:items-center px-5 py-2 border-b border-white/[0.06] text-[10px] font-medium uppercase tracking-wider text-slate-500"
                data-testid="helpdesk-list-header"
              >
                <span>Asunto</span>
                <span className="text-center">Prioridad</span>
                <span className="text-center">Estado</span>
                <span>Asignado</span>
                <span>Actividad</span>
                <span className="text-right pr-1">Acciones</span>
              </div>
              {filtered.map((t) => {
                const sc = statusConfig[t.status || "open"] || statusConfig.open;
                const pc = priorityConfig[t.priority || "medium"] || priorityConfig.medium;
                return (
                  <div
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    data-testid={`helpdesk-ticket-row-${t.id}`}
                    className="px-5 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/40"
                    onClick={() => openDetail(t)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openDetail(t);
                      }
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="text-sm font-medium text-white truncate max-w-[300px]">{t.subject}</h4>
                          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border", pc.color)}>
                            {pc.label}
                          </span>
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium", sc.color)}>
                            <sc.icon className="w-2.5 h-2.5" /> {sc.label}
                          </span>
                          {t.assigned_to && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              <UserCheck className="w-2.5 h-2.5" /> {t.assigned_to}
                            </span>
                          )}
                          {/* SLA Indicator */}
                          {(() => {
                            const sla = getSLAStatus(t);
                            const apiBreach = slaBreaches.has(t.id);
                            const apiWarn = slaWarnings.has(t.id) && !apiBreach;
                            return (
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                                apiBreach || sla.breached ? "bg-red-500/15 text-red-400 border-red-500/30 animate-pulse" :
                                apiWarn || sla.warning ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
                                sla.resolved ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                              )}>
                                {apiBreach || sla.breached ? <AlertTriangle className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                                {apiBreach ? "SLA API · crítico" : apiWarn ? "SLA API · aviso" : sla.label}
                              </span>
                            );
                          })()}
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-1">{t.description || "Sin descripción"}</p>
                        {/* SLA Progress Bar */}
                        {(() => {
                          const sla = getSLAStatus(t);
                          if (sla.resolved) return null;
                          return (
                            <div className="mt-1.5 flex items-center gap-2">
                              <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden max-w-[200px]">
                                <div
                                  className={cn("h-full rounded-full transition-all duration-500",
                                    sla.breached ? "bg-red-500" : sla.warning ? "bg-amber-500" : "bg-cyan-500"
                                  )}
                                  style={{ width: `${Math.min(sla.pct, 100)}%` }}
                                />
                              </div>
                              <span className="text-[9px] text-slate-500">SLA {sla.resLimit}h</span>
                            </div>
                          );
                        })()}
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
                          {t.client_name && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {t.client_name}</span>}
                          {t.category && <span>📁 {t.category}</span>}
                          {t.channel && <span>📡 {t.channel}</span>}
                          <span className="tabular-nums" title="Resuelto o creado">
                            Act.: {formatDate(t.resolved_at || t.created_at)}
                          </span>
                          {t.resolved_at && <span className="text-emerald-500">✓ Cerrado/resuelto</span>}
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-1.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        {/* Inline priority change */}
                        <select value={t.priority || "medium"}
                          onChange={(e) => handlePriorityChange(t, e.target.value)}
                          className="bg-[#0A0C10] border border-white/10 rounded-lg px-1.5 py-1 text-[10px] text-white w-[72px]">
                          <option value="low">Bajo</option>
                          <option value="medium">Medio</option>
                          <option value="high">Alto</option>
                          <option value="urgent">Urgente</option>
                          <option value="critical">Crítico</option>
                        </select>
                        {/* Inline status change */}
                        <select value={t.status || "open"}
                          data-testid={`helpdesk-row-status-${t.id}`}
                          onChange={(e) => void handleStatusChange(t, e.target.value)}
                          className="bg-[#0A0C10] border border-white/10 rounded-lg px-1.5 py-1 text-[10px] text-white w-[104px]">
                          <option value="open">Abierto</option>
                          <option value="in_progress">En Progreso</option>
                          <option value="waiting">En espera</option>
                          <option value="resolved">Resuelto</option>
                          <option value="closed">Cerrado</option>
                        </select>
                        <Button size="sm" variant="ghost" type="button" onClick={() => openDetail(t)} className="text-cyan-400 hover:text-cyan-300 h-8 w-8 p-0" aria-label="Ver ficha">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" type="button" onClick={() => openEdit(t)} className="text-slate-400 hover:text-white h-8 w-8 p-0" aria-label="Editar">
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" type="button" onClick={() => handleDelete(t.id)} className="text-red-400 hover:text-red-300 h-8 w-8 p-0" aria-label="Eliminar">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Agents Summary */}
        {!loadError && assignedAgents.length > 0 && (
          <div className="bg-[#12141A] border border-white/[0.06] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-400" /> Agentes Asignados
            </h3>
            <div className="flex flex-wrap gap-3">
              {assignedAgents.map((agent) => {
                const agentTickets = tickets.filter(t => t.assigned_to === agent);
                const openT = agentTickets.filter(t => t.status === "open" || t.status === "in_progress").length;
                const resolvedT = agentTickets.filter(t => t.status === "resolved" || t.status === "closed").length;
                return (
                  <div key={agent} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-xs">
                      {(agent as string)[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">{agent}</p>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-amber-400">{openT} abiertos</span>
                        <span className="text-emerald-400">{resolvedT} resueltos</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        </>}

        {/* Create/Edit Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="bg-[#12141A] border-white/10 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Editar Ticket" : "Nuevo Ticket"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Asunto *</label>
                <Input value={editingTicket.subject || ""} onChange={(e) => setEditingTicket((p) => ({ ...p, subject: e.target.value }))}
                  className="bg-[#0A0C10] border-white/10 text-white" placeholder="Describe el problema" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Descripción</label>
                <textarea value={editingTicket.description || ""} onChange={(e) => setEditingTicket((p) => ({ ...p, description: e.target.value }))}
                  className="w-full bg-[#0A0C10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white min-h-[80px] resize-none" placeholder="Detalles adicionales..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Prioridad</label>
                  <select value={editingTicket.priority || "medium"} onChange={(e) => setEditingTicket((p) => ({ ...p, priority: e.target.value }))}
                    className="w-full bg-[#0A0C10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="low">Bajo</option>
                    <option value="medium">Medio</option>
                    <option value="high">Alto</option>
                    <option value="urgent">Urgente</option>
                    <option value="critical">Crítico</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Categoría</label>
                  <select value={editingTicket.category || "General"} onChange={(e) => setEditingTicket((p) => ({ ...p, category: e.target.value }))}
                    className="w-full bg-[#0A0C10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Canal</label>
                  <select value={editingTicket.channel || "web"} onChange={(e) => setEditingTicket((p) => ({ ...p, channel: e.target.value }))}
                    className="w-full bg-[#0A0C10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    {channelOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Asignar a</label>
                  <Input value={editingTicket.assigned_to || ""} onChange={(e) => setEditingTicket((p) => ({ ...p, assigned_to: e.target.value }))}
                    className="bg-[#0A0C10] border-white/10 text-white" placeholder="Nombre del agente" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Nombre Cliente</label>
                  <Input value={editingTicket.client_name || ""} onChange={(e) => setEditingTicket((p) => ({ ...p, client_name: e.target.value }))}
                    className="bg-[#0A0C10] border-white/10 text-white" placeholder="Nombre" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Email Cliente</label>
                  <Input value={editingTicket.client_email || ""} onChange={(e) => setEditingTicket((p) => ({ ...p, client_email: e.target.value }))}
                    className="bg-[#0A0C10] border-white/10 text-white" placeholder="email@ejemplo.com" />
                </div>
              </div>
              {isEditing && (
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Notas de Resolución</label>
                  <textarea value={editingTicket.resolution_notes || ""} onChange={(e) => setEditingTicket((p) => ({ ...p, resolution_notes: e.target.value }))}
                    className="w-full bg-[#0A0C10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white min-h-[60px] resize-none" placeholder="Cómo se resolvió el problema..." />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)} className="border-white/10 text-slate-300">Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                {isEditing ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Detail Dialog */}
        <Dialog open={showDetail} onOpenChange={setShowDetail}>
          <DialogContent className="bg-[#12141A] border-white/10 text-white max-w-2xl" data-testid="helpdesk-detail">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Headphones className="w-5 h-5 text-cyan-400" />
                Detalle del Ticket #{selectedTicket?.id}
              </DialogTitle>
            </DialogHeader>
            {selectedTicket && (
              <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                <div className="flex flex-wrap items-center gap-2" data-testid="helpdesk-detail-meta">
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border",
                    priorityConfig[selectedTicket.priority || "medium"]?.color)}>
                    {priorityConfig[selectedTicket.priority || "medium"]?.label}
                  </span>
                  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                    statusConfig[selectedTicket.status || "open"]?.color)}
                    data-testid="helpdesk-detail-status-readonly"
                  >
                    {statusConfig[selectedTicket.status || "open"]?.label}
                  </span>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 min-h-[1.5rem]"
                    data-testid="helpdesk-detail-assignee"
                  >
                    <UserCheck className="w-3 h-3 shrink-0" />
                    {selectedTicket.assigned_to?.trim() ? selectedTicket.assigned_to : "Sin asignar"}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <label className="text-xs text-slate-400 shrink-0 sm:w-28">Cambiar estado</label>
                  <select
                    data-testid="helpdesk-detail-status"
                    value={selectedTicket.status || "open"}
                    onChange={(e) => void handleStatusChange(selectedTicket, e.target.value)}
                    className="bg-[#0A0C10] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white flex-1 min-w-0 max-w-xs"
                  >
                    <option value="open">Abierto</option>
                    <option value="in_progress">En progreso</option>
                    <option value="waiting">En espera</option>
                    <option value="resolved">Resuelto</option>
                    <option value="closed">Cerrado</option>
                  </select>
                </div>

                <h3 className="text-lg font-semibold text-white">{selectedTicket.subject}</h3>
                <p className="text-sm text-slate-300">{selectedTicket.description || "Sin descripción"}</p>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Cliente", value: selectedTicket.client_name || "—" },
                    { label: "Email", value: selectedTicket.client_email || "—" },
                    { label: "Categoría", value: selectedTicket.category || "—" },
                    { label: "Canal", value: selectedTicket.channel || "—" },
                    { label: "Creado", value: formatDate(selectedTicket.created_at) },
                    { label: "Resuelto", value: formatDate(selectedTicket.resolved_at) },
                    { label: "Satisfacción", value: selectedTicket.satisfaction_score ? `${selectedTicket.satisfaction_score}/5 ⭐` : "—" },
                    { label: "Tiempo Respuesta", value: selectedTicket.first_response_minutes ? `${selectedTicket.first_response_minutes} min` : "—" },
                  ].map(item => (
                    <div key={item.label} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">{item.label}</span>
                      <p className="text-sm text-white mt-0.5">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Assign inline */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <label className="text-xs text-slate-400 shrink-0 sm:w-28">Asignar a</label>
                  <Input
                    key={selectedTicket.id}
                    defaultValue={selectedTicket.assigned_to || ""}
                    data-testid="helpdesk-detail-assigned-input"
                    onBlur={(e) => {
                      if (e.target.value !== (selectedTicket.assigned_to || "")) {
                        void handleAssign(selectedTicket, e.target.value);
                      }
                    }}
                    className="bg-[#0A0C10] border-white/10 text-white text-sm flex-1"
                    placeholder="Nombre o email del agente"
                  />
                </div>

                {/* Resolution Notes */}
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Notas de Resolución</label>
                  <Textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    className="bg-[#0A0C10] border-white/10 text-white text-sm"
                    rows={3}
                    placeholder="Describe cómo se resolvió el problema..."
                  />
                  <Button size="sm" onClick={handleSaveResolutionNotes} disabled={savingNotes}
                    className="mt-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs">
                    {savingNotes ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                    Guardar Notas
                  </Button>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
                  {selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        const ok = await handleStatusChange(selectedTicket, "resolved");
                        if (ok) setShowDetail(false);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Marcar Resuelto
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => { setShowDetail(false); openEdit(selectedTicket); }}
                    className="border-white/10 text-slate-300 text-xs">
                    <Edit className="w-3 h-3 mr-1" /> Editar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { handleDelete(selectedTicket.id); setShowDetail(false); }}
                    className="border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs">
                    <Trash2 className="w-3 h-3 mr-1" /> Eliminar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </SaasLayout>
  );
}