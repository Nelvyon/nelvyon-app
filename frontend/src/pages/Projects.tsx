import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import E2EFlowBanner from "@/components/E2EFlowBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FolderKanban, Plus, Search, X, Clock, CheckCircle2, Loader2,
  AlertCircle, Play, Shield, Lock, Unlock, XCircle, Trash2, ArrowRight
} from "lucide-react";
import { api, type NelvyonProject, type NelvyonClient } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { buildE2EUrl, parseE2EParams } from "@/lib/e2e-flow";

/* ─── RBAC ─── */
type UserRole = "admin" | "manager" | "editor" | "viewer";

const ROLE_PERMISSIONS: Record<UserRole, { label: string; canCreate: boolean; canEdit: boolean; canDelete: boolean; canChangeStatus: boolean; canViewLogs: boolean }> = {
  admin:   { label: "Administrador", canCreate: true, canEdit: true, canDelete: true, canChangeStatus: true, canViewLogs: true },
  manager: { label: "Manager",       canCreate: true, canEdit: true, canDelete: false, canChangeStatus: true, canViewLogs: true },
  editor:  { label: "Editor",        canCreate: true, canEdit: true, canDelete: false, canChangeStatus: false, canViewLogs: false },
  viewer:  { label: "Visor",         canCreate: false, canEdit: false, canDelete: false, canChangeStatus: false, canViewLogs: false },
};

interface AuditEntry { action: string; timestamp: string; user: string; role: string; details?: string }

const statusConfig: Record<string, { icon: typeof Clock; label: string; color: string; bg: string }> = {
  draft: { icon: Clock, label: "Borrador", color: "text-zinc-400", bg: "bg-zinc-500/10 border-zinc-500/20" },
  pending: { icon: Clock, label: "Pendiente", color: "text-zinc-400", bg: "bg-zinc-500/10 border-zinc-500/20" },
  generating: { icon: Loader2, label: "Generando", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  qa_review: { icon: AlertCircle, label: "En QA", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  approved: { icon: CheckCircle2, label: "Aprobado", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  delivered: { icon: CheckCircle2, label: "Entregado", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
};

const typeConfig: Record<string, { label: string; color: string }> = {
  web: { label: "Web Premium", color: "from-violet-500 to-blue-500" },
  ecommerce: { label: "E-commerce", color: "from-blue-500 to-cyan-500" },
  social: { label: "Social Media", color: "from-pink-500 to-rose-500" },
  ads: { label: "Campañas Ads", color: "from-amber-500 to-orange-500" },
  audit: { label: "Auditoría", color: "from-emerald-500 to-green-500" },
  proposal: { label: "Propuesta", color: "from-indigo-500 to-violet-500" },
};

export default function Projects() {
  const { ts } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const e2eParams = parseE2EParams(searchParams.toString());
  const [projects, setProjects] = useState<NelvyonProject[]>([]);
  const [clients, setClients] = useState<NelvyonClient[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<NelvyonProject>>({
    name: "", project_type: "web", client_id: e2eParams.client_id || 0, brief: "", priority: "medium", status: "draft", progress: 0,
  });

  /* ─── RBAC State ─── */
  const [currentRole, setCurrentRole] = useState<UserRole>("admin");
  const permissions = ROLE_PERMISSIONS[currentRole];

  /* ─── Audit Trail ─── */
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const addAudit = useCallback((action: string, details?: string) => {
    setAuditTrail(prev => [{ action, timestamp: new Date().toISOString(), user: user?.email || "Sistema", role: currentRole, details }, ...prev.slice(0, 99)]);
  }, [user, currentRole]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading, navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, clientRes] = await Promise.all([
        api.getProjects(0, 100),
        api.getClients(0, 100),
      ]);
      setProjects(projRes.items || []);
      setClients(clientRes.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error cargando datos";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  /* ─── E2E: Auto-open form when coming from Clients with client_id ─── */
  useEffect(() => {
    if (e2eParams.client_id && clients.length > 0 && !loading) {
      const clientExists = clients.find(c => c.id === e2eParams.client_id);
      if (clientExists && permissions.canCreate) {
        setForm(prev => ({ ...prev, client_id: e2eParams.client_id! }));
        setShowForm(true);
      }
    }
   
  }, [clients, loading]);

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const getClient = (id: number): NelvyonClient | undefined => clients.find(c => c.id === id);

  const handleCreate = async () => {
    if (!permissions.canCreate) { toast.error("No tienes permisos para crear proyectos"); return; }
    if (!form.name || !form.client_id) {
      toast.error("Nombre y cliente son obligatorios");
      return;
    }
    setSaving(true);
    try {
      const created = await api.createProject(form);
      setProjects(prev => [created, ...prev]);
      setShowForm(false);
      setForm({ name: "", project_type: "web", client_id: 0, brief: "", priority: "medium", status: "draft", progress: 0 });
      toast.success("Proyecto creado correctamente");
      addAudit("Proyecto creado", `${created.name} · Tipo: ${typeConfig[created.project_type]?.label || created.project_type} · Cliente: ${getClient(created.client_id)?.business_name || created.client_id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error creando proyecto";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!permissions.canDelete) { toast.error("No tienes permisos para eliminar proyectos"); return; }
    const target = projects.find(p => p.id === id);
    try {
      await api.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      toast.success("Proyecto eliminado");
      addAudit("Proyecto eliminado", `${target?.name || `ID ${id}`}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error eliminando proyecto");
    }
  };

  const handleStatusChange = async (project: NelvyonProject, newStatus: string) => {
    if (!permissions.canChangeStatus) { toast.error("No tienes permisos para cambiar el estado"); return; }
    try {
      const updated = await api.updateProject(project.id, { status: newStatus });
      setProjects(prev => prev.map(p => p.id === project.id ? updated : p));
      toast.success(`Estado cambiado a "${statusConfig[newStatus]?.label || newStatus}"`);
      addAudit("Estado de proyecto cambiado", `${project.name}: ${statusConfig[project.status]?.label || project.status} → ${statusConfig[newStatus]?.label || newStatus}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error cambiando estado");
    }
  };

  const e2eClientName = e2eParams.client_id ? clients.find(c => c.id === e2eParams.client_id)?.business_name : undefined;

  return (
    <DashboardLayout title="Proyectos" subtitle="Gestión de proyectos con flujo orquestado">
      {/* ─── E2E Flow Banner ─── */}
      <E2EFlowBanner clientName={e2eClientName} />

      {/* ─── RBAC Bar ─── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 p-2 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
          <Shield className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-[10px] text-zinc-500">Rol:</span>
          <select value={currentRole} onChange={e => setCurrentRole(e.target.value as UserRole)}
            className="h-7 px-2 rounded-lg bg-[#0F1419] border border-white/[0.06] text-xs text-zinc-300">
            {Object.entries(ROLE_PERMISSIONS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-1">
          {(Object.entries(permissions) as [string, boolean | string][]).filter(([k]) => k.startsWith("can")).map(([k, v]) => (
            <span key={k} className={cn("px-2 py-0.5 rounded text-[8px] font-bold border flex items-center gap-0.5",
              v ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20")}>
              {v ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
              {k.replace("can", "").replace(/([A-Z])/g, " $1").trim()}
            </span>
          ))}
        </div>
        {permissions.canViewLogs && (
          <Button size="sm" variant="outline" className="h-7 text-[10px] border-white/10 text-zinc-400 ml-auto" onClick={() => setShowAuditLog(!showAuditLog)}>
            <Clock className="w-3 h-3 mr-1" /> Auditoría ({auditTrail.length})
          </Button>
        )}
      </div>

      {/* ─── Audit Log Panel ─── */}
      {showAuditLog && permissions.canViewLogs && auditTrail.length > 0 && (
        <div className="mb-4 p-4 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-violet-400" /> Registro de Auditoría — Proyectos ({auditTrail.length})
            </span>
            <button onClick={() => setShowAuditLog(false)} className="text-zinc-600 hover:text-zinc-400"><XCircle className="w-3.5 h-3.5" /></button>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {auditTrail.map((entry, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <Clock className="w-3 h-3 text-zinc-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-violet-400">{entry.action}</span>
                    <span className="text-[9px] text-zinc-500">{entry.user}</span>
                    <span className="text-[8px] px-1 py-0.5 rounded bg-white/[0.04] text-zinc-600">{ROLE_PERMISSIONS[entry.role as UserRole]?.label || entry.role}</span>
                  </div>
                  {entry.details && <p className="text-[9px] text-zinc-600 mt-0.5">{entry.details}</p>}
                  <p className="text-[8px] text-zinc-700">{new Date(entry.timestamp).toLocaleString("es")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Buscar proyecto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[#111113] border-white/[0.08] text-white text-sm h-9"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {["all", "draft", "pending", "generating", "qa_review", "approved"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  filterStatus === s
                    ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                    : "text-zinc-500 hover:text-white hover:bg-white/[0.04]"
                )}
              >
                {s === "all" ? "Todos" : statusConfig[s]?.label || s}
              </button>
            ))}
          </div>
        </div>
        {permissions.canCreate && (
          <Button onClick={() => setShowForm(true)} className="bg-violet-600 hover:bg-violet-500 text-white h-9 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" /> Nuevo Proyecto
          </Button>
        )}
      </div>

      {/* New Project Form */}
      {showForm && permissions.canCreate && (
        <div className="mb-6 p-5 rounded-xl bg-[#111113] border border-violet-500/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Nuevo Proyecto</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-white">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Nombre *</label>
              <Input value={form.name || ""} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white text-sm h-9" />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Cliente *</label>
              <select
                value={form.client_id || 0}
                onChange={(e) => setForm(p => ({ ...p, client_id: Number(e.target.value) }))}
                className="w-full h-9 rounded-md bg-white/[0.04] border border-white/[0.08] text-white text-sm px-3"
              >
                <option value={0} className="bg-[#111113]">Seleccionar...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id} className="bg-[#111113]">{c.business_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Tipo</label>
              <select
                value={form.project_type || "web"}
                onChange={(e) => setForm(p => ({ ...p, project_type: e.target.value }))}
                className="w-full h-9 rounded-md bg-white/[0.04] border border-white/[0.08] text-white text-sm px-3"
              >
                {Object.entries(typeConfig).map(([k, v]) => (
                  <option key={k} value={k} className="bg-[#111113]">{v.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs text-zinc-500 mb-1 block">Brief</label>
            <Textarea value={form.brief || ""} onChange={(e) => setForm(p => ({ ...p, brief: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white text-sm min-h-[80px]" />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowForm(false)} className="border-white/[0.1] text-zinc-300 bg-transparent hover:bg-white/[0.04]">Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-violet-600 hover:bg-violet-500 text-white">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creando...</> : "Crear Proyecto"}
            </Button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          <span className="ml-3 text-sm text-zinc-400">Cargando proyectos...</span>
        </div>
      ) : (
        <>
          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((p) => {
              const client = getClient(p.client_id);
              const type = typeConfig[p.project_type] || { label: p.project_type, color: "from-zinc-500 to-zinc-400" };
              const status = statusConfig[p.status || "pending"] || statusConfig.pending;
              const StatusIcon = status.icon;

              return (
                <div key={p.id} className="rounded-xl bg-[#111113] border border-white/[0.06] hover:border-violet-500/20 transition-all group overflow-hidden">
                  <div className={`h-1 bg-gradient-to-r ${type.color}`} />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-white mb-0.5">{p.name}</h4>
                        <p className="text-xs text-zinc-500">{client?.business_name || "—"}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {permissions.canChangeStatus && (
                          <select
                            value={p.status || "draft"}
                            onChange={(e) => handleStatusChange(p, e.target.value)}
                            className="h-6 px-1 rounded bg-[#0F1419] border border-white/[0.06] text-[9px] text-zinc-300 cursor-pointer"
                          >
                            {Object.entries(statusConfig).map(([k, v]) => (
                              <option key={k} value={k}>{v.label}</option>
                            ))}
                          </select>
                        )}
                        {!permissions.canChangeStatus && (
                          <span className={`text-[11px] px-2 py-1 rounded-md border font-medium flex items-center gap-1 ${status.bg} ${status.color}`}>
                            <StatusIcon className={cn("w-3 h-3", p.status === "generating" && "animate-spin")} />
                            {status.label}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded bg-gradient-to-r ${type.color} text-white font-medium`}>
                        {type.label}
                      </span>
                      {p.priority && (
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded font-medium",
                          p.priority === "high" || p.priority === "urgent" ? "bg-red-500/10 text-red-400" :
                          p.priority === "medium" ? "bg-amber-500/10 text-amber-400" :
                          "bg-zinc-500/10 text-zinc-400"
                        )}>
                          {p.priority}
                        </span>
                      )}
                    </div>

                    {p.brief && (
                      <p className="text-xs text-zinc-500 mb-3 line-clamp-2">{p.brief}</p>
                    )}

                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${type.color} rounded-full transition-all duration-500`}
                          style={{ width: `${p.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-zinc-500 font-medium">{p.progress || 0}%</span>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.04]">
                      <span className="text-[10px] text-zinc-600">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString("es-ES") : "—"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {permissions.canDelete && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(p.id)}
                            className="h-7 w-7 p-0 text-zinc-600 hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                        {(p.status === "pending" || p.status === "draft") && permissions.canEdit && (
                          <Button
                            size="sm"
                            onClick={() => navigate(buildE2EUrl("/generator", { project_id: p.id, client_id: p.client_id }))}
                            className="h-7 text-[11px] bg-violet-600/20 text-violet-300 hover:bg-violet-600/30 border border-violet-500/20"
                          >
                            <Play className="w-3 h-3 mr-1" /> Generar <ArrowRight className="w-2.5 h-2.5 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <FolderKanban className="w-12 h-12 text-zinc-700 mb-4" />
              <p className="text-sm text-zinc-500">No hay proyectos</p>
              <p className="text-xs text-zinc-600 mt-1">Crea uno nuevo para comenzar</p>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}