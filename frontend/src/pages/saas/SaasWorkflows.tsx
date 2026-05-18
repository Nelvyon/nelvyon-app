import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useI18n } from "@/lib/i18n";
import SaasLayout from "@/components/SaasLayout";
import DataStateWrapper from "@/components/DataStateWrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Workflow, Play, Search, Clock, Loader2, Sparkles,
  CheckCircle2, Zap, Plus, RefreshCw, GitBranch, Timer,
  Target, TrendingUp, Trash2, Power, PowerOff,
  History, AlertCircle, X,
} from "lucide-react";
import { api, getApiErrorMessage, type Workflow, type WorkflowRule, type WorkflowExecution } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
const ENTITY_TRIGGERS = [
  { value: "contact_created", label: "Contacto creado" },
  { value: "deal_created", label: "Deal creado" },
  { value: "deal_stage_changed", label: "Deal cambió etapa" },
  { value: "manual", label: "Manual" },
];

const TRIGGER_TYPES = [
  { value: "deal_created", label: "Deal Creado", icon: Target },
  { value: "deal_stage_changed", label: "Deal Cambió Etapa", icon: TrendingUp },
  { value: "contact_created", label: "Contacto Creado", icon: Zap },
  { value: "manual", label: "Manual", icon: Play },
];

const ACTION_TYPES = [
  { value: "move_deal", label: "Mover Deal" },
  { value: "create_activity", label: "Crear Actividad" },
  { value: "create_notification", label: "Crear Notificación" },
  { value: "send_email", label: "Enviar Email" },
  { value: "create_contact", label: "Crear Contacto" },
];

function summarizeNodesJson(nodesJson?: string | null): string {
  if (!nodesJson?.trim()) return "Sin pasos almacenados en JSON.";
  try {
    const j = JSON.parse(nodesJson) as { trigger_config?: unknown; actions?: unknown };
    const parts: string[] = [];
    if (j.trigger_config !== undefined) {
      parts.push(`Disparador (config): ${typeof j.trigger_config === "string" ? j.trigger_config : JSON.stringify(j.trigger_config)}`);
    }
    if (j.actions !== undefined) {
      parts.push(`Acciones: ${typeof j.actions === "string" ? j.actions : JSON.stringify(j.actions)}`);
    }
    const s = parts.join(" · ") || nodesJson.slice(0, 200);
    return s.length > 320 ? `${s.slice(0, 320)}…` : s;
  } catch {
    return nodesJson.length > 280 ? `${nodesJson.slice(0, 280)}…` : nodesJson;
  }
}

export default function SaasWorkflows() {
  const { user, loading } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const { ts } = useI18n();

  const [entityWorkflows, setEntityWorkflows] = useState<Workflow[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(true);
  const [entityError, setEntityError] = useState<string | null>(null);
  const [searchEntities, setSearchEntities] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<Workflow | null>(null);
  const [togglingEntityId, setTogglingEntityId] = useState<number | null>(null);
  const [showCreateEntity, setShowCreateEntity] = useState(false);
  const [creatingEntity, setCreatingEntity] = useState(false);
  const [entityFormName, setEntityFormName] = useState("");
  const [entityFormTrigger, setEntityFormTrigger] = useState("contact_created");
  const [entityFormDescription, setEntityFormDescription] = useState("");
  const [showEngineSection, setShowEngineSection] = useState(false);

  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [officialCampaignsCount, setOfficialCampaignsCount] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [creating, setCreating] = useState(false);
  const [executing, setExecuting] = useState<number | null>(null);
  // Create form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTrigger, setFormTrigger] = useState("deal_created");
  const [formTriggerConfig, setFormTriggerConfig] = useState("");
  const [formAction, setFormAction] = useState("create_activity");
  const [formActionConfig, setFormActionConfig] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate("/saas");
  }, [user, loading, navigate]);

  useEffect(() => {
    setSelectedEntity(null);
    setShowCreateEntity(false);
  }, [activeWorkspace?.id]);

  const loadEntityWorkflows = useCallback(async () => {
    if (!activeWorkspace?.id) {
      setEntityWorkflows([]);
      setLoadingEntities(false);
      setEntityError(null);
      return;
    }
    setLoadingEntities(true);
    setEntityError(null);
    try {
      const res = await api.getWorkflows(0, 200);
      setEntityWorkflows(res.items || []);
    } catch (err) {
      setEntityError(getApiErrorMessage(err, "No se pudieron cargar los workflows."));
      toast.error(getApiErrorMessage(err, "Error cargando workflows del workspace."));
    } finally {
      setLoadingEntities(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    void loadEntityWorkflows();
  }, [loadEntityWorkflows]);

  useEffect(() => {
    setSelectedEntity((prev) => {
      if (!prev) return prev;
      const fresh = entityWorkflows.find((x) => x.id === prev.id);
      return fresh ?? null;
    });
  }, [entityWorkflows]);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    setError(null);
    try {
      const [rulesRes, execRes, campaignsRes] = await Promise.all([
        api.getWorkflowRules(0, 100),
        api.getWorkflowExecutions(0, 20),
        api.getEmailCampaigns(0, 1),
      ]);
      setRules(rulesRes.items || []);
      setExecutions(execRes.items || []);
      setOfficialCampaignsCount(campaignsRes.total || 0);
    } catch (err) {
      setError(getApiErrorMessage(err, ts("errorOccurred")));
    } finally {
      setLoadingData(false);
    }
  }, [ts]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!formName.trim()) { toast.error("Nombre requerido"); return; }
    setCreating(true);
    try {
      await api.createWorkflowRule({
        name: formName,
        description: formDescription,
        trigger_type: formTrigger,
        trigger_config: formTriggerConfig || undefined,
        action_type: formAction,
        action_config: formActionConfig || undefined,
        is_active: true,
      });
      toast.success("Regla creada exitosamente");
      setShowCreate(false);
      setFormName(""); setFormDescription(""); setFormTriggerConfig(""); setFormActionConfig("");
      loadData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, ts("errorOccurred")));
    } finally {
      setCreating(false);
    }
  };

  const handleCreateEntity = async () => {
    if (!entityFormName.trim()) {
      toast.error("Nombre obligatorio");
      return;
    }
    setCreatingEntity(true);
    try {
      const w = await api.createWorkflow({
        name: entityFormName.trim(),
        description: entityFormDescription.trim() || undefined,
        trigger_type: entityFormTrigger,
        trigger_config: "{}",
        actions: "[]",
        status: "draft",
      });
      toast.success("Workflow creado");
      setShowCreateEntity(false);
      setEntityFormName("");
      setEntityFormDescription("");
      setEntityFormTrigger("contact_created");
      setSelectedEntity(w);
      await loadEntityWorkflows();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "No se pudo crear el workflow."));
    } finally {
      setCreatingEntity(false);
    }
  };

  const handleToggleEntityStatus = async (w: Workflow) => {
    const next = (w.status || "").toLowerCase() === "active" ? "inactive" : "active";
    setTogglingEntityId(w.id);
    try {
      const updated = await api.updateWorkflow(w.id, { status: next });
      toast.success(next === "active" ? "Workflow activado" : "Workflow desactivado");
      setSelectedEntity((prev) => (prev?.id === w.id ? updated : prev));
      await loadEntityWorkflows();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "No se pudo actualizar el estado."));
    } finally {
      setTogglingEntityId(null);
    }
  };

  const handleToggle = async (rule: WorkflowRule) => {
    try {
      await api.updateWorkflowRule(rule.id, { is_active: !rule.is_active });
      toast.success(rule.is_active ? "Regla desactivada" : "Regla activada");
      loadData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, ts("errorOccurred")));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteWorkflowRule(id);
      toast.success("Regla eliminada");
      loadData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, ts("errorOccurred")));
    }
  };

  const handleExecute = async (rule: WorkflowRule) => {
    setExecuting(rule.id);
    try {
      const result = await api.triggerWorkflow(rule.trigger_type, { manual: true });
      if (result.triggered > 0) {
        const exec = result.executions.find(e => e.rule_id === rule.id);
        if (exec?.status === "success") {
          toast.success(`✅ ${exec.rule_name}: ${exec.action_type} ejecutado`);
        } else if (exec) {
          toast.error(`❌ ${exec.error || "Error en ejecución"}`);
        } else {
          toast.success(`${result.triggered} regla(s) ejecutada(s)`);
        }
      } else {
        toast.info("No se encontraron reglas que coincidan");
      }
      loadData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, ts("errorOccurred")));
    } finally {
      setExecuting(null);
    }
  };

  const filteredRules = rules.filter(r =>
    !search || r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: rules.length,
    active: rules.filter(r => r.is_active).length,
    totalRuns: rules.reduce((sum, r) => sum + (r.runs_count || 0), 0),
  };
  const campaignRelatedRules = rules.filter(
    (r) =>
      r.action_type === "send_email" ||
      r.trigger_type === "contact_created" ||
      r.trigger_type === "deal_stage_changed"
  ).length;

  const filteredEntities = useMemo(() => {
    const q = searchEntities.trim().toLowerCase();
    return entityWorkflows.filter(
      (w) =>
        !q ||
        w.name.toLowerCase().includes(q) ||
        (w.description || "").toLowerCase().includes(q) ||
        (w.trigger_type || "").toLowerCase().includes(q),
    );
  }, [entityWorkflows, searchEntities]);

  const sortedEntities = useMemo(
    () =>
      [...filteredEntities].sort((a, b) => {
        const ta = new Date(a.last_run_at || a.created_at || 0).getTime();
        const tb = new Date(b.last_run_at || b.created_at || 0).getTime();
        return tb - ta;
      }),
    [filteredEntities],
  );

  const statusLabel = (s?: string) => {
    const x = (s || "draft").toLowerCase();
    if (x === "active") return "Activo";
    if (x === "inactive" || x === "paused") return "Inactivo";
    return "Borrador";
  };

  return (
    <SaasLayout
      title={ts("workflows")}
      subtitle={
        activeWorkspace
          ? `Definiciones y motor · ${activeWorkspace.name}`
          : "Selecciona un workspace para ver tus workflows"
      }
    >
      <div className="space-y-5" data-testid="workflows-root">
        {/* —— Workflows entidad (CRM) —— */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0d] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Workflows del workspace</h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Definiciones persistidas (<span className="text-zinc-400">GET/PUT /api/v1/entities/workflows</span>). Activa o desactiva según necesites.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" className="border-white/10 text-zinc-300 text-xs" onClick={() => void loadEntityWorkflows()}>
                <RefreshCw className="w-3 h-3 mr-1" /> Actualizar
              </Button>
              <Button type="button" size="sm" className="bg-sky-600 hover:bg-sky-500 text-white text-xs" onClick={() => setShowCreateEntity(true)}>
                <Plus className="w-3 h-3 mr-1" /> Nuevo workflow
              </Button>
            </div>
          </div>

          {showCreateEntity && (
            <div className="mb-4 rounded-lg border border-sky-500/20 bg-sky-500/[0.04] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-sky-200">Alta rápida (borrador)</span>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-zinc-400" onClick={() => setShowCreateEntity(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input
                  placeholder="Nombre *"
                  value={entityFormName}
                  onChange={(e) => setEntityFormName(e.target.value)}
                  className="bg-white/5 border-white/10 text-white text-sm"
                />
                <select
                  value={entityFormTrigger}
                  onChange={(e) => setEntityFormTrigger(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-md px-2 py-2 text-xs text-white"
                >
                  {ENTITY_TRIGGERS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Descripción (opcional)"
                  value={entityFormDescription}
                  onChange={(e) => setEntityFormDescription(e.target.value)}
                  className="bg-white/5 border-white/10 text-white text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" className="text-zinc-400 text-xs" onClick={() => setShowCreateEntity(false)}>
                  Cancelar
                </Button>
                <Button type="button" size="sm" className="bg-sky-600 text-white text-xs" disabled={creatingEntity} onClick={() => void handleCreateEntity()}>
                  {creatingEntity ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                  Crear
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Buscar por nombre, descripción o disparador…"
                value={searchEntities}
                onChange={(e) => setSearchEntities(e.target.value)}
                data-testid="workflows-entity-search"
                className="pl-9 bg-white/5 border-white/10 text-white text-sm"
              />
            </div>
          </div>

          {entityError && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{entityError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-2" data-testid="workflows-entity-list">
              {loadingEntities ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-16 animate-pulse rounded-lg bg-white/[0.04]" />
                  ))}
                </div>
              ) : sortedEntities.length === 0 ? (
                <p className="text-sm text-zinc-500 py-8 text-center border border-dashed border-white/10 rounded-lg">
                  No hay workflows en este workspace. Crea uno para empezar.
                </p>
              ) : (
                <>
                  <div
                    className="hidden md:grid md:grid-cols-[minmax(0,1fr)_120px_88px_100px] md:gap-2 md:items-center px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500 border-b border-white/[0.06]"
                    data-testid="workflows-list-header"
                  >
                    <span>Nombre</span>
                    <span>Disparador</span>
                    <span className="text-center">Estado</span>
                    <span className="text-right">Actividad</span>
                  </div>
                  {sortedEntities.map((w) => {
                    const trig = ENTITY_TRIGGERS.find((t) => t.value === w.trigger_type)?.label || w.trigger_type;
                    const act = new Date(w.last_run_at || w.created_at || 0).toLocaleDateString("es", {
                      day: "2-digit",
                      month: "short",
                    });
                    return (
                      <div
                        key={w.id}
                        role="button"
                        tabIndex={0}
                        data-testid={`workflows-entity-row-${w.id}`}
                        onClick={() => setSelectedEntity(w)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedEntity(w);
                          }
                        }}
                        className={cn(
                          "rounded-lg border px-3 py-3 cursor-pointer transition-colors outline-none focus-visible:ring-1 focus-visible:ring-sky-500/40",
                          selectedEntity?.id === w.id ? "border-sky-500/40 bg-sky-500/[0.06]" : "border-white/[0.06] hover:bg-white/[0.03]",
                        )}
                      >
                        <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_120px_88px_100px] md:gap-2 md:items-center">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{w.name}</p>
                            {w.description ? <p className="text-[11px] text-zinc-500 truncate">{w.description}</p> : null}
                          </div>
                          <span className="text-xs text-zinc-400 truncate" data-testid={`workflows-row-trigger-${w.id}`}>
                            {trig}
                          </span>
                          <span className="text-center text-[11px] text-zinc-300">{statusLabel(w.status)}</span>
                          <span className="text-right text-[11px] text-zinc-500 tabular-nums">{act}</span>
                        </div>
                        <div className="md:hidden">
                          <p className="text-sm font-medium text-white">{w.name}</p>
                          <p className="text-[11px] text-zinc-500 mt-1">
                            {trig} · {statusLabel(w.status)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            <div
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 min-h-[200px]"
              data-testid={selectedEntity ? "workflows-entity-detail" : undefined}
            >
              {!selectedEntity ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-zinc-500 text-sm">
                  <Workflow className="w-10 h-10 mb-2 opacity-40" />
                  <p>Selecciona un workflow para ver el resumen.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-white leading-snug" data-testid="workflows-detail-title">
                      {selectedEntity.name}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2" data-testid="workflows-detail-meta">
                    <span className="text-[10px] px-2 py-1 rounded border border-white/10 text-zinc-300" data-testid="workflows-detail-status">
                      {statusLabel(selectedEntity.status)}
                    </span>
                    <span className="text-[10px] px-2 py-1 rounded border border-sky-500/20 text-sky-300" data-testid="workflows-detail-trigger">
                      {ENTITY_TRIGGERS.find((t) => t.value === selectedEntity.trigger_type)?.label || selectedEntity.trigger_type}
                    </span>
                  </div>
                  {selectedEntity.description ? <p className="text-xs text-zinc-400">{selectedEntity.description}</p> : null}
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Pasos / configuración</p>
                    <p className="text-xs text-zinc-300 leading-relaxed font-mono bg-black/20 rounded p-2 border border-white/[0.05]">
                      {summarizeNodesJson(selectedEntity.nodes_json)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-500">
                    <span>Ejecuciones: {selectedEntity.runs_count ?? 0}</span>
                    <span className="text-right">
                      Última: {selectedEntity.last_run_at ? new Date(selectedEntity.last_run_at).toLocaleString("es") : "—"}
                    </span>
                  </div>
                  <Button
                    type="button"
                    className="w-full bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs border border-white/10"
                    data-testid="workflows-detail-toggle-cta"
                    disabled={togglingEntityId === selectedEntity.id}
                    onClick={() => void handleToggleEntityStatus(selectedEntity)}
                  >
                    {togglingEntityId === selectedEntity.id ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1 inline" />
                    ) : null}
                    {(selectedEntity.status || "").toLowerCase() === "active" ? "Desactivar workflow" : "Activar workflow"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-violet-500/[0.06] border border-violet-500/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-violet-200">Conexión operativa con Campaigns</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-violet-300 hover:text-violet-200 hover:bg-violet-500/10"
              onClick={() => navigate("/saas/campaigns")}
            >
              Ir a Campaigns
            </Button>
          </div>
          <p className="text-[11px] text-zinc-300 mb-2">
            Esta pantalla automatiza el flujo oficial de campañas: trigger CRM (contact/deal stage) + acción (send_email/actividad/notificación).
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[10px] text-zinc-500">Campaigns oficiales</p>
              <p className="text-sm font-semibold text-white">{officialCampaignsCount}</p>
            </div>
            <div className="p-2 rounded bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[10px] text-zinc-500">Reglas ligadas a campañas</p>
              <p className="text-sm font-semibold text-violet-300">{campaignRelatedRules}</p>
            </div>
            <div className="p-2 rounded bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[10px] text-zinc-500">Ejecuciones registradas</p>
              <p className="text-sm font-semibold text-amber-300">{stats.totalRuns}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
          <p className="text-[11px] text-zinc-400">
            Motor de reglas en tiempo real (workflow-engine): ejecución y reglas avanzadas.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-white/10 text-xs text-zinc-300"
            data-testid="workflows-engine-toggle"
            onClick={() => setShowEngineSection((v) => !v)}
          >
            {showEngineSection ? "Ocultar motor" : "Mostrar motor"}
          </Button>
        </div>

        {showEngineSection && (
          <>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Reglas", value: stats.total, icon: Workflow, color: "text-blue-400" },
            { label: "Activas", value: stats.active, icon: CheckCircle2, color: "text-emerald-400" },
            { label: "Ejecuciones", value: stats.totalRuns, icon: Zap, color: "text-amber-400" },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <s.icon className={cn("w-4 h-4", s.color)} />
                <span className="text-[10px] text-white/40 uppercase">{s.label}</span>
              </div>
              <p className="text-xl font-bold text-white mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input placeholder={ts("search") + "..."} value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-white/5 border-white/10 text-white text-sm" />
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-sky-600 hover:bg-sky-500 text-white text-sm">
            <Plus className="w-4 h-4 mr-1" /> Nueva Regla
          </Button>
          <Button onClick={() => setShowHistory(!showHistory)} variant="outline"
            className="border-white/10 text-white/60 hover:bg-white/5 text-sm">
            <History className="w-4 h-4 mr-1" /> Historial
          </Button>
          <Button variant="ghost" size="sm" onClick={loadData} className="text-white/40">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Create Rule Modal */}
        {showCreate && (
          <div className="bg-white/5 border border-sky-500/20 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" /> Nueva Regla de Automatización
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)} className="text-white/40">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-white/40 uppercase mb-1 block">Nombre *</label>
                <Input value={formName} onChange={e => setFormName(e.target.value)}
                  placeholder="Ej: Notificar al crear deal" className="bg-white/5 border-white/10 text-white text-sm" />
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase mb-1 block">Descripción</label>
                <Input value={formDescription} onChange={e => setFormDescription(e.target.value)}
                  placeholder="Descripción opcional" className="bg-white/5 border-white/10 text-white text-sm" />
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase mb-1 block">Trigger (Disparador)</label>
                <select value={formTrigger} onChange={e => setFormTrigger(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white">
                  {TRIGGER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase mb-1 block">Acción</label>
                <select value={formAction} onChange={e => setFormAction(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white">
                  {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase mb-1 block">Config Trigger (JSON)</label>
                <Input value={formTriggerConfig} onChange={e => setFormTriggerConfig(e.target.value)}
                  placeholder='{"stage_from": "lead"}' className="bg-white/5 border-white/10 text-white text-xs font-mono" />
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase mb-1 block">Config Acción (JSON)</label>
                <Input value={formActionConfig} onChange={e => setFormActionConfig(e.target.value)}
                  placeholder='{"stage": "qualified"}' className="bg-white/5 border-white/10 text-white text-xs font-mono" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-white/40 text-sm">Cancelar</Button>
              <Button onClick={handleCreate} disabled={creating} className="bg-sky-600 hover:bg-sky-500 text-white text-sm">
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                Crear Regla
              </Button>
            </div>
          </div>
        )}

        {/* Enhanced Execution History with Flow Visualization */}
        {showHistory && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" /> Historial de Ejecuciones
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  ✓ {executions.filter(e => e.status === "success").length} éxitos
                </span>
                <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                  ✗ {executions.filter(e => e.status === "failed").length} fallos
                </span>
              </div>
            </div>
            {executions.length === 0 ? (
              <p className="text-xs text-white/30 text-center py-4">Sin ejecuciones aún</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {executions.map(ex => {
                  const triggerInfo = TRIGGER_TYPES.find(t => t.value === ex.trigger_type);
                  const actionInfo = ACTION_TYPES.find(a => a.value === ex.action_type);
                  const TIcon = triggerInfo?.icon || Zap;
                  return (
                    <div key={ex.id} className={cn(
                      "p-3 rounded-xl border transition-all",
                      ex.status === "success" ? "bg-emerald-500/[0.03] border-emerald-500/10" :
                      ex.status === "failed" ? "bg-red-500/[0.03] border-red-500/10" :
                      "bg-amber-500/[0.03] border-amber-500/10"
                    )}>
                      <div className="flex items-center gap-3">
                        {/* Status Icon */}
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          ex.status === "success" ? "bg-emerald-500/15" :
                          ex.status === "failed" ? "bg-red-500/15" : "bg-amber-500/15"
                        )}>
                          {ex.status === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> :
                           ex.status === "failed" ? <AlertCircle className="w-4 h-4 text-red-400" /> :
                           <Clock className="w-4 h-4 text-amber-400" />}
                        </div>

                        {/* Flow Visualization: Trigger → Action */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white font-medium truncate">{ex.rule_name || `Rule #${ex.rule_id}`}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 text-[9px]">
                              <TIcon className="w-2.5 h-2.5" /> {triggerInfo?.label || ex.trigger_type}
                            </span>
                            <span className="text-white/20 text-[10px]">→</span>
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 text-[9px]">
                              {actionInfo?.label || ex.action_type}
                            </span>
                          </div>
                        </div>

                        {/* Timing & Status */}
                        <div className="text-right shrink-0">
                          <Badge className={cn("text-[9px] mb-0.5",
                            ex.status === "success" ? "bg-emerald-500/10 text-emerald-400" :
                            ex.status === "failed" ? "bg-red-500/10 text-red-400" :
                            "bg-amber-500/10 text-amber-400"
                          )}>{ex.status === "success" ? "Éxito" : ex.status === "failed" ? "Fallido" : "Pendiente"}</Badge>
                          {ex.executed_at && (
                            <p className="text-[9px] text-white/25 mt-0.5">
                              {new Date(ex.executed_at).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}
                        </div>
                      </div>
                      {/* Error details for failed executions */}
                      {ex.status === "failed" && (
                        <div className="mt-2 px-2 py-1.5 rounded bg-red-500/5 border border-red-500/10">
                          <p className="text-[10px] text-red-400/80 font-mono">Error: Timeout o configuración inválida — reintentar manualmente</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Rules List */}
        <DataStateWrapper loading={loadingData} error={error} empty={filteredRules.length === 0}
          emptyMessage="No hay reglas de automatización" onRetry={loadData}
          emptyIcon={<Workflow className="w-8 h-8 text-zinc-500" />}>
          <div className="space-y-3">
            {filteredRules.map(rule => {
              const triggerInfo = TRIGGER_TYPES.find(t => t.value === rule.trigger_type);
              const actionInfo = ACTION_TYPES.find(a => a.value === rule.action_type);
              const TriggerIcon = triggerInfo?.icon || Zap;

              return (
                <div key={rule.id} className={cn(
                  "bg-white/5 border rounded-xl p-4 transition-all",
                  rule.is_active ? "border-white/10" : "border-white/5 opacity-60"
                )}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                        rule.is_active ? "bg-gradient-to-br from-sky-500/20 to-blue-500/20" : "bg-white/5"
                      )}>
                        <TriggerIcon className={cn("w-5 h-5", rule.is_active ? "text-sky-400" : "text-white/30")} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-white truncate">{rule.name}</h4>
                        {rule.description && (
                          <p className="text-[10px] text-white/40 mt-0.5 truncate">{rule.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <Badge className="bg-sky-500/10 text-sky-400 text-[9px]">
                            <GitBranch className="w-2.5 h-2.5 mr-0.5" /> {triggerInfo?.label || rule.trigger_type}
                          </Badge>
                          <Badge className="bg-violet-500/10 text-violet-400 text-[9px]">
                            → {actionInfo?.label || rule.action_type}
                          </Badge>
                          {rule.runs_count > 0 && (
                            <Badge className="bg-emerald-500/10 text-emerald-400 text-[9px]">
                              <Timer className="w-2.5 h-2.5 mr-0.5" /> {rule.runs_count}x
                            </Badge>
                          )}
                          {rule.last_run_at && (
                            <Badge className="bg-white/5 text-white/30 text-[9px]">
                              Último: {new Date(rule.last_run_at).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => handleExecute(rule)}
                        disabled={executing === rule.id || !rule.is_active}
                        className="text-sky-400 hover:bg-sky-500/10 h-8 w-8 p-0"
                        title="Ejecutar manualmente">
                        {executing === rule.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleToggle(rule)}
                        className={cn("h-8 w-8 p-0", rule.is_active ? "text-emerald-400 hover:bg-emerald-500/10" : "text-white/30 hover:bg-white/5")}
                        title={rule.is_active ? "Desactivar" : "Activar"}>
                        {rule.is_active ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(rule.id)}
                        className="text-red-400/60 hover:bg-red-500/10 h-8 w-8 p-0" title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DataStateWrapper>
          </>
        )}

      </div>
    </SaasLayout>
  );
}