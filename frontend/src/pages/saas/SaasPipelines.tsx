import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import SaasLayout from "@/components/SaasLayout";
import {
  Target, DollarSign, Plus, Clock, CheckCircle2, TrendingUp,
  Loader2, RefreshCw, Trash2, Edit, X, Phone, Mail, Calendar,
  FileText, MessageSquare, ChevronRight, Activity, Check, Circle, Users, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  api,
  getApiErrorMessage,
  type Deal,
  type DealActivity,
  type PipelineStatsResponse,
} from "@/lib/api";
import { toast } from "sonner";
import {
  CANONICAL_DEAL_STAGE_IDS,
  bucketDealStageForKanban,
  isNonCanonicalPersistedStage,
} from "@/domain/dealStages";

/* ── Stage definitions (ids = contrato CANONICAL_DEAL_STAGE_IDS / backend core.deal_stages) ── */
const STAGES = [
  { id: "lead", name: "Lead Nuevo", color: "from-blue-500 to-blue-600", dot: "bg-blue-500" },
  { id: "qualified", name: "Calificado", color: "from-cyan-500 to-blue-500", dot: "bg-cyan-500" },
  { id: "proposal", name: "Propuesta", color: "from-violet-500 to-purple-500", dot: "bg-violet-500" },
  { id: "negotiation", name: "Negociación", color: "from-amber-500 to-orange-500", dot: "bg-amber-500" },
  { id: "closed_won", name: "Ganado ✓", color: "from-emerald-500 to-green-500", dot: "bg-emerald-500" },
  { id: "closed_lost", name: "Perdido", color: "from-red-500 to-rose-500", dot: "bg-red-500" },
] as const satisfies readonly { id: (typeof CANONICAL_DEAL_STAGE_IDS)[number]; name: string; color: string; dot: string }[];

const ACTIVITY_TYPES = [
  { id: "call", label: "Llamada", icon: Phone, color: "text-blue-400" },
  { id: "email", label: "Email", icon: Mail, color: "text-emerald-400" },
  { id: "meeting", label: "Reunión", icon: Calendar, color: "text-violet-400" },
  { id: "task", label: "Tarea", icon: CheckCircle2, color: "text-amber-400" },
  { id: "note", label: "Nota", icon: FileText, color: "text-zinc-400" },
] as const;

const tagColors: Record<string, string> = {
  Enterprise: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Pro: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  Starter: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Urgente: "bg-red-500/10 text-red-400 border-red-500/20",
  Hot: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Quick: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const emptyDeal: Partial<Deal> = {
  title: "", value: 0, probability: 50, stage: "lead",
  assigned_to: "", tags: "", notes: "", currency: "EUR",
};

export default function SaasPipelines() {
  const { user, loading: authLoading } = useAuth();
  const {
    activeWorkspace,
    loading: wsLoading,
    needsWorkspaceSelection,
  } = useWorkspace();
  const navigate = useNavigate();

  /* ── State ── */
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stats, setStats] = useState<PipelineStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  /** Fallo de carga inicial o refresh; distinto de pipeline vacío. */
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<"kanban" | "list">("kanban");

  // Deal form
  const [showForm, setShowForm] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Partial<Deal>>(emptyDeal);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Deal detail panel (activities)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [dealActivities, setDealActivities] = useState<DealActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [newActivity, setNewActivity] = useState({ type: "call", title: "", description: "" });
  const [addingActivity, setAddingActivity] = useState(false);

  // Drag state
  const [dragDealId, setDragDealId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/saas");
  }, [user, authLoading, navigate]);

  /* ── Data fetching ── */
  const fetchDeals = useCallback(async () => {
    if (needsWorkspaceSelection) {
      setDeals([]);
      setStats(null);
      setLoadError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [dealsRes, statsRes] = await Promise.all([
        api.getDeals(0, 200, undefined, "-created_at"),
        api.getPipelineStats(),
      ]);
      setDeals(dealsRes.items || []);
      setStats(statsRes);
    } catch (e) {
      const msg = getApiErrorMessage(
        e,
        "No se pudieron cargar los deals ni las métricas del pipeline. Revisa la conexión o el workspace.",
      );
      setLoadError(msg);
      setDeals([]);
      setStats(null);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [needsWorkspaceSelection, activeWorkspace?.id]);

  useEffect(() => {
    if (!user || authLoading || wsLoading) return;
    setDeals([]);
    setStats(null);
    setSelectedDeal(null);
    setDealActivities([]);
    setDragDealId(null);
    if (user && !needsWorkspaceSelection) fetchDeals();
    else setLoading(false);
  }, [user, authLoading, wsLoading, activeWorkspace?.id, needsWorkspaceSelection, fetchDeals]);

  const fetchDealActivities = useCallback(async (dealId: number) => {
    setActivitiesLoading(true);
    try {
      const res = await api.getDealActivities(dealId);
      setDealActivities(res.items || []);
    } catch (e) {
      setDealActivities([]);
      toast.error(getApiErrorMessage(e, "Error cargando actividades"));
    } finally {
      setActivitiesLoading(false);
    }
  }, []);

  /* ── Deal CRUD ── */
  const openNew = () => {
    setEditingDeal({ ...emptyDeal });
    setIsEditing(false);
    setShowForm(true);
  };

  const openEdit = (deal: Deal) => {
    setEditingDeal({
      ...deal,
      stage: bucketDealStageForKanban(deal.stage),
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const openDetail = (deal: Deal) => {
    setSelectedDeal(deal);
    fetchDealActivities(deal.id);
  };

  const handleSave = async () => {
    if (!editingDeal.title) {
      toast.error("El título del deal es obligatorio");
      return;
    }
    setSaving(true);
    try {
      if (isEditing && editingDeal.id) {
        const { id, user_id, created_at, updated_at, ...updateData } = editingDeal;
        await api.updateDeal(id, updateData);
        toast.success("Deal actualizado");
      } else {
        await api.createDeal({
          title: editingDeal.title,
          value: editingDeal.value || 0,
          currency: editingDeal.currency || "EUR",
          probability: editingDeal.probability || 50,
          stage: editingDeal.stage || "lead",
          assigned_to: editingDeal.assigned_to || "",
          tags: editingDeal.tags || "",
          notes: editingDeal.notes || "",
          days_in_stage: 0,
        });
        toast.success("Deal creado");
      }
      setShowForm(false);
      setEditingDeal(emptyDeal);
      await fetchDeals();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Error guardando deal"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este deal?")) return;
    try {
      await api.deleteDeal(id);
      toast.success("Deal eliminado");
      if (selectedDeal?.id === id) setSelectedDeal(null);
      await fetchDeals();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Error eliminando deal"));
    }
  };

  /* ── Stage change with auto-activity ── */
  const handleStageChange = async (dealId: number, newStage: string) => {
    try {
      const res = await api.changeDealStage(dealId, newStage);
      toast.success(res.message);
      await fetchDeals();
      if (selectedDeal?.id === dealId) {
        try {
          const updated = await api.getDeal(dealId);
          setSelectedDeal(updated);
          fetchDealActivities(dealId);
        } catch (e2) {
          toast.error(
            getApiErrorMessage(e2, "Etapa actualizada; no se pudo refrescar el detalle del deal."),
          );
          void fetchDeals();
        }
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Error cambiando etapa"));
    }
  };

  /* ── Drag & Drop ── */
  const handleDragStart = (dealId: number) => setDragDealId(dealId);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (stageId: string) => {
    if (dragDealId === null) return;
    const deal = deals.find((d) => d.id === dragDealId);
    if (deal && bucketDealStageForKanban(deal.stage) !== stageId) {
      handleStageChange(dragDealId, stageId);
    }
    setDragDealId(null);
  };

  /* ── Activities ── */
  const handleAddActivity = async () => {
    if (!selectedDeal || !newActivity.title) {
      toast.error("El título de la actividad es obligatorio");
      return;
    }
    setAddingActivity(true);
    try {
      await api.createDealActivity(selectedDeal.id, {
        type: newActivity.type,
        title: newActivity.title,
        description: newActivity.description || undefined,
      });
      toast.success("Actividad creada");
      setNewActivity({ type: "call", title: "", description: "" });
      fetchDealActivities(selectedDeal.id);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Error creando actividad"));
    } finally {
      setAddingActivity(false);
    }
  };

  const handleToggleActivity = async (activityId: number) => {
    try {
      await api.toggleDealActivity(activityId);
      if (selectedDeal) fetchDealActivities(selectedDeal.id);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Error actualizando actividad"));
    }
  };

  /* ── Computed ── */
  const stageStats = STAGES.map((s) => {
    const stageDeals = deals.filter((d) => bucketDealStageForKanban(d.stage) === s.id);
    return {
      ...s,
      count: stageDeals.length,
      value: stageDeals.reduce((sum, d) => sum + (d.value || 0), 0),
    };
  });

  const totalPipeline = stats?.total_value ?? deals.reduce((s, d) => s + (d.value || 0), 0);
  const weightedPipeline = stats?.weighted_value ?? 0;
  const activeDeals = deals.filter((d) => {
    const b = bucketDealStageForKanban(d.stage);
    return b !== "closed_won" && b !== "closed_lost";
  }).length;
  const winRate = stats?.win_rate ?? 0;

  /* ── Render ── */
  return (
    <SaasLayout title="Pipelines & Deals" subtitle="Gestión visual de oportunidades de venta">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <Link
          to="/saas/crm"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-blue-400 transition-colors"
        >
          <Users className="w-3.5 h-3.5" />
          CRM & Contactos
        </Link>
        <span className="text-[10px] text-zinc-600">
          Etapas: contrato Kanban (6 columnas)
        </span>
      </div>
      {/* KPIs — ocultos si falló la carga para no mostrar cifras engañosas */}
      {!loadError && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Pipeline Total", value: `€${Math.round(totalPipeline).toLocaleString()}`, icon: Target, color: "text-blue-400" },
            { label: "Pipeline Ponderado", value: `€${Math.round(weightedPipeline).toLocaleString()}`, icon: TrendingUp, color: "text-emerald-400" },
            { label: "Deals Activos", value: activeDeals.toString(), icon: DollarSign, color: "text-violet-400" },
            { label: "Win Rate", value: winRate > 0 ? `${winRate}%` : "Sin datos", icon: CheckCircle2, color: "text-amber-400" },
          ].map((k) => (
            <div key={k.label} className="p-4 rounded-xl bg-[#0F1419] border border-white/[0.06]">
              <k.icon className={`w-4 h-4 ${k.color} mb-2`} />
              <p className="text-xl font-bold text-white">{k.value}</p>
              <p className="text-[10px] text-zinc-500">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* View Toggle & Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1 bg-[#0F1419] rounded-xl p-1 border border-white/[0.06]">
          {(["kanban", "list"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                view === v ? "bg-blue-500/20 text-blue-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {v === "kanban" ? "Kanban" : "Lista"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={fetchDeals} variant="outline" className="border-white/10 text-zinc-400 h-8">
            <RefreshCw className="w-3 h-3" />
          </Button>
          <Button size="sm" onClick={openNew} className="bg-blue-600 hover:bg-blue-500 text-white text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" /> Nuevo Deal
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          <span className="ml-3 text-sm text-zinc-400">Cargando deals...</span>
        </div>
      ) : loadError ? (
        <div
          className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-xl border border-red-500/25 bg-red-500/5 text-sm max-w-3xl"
          role="alert"
        >
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-red-200">No se pudo cargar el pipeline</p>
            <p className="text-red-200/80 text-xs mt-1 break-words">{loadError}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-red-500/30 text-red-100 shrink-0"
            onClick={() => void fetchDeals()}
          >
            <RefreshCw className="w-3 h-3 mr-1.5" /> Reintentar
          </Button>
        </div>
      ) : deals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/[0.08] bg-[#0F1419]/80 py-16 px-6 text-center">
          <Target className="w-14 h-14 mx-auto mb-4 text-zinc-600 opacity-80" />
          <p className="text-lg font-medium text-white mb-1">Tu pipeline está vacío</p>
          <p className="text-sm text-zinc-500 max-w-md mx-auto mb-6">
            Crea el primer deal en este workspace para ver el tablero Kanban y la vista lista.
          </p>
          <Button size="sm" onClick={openNew} className="bg-blue-600 hover:bg-blue-500 text-white">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Nuevo deal
          </Button>
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Main content */}
          <div className={`flex-1 min-w-0 ${selectedDeal ? "max-w-[calc(100%-380px)]" : ""}`}>
            {view === "kanban" ? (
              <div className="flex gap-3 overflow-x-auto pb-4">
                {stageStats.map((stage) => {
                  const stageDeals = deals.filter((d) => bucketDealStageForKanban(d.stage) === stage.id);
                  return (
                    <div
                      key={stage.id}
                      className="min-w-[260px] w-[260px] flex-shrink-0"
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(stage.id)}
                    >
                      {/* Stage header */}
                      <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${stage.dot}`} />
                          <span className="text-xs font-semibold text-white">{stage.name}</span>
                          <span className="text-[10px] text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded">
                            {stage.count}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500">€{stage.value.toLocaleString()}</span>
                      </div>

                      {/* Deal cards */}
                      <div className="space-y-2 min-h-[60px]">
                        {stageDeals.map((deal) => {
                          const dealTags = (deal.tags || "").split(",").map((t) => t.trim()).filter(Boolean);
                          const isSelected = selectedDeal?.id === deal.id;
                          return (
                            <div
                              key={deal.id}
                              draggable
                              onDragStart={() => handleDragStart(deal.id)}
                              onClick={() => openDetail(deal)}
                              className={`p-3 rounded-xl bg-[#0F1419] border transition-all cursor-grab active:cursor-grabbing group ${
                                isSelected ? "border-blue-500/40 ring-1 ring-blue-500/20" : "border-white/[0.06] hover:border-white/[0.12]"
                              }`}
                            >
                              <div className="flex items-start justify-between mb-1.5">
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium text-white truncate group-hover:text-blue-300 transition-colors">
                                    {deal.title}
                                  </h4>
                                  {isNonCanonicalPersistedStage(deal.stage) && (
                                    <p className="text-[9px] text-amber-500/90 truncate" title={deal.stage ?? ""}>
                                      Etapa en BD no estándar: {deal.stage}
                                    </p>
                                  )}
                                  {deal.assigned_to && (
                                    <p className="text-[10px] text-zinc-500 truncate">{deal.assigned_to}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openEdit(deal); }}
                                    className="p-1 hover:bg-blue-500/10 rounded"
                                  >
                                    <Edit className="w-3 h-3 text-blue-400" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(deal.id); }}
                                    className="p-1 hover:bg-red-500/10 rounded"
                                  >
                                    <Trash2 className="w-3 h-3 text-red-400" />
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-bold text-emerald-400">
                                  €{(deal.value || 0).toLocaleString()}
                                </span>
                                <span className="text-[10px] text-zinc-600">·</span>
                                <span className="text-[10px] text-zinc-400">{deal.probability || 0}%</span>
                              </div>

                              {dealTags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {dealTags.slice(0, 3).map((tag) => (
                                    <span
                                      key={tag}
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${
                                        tagColors[tag] || "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                                      }`}
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <div className="flex items-center justify-between text-[10px] text-zinc-600">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  {deal.days_in_stage || 0}d en etapa
                                </div>
                                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500" />
                              </div>
                            </div>
                          );
                        })}
                        {stageDeals.length === 0 && (
                          <div className="p-4 rounded-xl border border-dashed border-white/[0.06] text-center">
                            <p className="text-[10px] text-zinc-600">Arrastra deals aquí</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* List view */
              <div className="rounded-xl bg-[#0F1419] border border-white/[0.06] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.04]">
                        {["Deal", "Valor", "Prob.", "Etapa", "Responsable", "Días", "Acciones"].map((h) => (
                          <th key={h} className="text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {deals.map((deal) => {
                        const stageKey = bucketDealStageForKanban(deal.stage);
                        return (
                          <tr
                            key={deal.id}
                            onClick={() => openDetail(deal)}
                            className="border-b border-white/[0.02] hover:bg-blue-500/[0.02] transition-colors cursor-pointer"
                          >
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium text-white">{deal.title}</p>
                              {deal.tags && (
                                <p className="text-[10px] text-zinc-500 truncate max-w-[200px]">{deal.tags}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-emerald-400">
                              €{(deal.value || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-10 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${deal.probability || 0}%` }} />
                                </div>
                                <span className="text-[10px] text-zinc-400">{deal.probability || 0}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={stageKey}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleStageChange(deal.id, e.target.value)}
                                className="bg-transparent text-xs text-zinc-300 border border-white/[0.06] rounded px-2 py-1"
                              >
                                {STAGES.map((s) => (
                                  <option key={s.id} value={s.id} className="bg-[#0a0a0f]">{s.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3 text-xs text-zinc-400">{deal.assigned_to || "—"}</td>
                            <td className="px-4 py-3 text-xs text-zinc-500">{deal.days_in_stage || 0}d</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); openEdit(deal); }}
                                  className="p-1 hover:bg-blue-500/10 rounded transition-colors"
                                >
                                  <Edit className="w-3.5 h-3.5 text-blue-400" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDelete(deal.id); }}
                                  className="p-1 hover:bg-red-500/10 rounded transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Deal Detail / Activities Panel */}
          {selectedDeal && (
            <div className="w-[360px] flex-shrink-0 rounded-xl bg-[#0F1419] border border-white/[0.06] overflow-hidden">
              {/* Panel header */}
              <div className="p-4 border-b border-white/[0.04]">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">{selectedDeal.title}</h3>
                    <p className="text-[10px] text-zinc-500">{selectedDeal.assigned_to || "Sin responsable"}</p>
                  </div>
                  <button onClick={() => setSelectedDeal(null)} className="p-1 hover:bg-white/5 rounded">
                    <X className="w-4 h-4 text-zinc-400" />
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-lg font-bold text-emerald-400">€{(selectedDeal.value || 0).toLocaleString()}</span>
                  <span className="text-[10px] text-zinc-500 bg-white/[0.04] px-2 py-0.5 rounded">
                    {selectedDeal.probability || 0}% prob.
                  </span>
                </div>
                {/* Stage quick-change */}
                <div className="flex flex-wrap gap-1 mt-3">
                  {STAGES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        const cur = bucketDealStageForKanban(selectedDeal.stage);
                        if (s.id !== cur) handleStageChange(selectedDeal.id, s.id);
                      }}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                        s.id === bucketDealStageForKanban(selectedDeal.stage)
                          ? `bg-gradient-to-r ${s.color} text-white`
                          : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08]"
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Activities section */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" /> Actividades
                  </h4>
                  <span className="text-[10px] text-zinc-500">{dealActivities.length} total</span>
                </div>

                {/* Add activity form */}
                <div className="mb-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex gap-1 mb-2">
                    {ACTIVITY_TYPES.map((at) => (
                      <button
                        key={at.id}
                        onClick={() => setNewActivity((p) => ({ ...p, type: at.id }))}
                        className={`p-1.5 rounded transition-all ${
                          newActivity.type === at.id
                            ? "bg-blue-500/20 text-blue-400"
                            : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]"
                        }`}
                        title={at.label}
                      >
                        <at.icon className="w-3.5 h-3.5" />
                      </button>
                    ))}
                  </div>
                  <Input
                    value={newActivity.title}
                    onChange={(e) => setNewActivity((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Título de la actividad..."
                    className="mb-2 h-8 text-xs bg-white/5 border-white/10 text-white"
                    onKeyDown={(e) => { if (e.key === "Enter" && newActivity.title) handleAddActivity(); }}
                  />
                  <div className="flex gap-2">
                    <Textarea
                      value={newActivity.description}
                      onChange={(e) => setNewActivity((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Descripción (opcional)..."
                      className="flex-1 text-xs bg-white/5 border-white/10 text-white min-h-[32px] h-8 resize-none"
                      rows={1}
                    />
                    <Button
                      size="sm"
                      onClick={handleAddActivity}
                      disabled={!newActivity.title || addingActivity}
                      className="bg-blue-600 hover:bg-blue-500 text-white h-8 px-3 text-xs shrink-0"
                    >
                      {addingActivity ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>

                {/* Activities list */}
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                  {activitiesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    </div>
                  ) : dealActivities.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
                      <p className="text-[11px] text-zinc-600">Sin actividades aún</p>
                    </div>
                  ) : (
                    dealActivities.map((act) => {
                      const actType = ACTIVITY_TYPES.find((at) => at.id === act.type);
                      const isStageChange = act.type === "stage_change";
                      const ActIcon = actType?.icon || Activity;
                      return (
                        <div
                          key={act.id}
                          className={`flex items-start gap-2.5 p-2.5 rounded-lg transition-all ${
                            act.is_completed ? "opacity-60" : ""
                          } hover:bg-white/[0.02]`}
                        >
                          {isStageChange ? (
                            <div className="w-6 h-6 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
                              <TrendingUp className="w-3 h-3 text-violet-400" />
                            </div>
                          ) : (
                            <button
                              onClick={() => handleToggleActivity(act.id)}
                              className="w-6 h-6 rounded-full border border-white/10 flex items-center justify-center shrink-0 mt-0.5 hover:border-blue-500/40 transition-colors"
                            >
                              {act.is_completed ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Circle className="w-3 h-3 text-zinc-600" />
                              )}
                            </button>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium ${act.is_completed ? "text-zinc-500 line-through" : "text-white"}`}>
                              {act.title}
                            </p>
                            {act.description && (
                              <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">{act.description}</p>
                            )}
                            <p className="text-[9px] text-zinc-600 mt-1">
                              {act.created_at ? new Date(act.created_at).toLocaleDateString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Deal Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-[#0a0a0f] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Deal" : "Nuevo Deal"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-[10px] text-zinc-400 uppercase">Título del Deal *</label>
              <Input
                value={editingDeal.title || ""}
                onChange={(e) => setEditingDeal((p) => ({ ...p, title: e.target.value }))}
                placeholder="Ej: Proyecto Web para Empresa X"
                className="mt-1 bg-white/5 border-white/10 text-white text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-zinc-400 uppercase">Responsable</label>
                <Input
                  value={editingDeal.assigned_to || ""}
                  onChange={(e) => setEditingDeal((p) => ({ ...p, assigned_to: e.target.value }))}
                  placeholder="Nombre del vendedor"
                  className="mt-1 bg-white/5 border-white/10 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase">Moneda</label>
                <select
                  value={editingDeal.currency || "EUR"}
                  onChange={(e) => setEditingDeal((p) => ({ ...p, currency: e.target.value }))}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="EUR" className="bg-[#0a0a0f]">EUR (€)</option>
                  <option value="USD" className="bg-[#0a0a0f]">USD ($)</option>
                  <option value="GBP" className="bg-[#0a0a0f]">GBP (£)</option>
                  <option value="MXN" className="bg-[#0a0a0f]">MXN ($)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-zinc-400 uppercase">Valor (€)</label>
                <Input
                  type="number"
                  value={editingDeal.value || 0}
                  onChange={(e) => setEditingDeal((p) => ({ ...p, value: Number(e.target.value) }))}
                  className="mt-1 bg-white/5 border-white/10 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase">Probabilidad (%)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={editingDeal.probability || 0}
                  onChange={(e) => setEditingDeal((p) => ({ ...p, probability: Number(e.target.value) }))}
                  className="mt-1 bg-white/5 border-white/10 text-white text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-zinc-400 uppercase">Etapa</label>
                <select
                  value={editingDeal.stage || "lead"}
                  onChange={(e) => setEditingDeal((p) => ({ ...p, stage: e.target.value }))}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                >
                  {STAGES.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#0a0a0f]">{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase">Tags (separados por coma)</label>
                <Input
                  value={editingDeal.tags || ""}
                  onChange={(e) => setEditingDeal((p) => ({ ...p, tags: e.target.value }))}
                  placeholder="Enterprise, Hot, Urgente"
                  className="mt-1 bg-white/5 border-white/10 text-white text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 uppercase">Notas</label>
              <Textarea
                value={editingDeal.notes || ""}
                onChange={(e) => setEditingDeal((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Notas adicionales..."
                className="mt-1 bg-white/5 border-white/10 text-white text-sm min-h-[60px]"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setShowForm(false)} className="text-zinc-400">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {isEditing ? "Guardar Cambios" : "Crear Deal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SaasLayout>
  );
}