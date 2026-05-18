import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import E2EFlowBanner from "@/components/E2EFlowBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Users, Plus, Search, Globe, Mail, Phone, Building2, MapPin,
  Palette, Target, Briefcase, X, ChevronRight, Edit, Trash2, Loader2,
  Shield, Lock, Unlock, Clock, XCircle, FolderKanban, ArrowRight
} from "lucide-react";
import { api, type NelvyonClient } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { buildE2EUrl } from "@/lib/e2e-flow";

/* ─── RBAC ─── */
type UserRole = "admin" | "manager" | "editor" | "viewer";

const ROLE_PERMISSIONS: Record<UserRole, { label: string; canCreate: boolean; canEdit: boolean; canDelete: boolean; canExport: boolean; canViewLogs: boolean }> = {
  admin:   { label: "Administrador", canCreate: true, canEdit: true, canDelete: true, canExport: true, canViewLogs: true },
  manager: { label: "Manager",       canCreate: true, canEdit: true, canDelete: false, canExport: true, canViewLogs: true },
  editor:  { label: "Editor",        canCreate: true, canEdit: true, canDelete: false, canExport: false, canViewLogs: false },
  viewer:  { label: "Visor",         canCreate: false, canEdit: false, canDelete: false, canExport: false, canViewLogs: false },
};

interface AuditEntry { action: string; timestamp: string; user: string; role: string; details?: string }

const emptyClient: Partial<NelvyonClient> = {
  business_name: "", sector: "", country: "", city: "", ideal_customer: "",
  value_proposition: "", differentiator: "", services: "", objectives: "",
  brand_tone: "", visual_style: "", brand_colors: "", competition: "",
  budget: "", language: "es", market: "", website_url: "",
  contact_email: "", contact_phone: "", notes: "", status: "active",
};

export default function Clients() {
  const { ts } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<NelvyonClient[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<NelvyonClient | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<NelvyonClient>>(emptyClient);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getClients(0, 100);
      setClients(res.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error cargando clientes";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchClients();
  }, [user, fetchClients]);

  const filtered = clients.filter(c =>
    c.business_name.toLowerCase().includes(search.toLowerCase()) ||
    c.sector.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (editing && !permissions.canEdit) { toast.error("No tienes permisos para editar clientes"); return; }
    if (!editing && !permissions.canCreate) { toast.error("No tienes permisos para crear clientes"); return; }
    if (!form.business_name || !form.sector) {
      toast.error("Nombre del negocio y sector son obligatorios");
      return;
    }
    setSaving(true);
    try {
      if (editing && selected) {
        const updated = await api.updateClient(selected.id, form);
        setClients(prev => prev.map(c => c.id === selected.id ? updated : c));
        setSelected(updated);
        toast.success("Cliente actualizado correctamente");
        addAudit("Cliente editado", `${updated.business_name} · Sector: ${updated.sector}`);
      } else {
        const created = await api.createClient(form);
        setClients(prev => [created, ...prev]);
        toast.success("Cliente creado correctamente");
        addAudit("Cliente creado", `${created.business_name} · Sector: ${created.sector}`);
      }
      setShowForm(false);
      setEditing(false);
      setForm(emptyClient);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error guardando cliente";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!permissions.canDelete) { toast.error("No tienes permisos para eliminar clientes"); return; }
    const target = clients.find(c => c.id === id);
    try {
      await api.deleteClient(id);
      setClients(prev => prev.filter(c => c.id !== id));
      if (selected?.id === id) setSelected(null);
      toast.success("Cliente eliminado");
      addAudit("Cliente eliminado", `${target?.business_name || `ID ${id}`}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error eliminando cliente";
      toast.error(msg);
    }
  };

  const openEdit = (client: NelvyonClient) => {
    if (!permissions.canEdit) { toast.error("No tienes permisos para editar"); return; }
    setForm(client);
    setEditing(true);
    setShowForm(true);
  };

  const openNew = () => {
    if (!permissions.canCreate) { toast.error("No tienes permisos para crear clientes"); return; }
    setForm(emptyClient);
    setEditing(false);
    setShowForm(true);
  };

  const handleExport = () => {
    if (!permissions.canExport) { toast.error("No tienes permisos para exportar"); return; }
    const csv = ["Nombre,Sector,País,Ciudad,Email,Teléfono,Web",
      ...clients.map(c => `"${c.business_name}","${c.sector}","${c.country || ""}","${c.city || ""}","${c.contact_email || ""}","${c.contact_phone || ""}","${c.website_url || ""}"`)
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `clientes-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Clientes exportados");
    addAudit("Clientes exportados", `${clients.length} clientes en CSV`);
  };

  const Field = ({ label, field, textarea }: { label: string; field: keyof NelvyonClient; textarea?: boolean }) => (
    <div>
      <label className="text-xs text-zinc-500 mb-1 block">{label}</label>
      {textarea ? (
        <Textarea
          value={(form[field] as string) || ""}
          onChange={(e) => setForm(prev => ({ ...prev, [field]: e.target.value }))}
          className="bg-white/[0.04] border-white/[0.08] text-white text-sm min-h-[80px] focus:border-violet-500/50"
        />
      ) : (
        <Input
          value={(form[field] as string) || ""}
          onChange={(e) => setForm(prev => ({ ...prev, [field]: e.target.value }))}
          className="bg-white/[0.04] border-white/[0.08] text-white text-sm h-9 focus:border-violet-500/50"
        />
      )}
    </div>
  );

  return (
    <DashboardLayout title="Clientes" subtitle="Gestión de perfiles de cliente con personalización profunda">
      {/* ─── E2E Flow Banner ─── */}
      <E2EFlowBanner
        clientName={selected?.business_name}
      />

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
        {permissions.canExport && (
          <Button size="sm" variant="outline" className="h-7 text-[10px] border-white/10 text-zinc-400" onClick={handleExport}>
            Exportar CSV
          </Button>
        )}
      </div>

      {/* ─── Audit Log Panel ─── */}
      {showAuditLog && permissions.canViewLogs && auditTrail.length > 0 && (
        <div className="mb-4 p-4 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-violet-400" /> Registro de Auditoría — Clientes ({auditTrail.length})
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

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-220px)]">
        {/* Client List */}
        <div className="w-full lg:w-[360px] shrink-0 flex flex-col rounded-xl bg-[#111113] border border-white/[0.06] overflow-hidden">
          <div className="p-4 border-b border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-400" />
                Clientes ({filtered.length})
              </h3>
              {permissions.canCreate && (
                <Button size="sm" onClick={openNew} className="bg-violet-600 hover:bg-violet-500 text-white h-8 text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Nuevo
                </Button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Buscar cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white/[0.04] border-white/[0.08] text-white text-sm h-9"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Users className="w-10 h-10 text-zinc-700 mb-3" />
                <p className="text-sm text-zinc-500">No hay clientes</p>
                <p className="text-xs text-zinc-600">Crea uno nuevo para comenzar</p>
              </div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setSelected(c); setShowForm(false); }}
                  className={cn(
                    "w-full text-left px-4 py-3.5 hover:bg-white/[0.03] transition-colors flex items-center gap-3",
                    selected?.id === c.id && "bg-violet-500/[0.08] border-l-2 border-violet-500"
                  )}
                >
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/10 flex items-center justify-center text-xs font-bold text-violet-300 shrink-0">
                    {c.business_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{c.business_name}</p>
                    <p className="text-xs text-zinc-500 truncate">{c.sector} · {c.country || "—"}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detail / Form Panel */}
        <div className="flex-1 rounded-xl bg-[#111113] border border-white/[0.06] overflow-hidden">
          {showForm ? (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <h3 className="text-sm font-semibold text-white">{editing ? "Editar Cliente" : "Nuevo Cliente"}</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                <div>
                  <h4 className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5" /> Información del Negocio
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Nombre del Negocio *" field="business_name" />
                    <Field label="Sector *" field="sector" />
                    <Field label="País" field="country" />
                    <Field label="Ciudad" field="city" />
                    <Field label="Idioma" field="language" />
                    <Field label="Mercado" field="market" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Target className="w-3.5 h-3.5" /> Estrategia y Posicionamiento
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    <Field label="Cliente Ideal" field="ideal_customer" textarea />
                    <Field label="Propuesta de Valor" field="value_proposition" textarea />
                    <Field label="Diferenciador" field="differentiator" textarea />
                    <Field label="Servicios" field="services" textarea />
                    <Field label="Objetivos" field="objectives" textarea />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Palette className="w-3.5 h-3.5" /> Marca y Estilo
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Tono de Marca" field="brand_tone" />
                    <Field label="Estilo Visual" field="visual_style" />
                    <Field label="Colores de Marca" field="brand_colors" />
                    <Field label="Presupuesto" field="budget" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5" /> Competencia y Social Proof
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    <Field label="Competencia" field="competition" textarea />
                    <Field label="Testimonios" field="testimonials" textarea />
                    <Field label="Casos de Éxito" field="case_studies" textarea />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-pink-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" /> Contacto
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Email" field="contact_email" />
                    <Field label="Teléfono" field="contact_phone" />
                    <Field label="Website" field="website_url" />
                  </div>
                </div>
                <Field label="Notas" field="notes" textarea />
              </div>
              <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/[0.06]">
                <Button variant="outline" onClick={() => setShowForm(false)} className="border-white/[0.1] text-zinc-300 bg-transparent hover:bg-white/[0.04]">
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving} className="bg-violet-600 hover:bg-violet-500 text-white">
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</> : editing ? "Guardar Cambios" : "Crear Cliente"}
                </Button>
              </div>
            </div>
          ) : selected ? (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/10 flex items-center justify-center text-lg font-bold text-violet-300">
                    {selected.business_name[0]}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{selected.business_name}</h3>
                    <p className="text-xs text-zinc-500">{selected.sector}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {permissions.canEdit && (
                    <Button variant="ghost" size="icon" onClick={() => openEdit(selected)} className="text-zinc-400 hover:text-white">
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  {permissions.canDelete && (
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(selected.id)} className="text-zinc-400 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* ─── E2E Actions ─── */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06] bg-violet-500/[0.03]">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider mr-2">Flujo E2E:</span>
                <Button
                  size="sm"
                  onClick={() => navigate(buildE2EUrl("/projects", { client_id: selected.id }))}
                  className="h-7 text-[10px] bg-violet-600/20 text-violet-300 hover:bg-violet-600/30 border border-violet-500/20"
                >
                  <FolderKanban className="w-3 h-3 mr-1" /> Crear Proyecto <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate(buildE2EUrl("/generator", { client_id: selected.id }))}
                  className="h-7 text-[10px] bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 border border-blue-500/20"
                >
                  Generar Contenido <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { icon: MapPin, label: "Ubicación", value: `${selected.city || ""}, ${selected.country || ""}` },
                    { icon: Globe, label: "Mercado", value: selected.market },
                    { icon: Mail, label: "Email", value: selected.contact_email },
                    { icon: Phone, label: "Teléfono", value: selected.contact_phone },
                    { icon: Globe, label: "Web", value: selected.website_url },
                    { icon: Briefcase, label: "Presupuesto", value: selected.budget },
                  ].map((item) => (
                    <div key={item.label} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                      <div className="flex items-center gap-1.5 mb-1">
                        <item.icon className="w-3 h-3 text-zinc-500" />
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{item.label}</span>
                      </div>
                      <p className="text-xs text-white truncate">{item.value || "—"}</p>
                    </div>
                  ))}
                </div>

                {[
                  { title: "Cliente Ideal", value: selected.ideal_customer, color: "text-violet-400" },
                  { title: "Propuesta de Valor", value: selected.value_proposition, color: "text-blue-400" },
                  { title: "Diferenciador", value: selected.differentiator, color: "text-emerald-400" },
                  { title: "Servicios", value: selected.services, color: "text-cyan-400" },
                  { title: "Objetivos", value: selected.objectives, color: "text-amber-400" },
                  { title: "Tono de Marca", value: selected.brand_tone, color: "text-pink-400" },
                  { title: "Competencia", value: selected.competition, color: "text-red-400" },
                ].filter(s => s.value).map((section) => (
                  <div key={section.title} className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                    <h4 className={`text-xs font-semibold ${section.color} uppercase tracking-wider mb-2`}>{section.title}</h4>
                    <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{section.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center px-8">
              <Users className="w-12 h-12 text-zinc-700 mb-4" />
              <p className="text-sm text-zinc-500 mb-1">Selecciona un cliente</p>
              <p className="text-xs text-zinc-600">o crea uno nuevo para comenzar</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}