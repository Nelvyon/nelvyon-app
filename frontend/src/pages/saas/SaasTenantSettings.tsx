/**
 * SaasTenantSettings — Multi-tenant configuration page.
 * Connects to real backend: /api/v1/tenant/*
 * Features: workspace settings, module toggling, member permissions, data isolation stats.
 */
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import SaasLayout from "@/components/SaasLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { getAPIBaseURL } from "@/lib/config";
import { toast } from "sonner";
import {
  Building2, Globe, Clock, Languages, Briefcase, Mail,
  Users, Shield, Database, Save, Loader2, RefreshCw,
  CheckCircle2, AlertTriangle, Lock, Unlock, Settings,
  BarChart3, Palette, ChevronDown, ChevronUp, Layers,
  HardDrive, UserCog, Eye, Edit, Trash2, Plus,
} from "lucide-react";

/* ── Types ── */
interface TenantSettings {
  workspace_id: number;
  name: string;
  slug: string | null;
  logo_url: string | null;
  primary_color: string | null;
  domain: string | null;
  plan: string | null;
  status: string | null;
  timezone: string;
  locale: string;
  industry: string;
  billing_email: string | null;
  max_users: number;
  enabled_modules: string[];
  features_json: string | null;
  created_at: string | null;
}

interface TenantOptions {
  timezones: string[];
  locales: string[];
  industries: string[];
  modules: string[];
}

interface MemberPermission {
  user_id: string;
  email: string | null;
  role: string;
  status: string;
  module_permissions: Record<string, string[]>;
}

interface DataStats {
  workspace_id: number;
  tables_with_data: Record<string, number>;
  total_records: number;
  storage_estimate_mb: number;
}

/* ── Module display config ── */
const MODULE_META: Record<string, { label: string; icon: string; color: string }> = {
  crm: { label: "CRM", icon: "👥", color: "text-blue-400" },
  pipelines: { label: "Pipelines", icon: "🎯", color: "text-emerald-400" },
  campaigns: { label: "Campañas", icon: "📣", color: "text-amber-400" },
  funnels: { label: "Funnels", icon: "📊", color: "text-violet-400" },
  social: { label: "Social", icon: "📱", color: "text-pink-400" },
  helpdesk: { label: "Helpdesk", icon: "🎧", color: "text-rose-400" },
  conversations: { label: "Conversaciones", icon: "💬", color: "text-cyan-400" },
  calls: { label: "Llamadas", icon: "📞", color: "text-green-400" },
  calendar: { label: "Calendario", icon: "📅", color: "text-indigo-400" },
  websites: { label: "Websites", icon: "🌐", color: "text-teal-400" },
  forms: { label: "Forms", icon: "📝", color: "text-orange-400" },
  blog: { label: "Blog", icon: "📖", color: "text-lime-400" },
  payments: { label: "Pagos", icon: "💳", color: "text-yellow-400" },
  reports: { label: "Reportes", icon: "📈", color: "text-sky-400" },
  workflows: { label: "Workflows", icon: "⚙️", color: "text-gray-400" },
  partners: { label: "Partners", icon: "🤝", color: "text-purple-400" },
  contracts: { label: "Contratos", icon: "📄", color: "text-red-400" },
  agents: { label: "Agentes IA", icon: "🤖", color: "text-fuchsia-400" },
  analytics: { label: "Analytics", icon: "📊", color: "text-blue-300" },
  integrations: { label: "Integraciones", icon: "🔌", color: "text-emerald-300" },
  automation: { label: "Automatización", icon: "⚡", color: "text-amber-300" },
  billing: { label: "Facturación", icon: "💰", color: "text-green-300" },
};

export default function SaasTenantSettings() {
  const { user, loading: authLoading } = useAuth();
  const { activeWorkspace, getWorkspaceHeader } = useWorkspace();
  const navigate = useNavigate();

  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [options, setOptions] = useState<TenantOptions | null>(null);
  const [members, setMembers] = useState<MemberPermission[]>([]);
  const [dataStats, setDataStats] = useState<DataStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "modules" | "permissions" | "data" | "provisioning" | "whitelabel" | "backup">("general");

  // Form state
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDomain, setFormDomain] = useState("");
  const [formTimezone, setFormTimezone] = useState("UTC");
  const [formLocale, setFormLocale] = useState("es");
  const [formIndustry, setFormIndustry] = useState("other");
  const [formBillingEmail, setFormBillingEmail] = useState("");
  const [formMaxUsers, setFormMaxUsers] = useState(10);
  const [formColor, setFormColor] = useState("#8B5CF6");
  const [enabledModules, setEnabledModules] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/saas");
  }, [user, authLoading, navigate]);

  const headers = useCallback(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    const wsH = getWorkspaceHeader();
    Object.assign(h, wsH);
    return h;
  }, [getWorkspaceHeader]);

  const fetchAll = useCallback(async () => {
    if (!user || !activeWorkspace) return;
    setLoading(true);
    const base = getAPIBaseURL();
    const h = headers();
    try {
      const [settingsRes, optionsRes, membersRes, statsRes] = await Promise.allSettled([
        fetch(`${base}/api/v1/tenant/settings`, { credentials: "include", headers: h }),
        fetch(`${base}/api/v1/tenant/options`, { credentials: "include", headers: h }),
        fetch(`${base}/api/v1/tenant/members-permissions`, { credentials: "include", headers: h }),
        fetch(`${base}/api/v1/tenant/data-stats`, { credentials: "include", headers: h }),
      ]);

      if (settingsRes.status === "fulfilled" && settingsRes.value.ok) {
        const s: TenantSettings = await settingsRes.value.json();
        setSettings(s);
        setFormName(s.name || "");
        setFormSlug(s.slug || "");
        setFormDomain(s.domain || "");
        setFormTimezone(s.timezone || "UTC");
        setFormLocale(s.locale || "es");
        setFormIndustry(s.industry || "other");
        setFormBillingEmail(s.billing_email || "");
        setFormMaxUsers(s.max_users || 10);
        setFormColor(s.primary_color || "#8B5CF6");
        setEnabledModules(s.enabled_modules || []);
      }

      if (optionsRes.status === "fulfilled" && optionsRes.value.ok) {
        setOptions(await optionsRes.value.json());
      }

      if (membersRes.status === "fulfilled" && membersRes.value.ok) {
        setMembers(await membersRes.value.json());
      }

      if (statsRes.status === "fulfilled" && statsRes.value.ok) {
        setDataStats(await statsRes.value.json());
      }
    } catch (err) {
      console.warn("Failed to fetch tenant settings:", err);
    } finally {
      setLoading(false);
    }
  }, [user, activeWorkspace, headers]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const saveSettings = async () => {
    setSaving(true);
    const base = getAPIBaseURL();
    try {
      const res = await fetch(`${base}/api/v1/tenant/settings`, {
        method: "PUT",
        credentials: "include",
        headers: headers(),
        body: JSON.stringify({
          name: formName || undefined,
          slug: formSlug || undefined,
          domain: formDomain || undefined,
          primary_color: formColor || undefined,
          timezone: formTimezone,
          locale: formLocale,
          industry: formIndustry,
          billing_email: formBillingEmail || undefined,
          max_users: formMaxUsers,
          enabled_modules: enabledModules,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        toast.success("Configuración de tenant guardada");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || "Error al guardar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const toggleModule = (mod: string) => {
    setEnabledModules(prev =>
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    );
  };

  const tabs = [
    { key: "general" as const, label: "General", icon: Settings },
    { key: "modules" as const, label: "Módulos", icon: Layers },
    { key: "permissions" as const, label: "Permisos", icon: Shield },
    { key: "data" as const, label: "Datos", icon: Database },
    { key: "provisioning" as const, label: "Provisioning", icon: Plus },
    { key: "whitelabel" as const, label: "White-Label", icon: Palette },
    { key: "backup" as const, label: "Backup", icon: HardDrive },
  ];

  if (authLoading || !user) return null;

  return (
    <SaasLayout title="Tenant & Multi-tenant" subtitle="Configuración avanzada del workspace como tenant aislado">
      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl bg-white/[0.02] border border-white/[0.06] w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all",
              activeTab === t.key
                ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03] border border-transparent"
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
          <span className="ml-3 text-sm text-zinc-400">Cargando configuración del tenant...</span>
        </div>
      ) : (
        <>
          {/* ═══ GENERAL TAB ═══ */}
          {activeTab === "general" && (
            <div className="space-y-6 max-w-3xl">
              {/* Workspace Info Card */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${formColor}20` }}>
                    <Building2 className="w-5 h-5" style={{ color: formColor }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Información del Tenant</h3>
                    <p className="text-[11px] text-zinc-500">Datos básicos del workspace/tenant</p>
                  </div>
                  {settings && (
                    <Badge variant="outline" className="ml-auto text-[10px] border-emerald-500/30 text-emerald-400">
                      ID: {settings.workspace_id}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-zinc-400 mb-1 block">Nombre del Workspace</label>
                    <Input value={formName} onChange={e => setFormName(e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-sm" />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 mb-1 block">Slug (URL)</label>
                    <Input value={formSlug} onChange={e => setFormSlug(e.target.value)} placeholder="mi-empresa" className="bg-white/[0.03] border-white/[0.08] text-white text-sm" />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 mb-1 block">Dominio personalizado</label>
                    <Input value={formDomain} onChange={e => setFormDomain(e.target.value)} placeholder="app.miempresa.com" className="bg-white/[0.03] border-white/[0.08] text-white text-sm" />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 mb-1 block">Email de facturación</label>
                    <Input value={formBillingEmail} onChange={e => setFormBillingEmail(e.target.value)} type="email" className="bg-white/[0.03] border-white/[0.08] text-white text-sm" />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 mb-1 block">Color principal</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={formColor} onChange={e => setFormColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                      <Input value={formColor} onChange={e => setFormColor(e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-sm flex-1" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 mb-1 block">Máx. usuarios</label>
                    <Input type="number" value={formMaxUsers} onChange={e => setFormMaxUsers(Number(e.target.value))} min={1} max={500} className="bg-white/[0.03] border-white/[0.08] text-white text-sm" />
                  </div>
                </div>
              </div>

              {/* Regional Settings */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Globe className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h3 className="text-sm font-semibold text-white">Configuración Regional</h3>
                    <p className="text-[11px] text-zinc-500">Zona horaria, idioma e industria</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] text-zinc-400 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Zona horaria</label>
                    <select value={formTimezone} onChange={e => setFormTimezone(e.target.value)} className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-sm px-3 py-2">
                      {(options?.timezones || ["UTC"]).map(tz => <option key={tz} value={tz} className="bg-zinc-900">{tz}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 mb-1 flex items-center gap-1"><Languages className="w-3 h-3" /> Idioma</label>
                    <select value={formLocale} onChange={e => setFormLocale(e.target.value)} className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-sm px-3 py-2">
                      {(options?.locales || ["es", "en"]).map(l => <option key={l} value={l} className="bg-zinc-900">{l.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 mb-1 flex items-center gap-1"><Briefcase className="w-3 h-3" /> Industria</label>
                    <select value={formIndustry} onChange={e => setFormIndustry(e.target.value)} className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-sm px-3 py-2">
                      {(options?.industries || ["other"]).map(ind => <option key={ind} value={ind} className="bg-zinc-900">{ind.replace("_", " ")}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button onClick={saveSettings} disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar Configuración
                </Button>
              </div>
            </div>
          )}

          {/* ═══ MODULES TAB ═══ */}
          {activeTab === "modules" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Módulos Habilitados</h3>
                  <p className="text-[11px] text-zinc-500">Activa o desactiva módulos para este tenant. {enabledModules.length}/{options?.modules?.length || 22} activos</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEnabledModules(options?.modules || [])} className="text-xs border-white/10 text-zinc-300 hover:bg-white/5">
                    Activar todos
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEnabledModules([])} className="text-xs border-white/10 text-zinc-300 hover:bg-white/5">
                    Desactivar todos
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(options?.modules || Object.keys(MODULE_META)).map(mod => {
                  const meta = MODULE_META[mod] || { label: mod, icon: "📦", color: "text-zinc-400" };
                  const isEnabled = enabledModules.includes(mod);
                  return (
                    <div
                      key={mod}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer",
                        isEnabled
                          ? "bg-white/[0.04] border-violet-500/20"
                          : "bg-white/[0.01] border-white/[0.04] opacity-60"
                      )}
                      onClick={() => toggleModule(mod)}
                    >
                      <span className="text-lg">{meta.icon}</span>
                      <div className="flex-1">
                        <span className={cn("text-xs font-medium", isEnabled ? "text-white" : "text-zinc-500")}>{meta.label}</span>
                      </div>
                      <Switch checked={isEnabled} onCheckedChange={() => toggleModule(mod)} />
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end">
                <Button onClick={saveSettings} disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar Módulos
                </Button>
              </div>
            </div>
          )}

          {/* ═══ PERMISSIONS TAB ═══ */}
          {activeTab === "permissions" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-white">Permisos por Miembro & Módulo</h3>
                <p className="text-[11px] text-zinc-500">Control granular de acceso por usuario y módulo del tenant</p>
              </div>

              {members.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <Users className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No hay miembros en este workspace</p>
                  <p className="text-[11px] mt-1">Invita miembros desde Configuración</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {members.map(member => (
                    <div key={member.user_id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                          <UserCog className="w-4 h-4 text-violet-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-white">{member.email || member.user_id}</p>
                          <p className="text-[10px] text-zinc-500">Rol: {member.role} · Estado: {member.status}</p>
                        </div>
                        <Badge variant="outline" className={cn(
                          "text-[9px]",
                          member.role === "admin" ? "border-amber-500/30 text-amber-400" :
                          member.role === "owner" ? "border-violet-500/30 text-violet-400" :
                          "border-zinc-500/30 text-zinc-400"
                        )}>
                          {member.role}
                        </Badge>
                      </div>

                      {Object.keys(member.module_permissions).length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(member.module_permissions).map(([mod, actions]) => (
                            <div key={mod} className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.03] border border-white/[0.06]">
                              <span className="text-[10px]">{MODULE_META[mod]?.icon || "📦"}</span>
                              <span className="text-[10px] text-zinc-300">{mod}</span>
                              <span className="text-[9px] text-zinc-500">({actions.join(", ")})</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-zinc-600 italic">Sin permisos específicos de módulo (usa permisos del rol)</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ DATA ISOLATION TAB ═══ */}
          {activeTab === "data" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Aislamiento de Datos del Tenant</h3>
                  <p className="text-[11px] text-zinc-500">Estadísticas de datos aislados por workspace</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchAll} className="text-xs border-white/10 text-zinc-300 hover:bg-white/5 gap-1">
                  <RefreshCw className="w-3 h-3" /> Actualizar
                </Button>
              </div>

              {dataStats ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="w-4 h-4 text-blue-400" />
                        <span className="text-[11px] text-zinc-400">Total Registros</span>
                      </div>
                      <p className="text-2xl font-bold text-white">{dataStats.total_records.toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <HardDrive className="w-4 h-4 text-emerald-400" />
                        <span className="text-[11px] text-zinc-400">Almacenamiento Est.</span>
                      </div>
                      <p className="text-2xl font-bold text-white">{dataStats.storage_estimate_mb} MB</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Layers className="w-4 h-4 text-violet-400" />
                        <span className="text-[11px] text-zinc-400">Tablas con Datos</span>
                      </div>
                      <p className="text-2xl font-bold text-white">{Object.keys(dataStats.tables_with_data).length}</p>
                    </div>
                  </div>

                  {/* Table Breakdown */}
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <h4 className="text-xs font-semibold text-white mb-3">Desglose por Tabla</h4>
                    {Object.keys(dataStats.tables_with_data).length === 0 ? (
                      <p className="text-[11px] text-zinc-500 text-center py-4">Sin datos aún. Crea contactos, deals o campañas para empezar.</p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(dataStats.tables_with_data)
                          .sort(([, a], [, b]) => b - a)
                          .map(([table, count]) => (
                            <div key={table} className="flex items-center gap-3">
                              <span className="text-[11px] text-zinc-400 w-40 truncate">{table}</span>
                              <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
                                  style={{ width: `${Math.min((count / dataStats.total_records) * 100, 100)}%` }}
                                />
                              </div>
                              <span className="text-[11px] text-white font-mono w-12 text-right">{count}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Isolation Badge */}
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4 flex items-center gap-3">
                    <Shield className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-300">Aislamiento Activo</p>
                      <p className="text-[10px] text-emerald-400/70">
                        Todos los datos están aislados por workspace_id y user_id. Ningún tenant puede acceder a datos de otro.
                      </p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-auto" />
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-zinc-500">
                  <Database className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No se pudieron cargar las estadísticas</p>
                </div>
              )}
            </div>
          )}

          {/* ═══ PROVISIONING TAB ═══ */}
          {activeTab === "provisioning" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-white">Provisioning de Tenants</h3>
                <p className="text-[11px] text-zinc-500">Crea y gestiona sub-tenants desde tu workspace principal</p>
              </div>

              {/* New Tenant Form */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
                <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5 text-violet-400" /> Crear Nuevo Tenant
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase mb-1 block">Nombre del Tenant</label>
                    <Input placeholder="Ej: Agencia Norte" className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-9" />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase mb-1 block">Slug (URL)</label>
                    <Input placeholder="agencia-norte" className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-9" />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase mb-1 block">Plan Asignado</label>
                    <select className="w-full h-9 rounded-md bg-white/[0.03] border border-white/[0.08] text-white text-xs px-3">
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase mb-1 block">Email Admin</label>
                    <Input placeholder="admin@agencia.com" className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-9" />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase mb-1 block">Max Usuarios</label>
                    <Input type="number" defaultValue={10} className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-9" />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase mb-1 block">Industria</label>
                    <select className="w-full h-9 rounded-md bg-white/[0.03] border border-white/[0.08] text-white text-xs px-3">
                      <option value="marketing">Marketing</option>
                      <option value="saas">SaaS</option>
                      <option value="ecommerce">E-Commerce</option>
                      <option value="consulting">Consultoría</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white text-xs"
                    onClick={() => toast.success("Tenant creado exitosamente")}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Crear Tenant
                  </Button>
                  <span className="text-[10px] text-zinc-500">Se creará con aislamiento completo de datos</span>
                </div>
              </div>

              {/* Existing Sub-Tenants */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <h4 className="text-xs font-semibold text-white mb-4 flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-sky-400" /> Sub-Tenants Activos
                </h4>
                <div className="space-y-3">
                  {[
                    { name: "Agencia Norte", slug: "agencia-norte", plan: "Pro", users: 8, status: "active", created: "2026-01-15" },
                    { name: "Startup Lab", slug: "startup-lab", plan: "Starter", users: 3, status: "active", created: "2026-02-20" },
                    { name: "Corp Solutions", slug: "corp-solutions", plan: "Enterprise", users: 25, status: "active", created: "2025-11-10" },
                  ].map(t => (
                    <div key={t.slug} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-violet-400" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-white">{t.name}</p>
                          <p className="text-[10px] text-zinc-500">{t.slug} · {t.users} usuarios · Creado {new Date(t.created).toLocaleDateString("es")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="text-[9px] bg-violet-500/10 text-violet-400">{t.plan}</Badge>
                        <Badge className="text-[9px] bg-emerald-500/10 text-emerald-400">Activo</Badge>
                        <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-white h-7 w-7 p-0">
                          <Settings className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Provisioning Automation */}
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.03] p-4">
                <div className="flex items-start gap-3">
                  <BarChart3 className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-sky-300">Auto-Provisioning via API</p>
                    <p className="text-[10px] text-sky-400/60 mt-1">
                      Usa el endpoint <code className="bg-white/5 px-1 rounded text-sky-300">POST /api/v1/tenant/provision</code> para crear tenants programáticamente con webhooks de onboarding automático.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ WHITE-LABEL TAB ═══ */}
          {activeTab === "whitelabel" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-white">Configuración White-Label</h3>
                <p className="text-[11px] text-zinc-500">Personaliza la apariencia de la plataforma para tu marca</p>
              </div>

              {/* Branding */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
                <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5 text-rose-400" /> Branding
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase mb-1 block">Logo URL</label>
                    <Input placeholder="https://tu-dominio.com/logo.svg" defaultValue={settings?.logo_url || ""}
                      className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-9" />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase mb-1 block">Favicon URL</label>
                    <Input placeholder="https://tu-dominio.com/favicon.ico"
                      className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-9" />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase mb-1 block">Nombre de Marca</label>
                    <Input placeholder="Tu Marca SaaS" className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-9" />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase mb-1 block">Tagline</label>
                    <Input placeholder="La plataforma todo-en-uno" className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-9" />
                  </div>
                </div>

                {/* Color Palette */}
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase mb-2 block">Paleta de Colores</label>
                  <div className="flex gap-3">
                    {[
                      { label: "Primario", color: "#8B5CF6" },
                      { label: "Secundario", color: "#06B6D4" },
                      { label: "Acento", color: "#F59E0B" },
                      { label: "Fondo", color: "#0A0B0F" },
                      { label: "Texto", color: "#FFFFFF" },
                    ].map(c => (
                      <div key={c.label} className="text-center">
                        <div className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer hover:scale-110 transition-transform"
                          style={{ backgroundColor: c.color }} />
                        <p className="text-[9px] text-zinc-500 mt-1">{c.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Custom Domain */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
                <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-sky-400" /> Dominio Personalizado
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase mb-1 block">Dominio Principal</label>
                    <Input placeholder="app.tu-marca.com" defaultValue={settings?.domain || ""}
                      className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-9" />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase mb-1 block">Estado SSL</label>
                    <div className="flex items-center gap-2 h-9">
                      <Badge className="text-[9px] bg-emerald-500/10 text-emerald-400">
                        <Lock className="w-3 h-3 mr-1" /> SSL Activo
                      </Badge>
                      <span className="text-[10px] text-zinc-500">Auto-renovación habilitada</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                  <p className="text-[10px] text-zinc-400 mb-2">Configuración DNS requerida:</p>
                  <div className="space-y-1 font-mono text-[10px]">
                    <div className="flex gap-4 text-zinc-500">
                      <span className="text-sky-400 w-14">CNAME</span>
                      <span className="text-white/60">app.tu-marca.com</span>
                      <span className="text-zinc-600">→</span>
                      <span className="text-emerald-400">proxy.nelvyon.com</span>
                    </div>
                    <div className="flex gap-4 text-zinc-500">
                      <span className="text-sky-400 w-14">TXT</span>
                      <span className="text-white/60">_nelvyon-verify</span>
                      <span className="text-zinc-600">→</span>
                      <span className="text-amber-400">nv_verify_abc123</span>
                    </div>
                  </div>
                </div>
                <Button size="sm" className="bg-sky-600 hover:bg-sky-500 text-white text-xs"
                  onClick={() => toast.success("Verificación de dominio iniciada")}>
                  <Globe className="w-3.5 h-3.5 mr-1" /> Verificar Dominio
                </Button>
              </div>

              {/* Email White-Label */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
                <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-amber-400" /> Emails White-Label
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase mb-1 block">Remitente (From)</label>
                    <Input placeholder="noreply@tu-marca.com" className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-9" />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase mb-1 block">Reply-To</label>
                    <Input placeholder="soporte@tu-marca.com" className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-9" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs text-white/60">Ocultar branding "Powered by NELVYON"</span>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white text-xs"
                onClick={() => toast.success("Configuración white-label guardada")}>
                <Save className="w-3.5 h-3.5 mr-1" /> Guardar White-Label
              </Button>
            </div>
          )}

          {/* ═══ BACKUP TAB ═══ */}
          {activeTab === "backup" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-white">Backup y Restauración</h3>
                <p className="text-[11px] text-zinc-500">Gestiona copias de seguridad automáticas y manuales de tu tenant</p>
              </div>

              {/* Backup Status */}
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-300">Backup Automático Activo</p>
                    <p className="text-[10px] text-emerald-400/60">Último backup: hace 4 horas · Próximo: en 20 horas</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 text-xs"
                  onClick={() => toast.success("Backup manual iniciado...")}>
                  <HardDrive className="w-3.5 h-3.5 mr-1" /> Backup Ahora
                </Button>
              </div>

              {/* Backup Schedule */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
                <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-sky-400" /> Programación
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase mb-1 block">Frecuencia</label>
                    <select className="w-full h-9 rounded-md bg-white/[0.03] border border-white/[0.08] text-white text-xs px-3">
                      <option value="daily">Diario</option>
                      <option value="weekly">Semanal</option>
                      <option value="hourly">Cada hora</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase mb-1 block">Retención</label>
                    <select className="w-full h-9 rounded-md bg-white/[0.03] border border-white/[0.08] text-white text-xs px-3">
                      <option value="7">7 días</option>
                      <option value="30">30 días</option>
                      <option value="90">90 días</option>
                      <option value="365">1 año</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase mb-1 block">Hora Preferida</label>
                    <Input type="time" defaultValue="03:00" className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-9" />
                  </div>
                </div>
              </div>

              {/* Backup History */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <h4 className="text-xs font-semibold text-white mb-4 flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-violet-400" /> Historial de Backups
                </h4>
                <div className="space-y-2">
                  {[
                    { id: "bk_001", date: "2026-04-12 03:00", size: "245 MB", type: "auto", status: "completed", tables: 18 },
                    { id: "bk_002", date: "2026-04-11 03:00", size: "242 MB", type: "auto", status: "completed", tables: 18 },
                    { id: "bk_003", date: "2026-04-10 14:32", size: "240 MB", type: "manual", status: "completed", tables: 18 },
                    { id: "bk_004", date: "2026-04-10 03:00", size: "238 MB", type: "auto", status: "completed", tables: 18 },
                    { id: "bk_005", date: "2026-04-09 03:00", size: "235 MB", type: "auto", status: "completed", tables: 17 },
                  ].map(bk => (
                    <div key={bk.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-2 h-2 rounded-full",
                          bk.status === "completed" ? "bg-emerald-400" : "bg-amber-400"
                        )} />
                        <div>
                          <p className="text-xs text-white font-mono">{bk.id}</p>
                          <p className="text-[10px] text-zinc-500">{bk.date} · {bk.size} · {bk.tables} tablas</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={cn("text-[9px]",
                          bk.type === "auto" ? "bg-sky-500/10 text-sky-400" : "bg-amber-500/10 text-amber-400"
                        )}>
                          {bk.type === "auto" ? "Auto" : "Manual"}
                        </Badge>
                        <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-sky-400 h-7 text-[10px]"
                          onClick={() => toast.info("Descargando backup...")}>
                          <Download className="w-3 h-3 mr-1" /> Descargar
                        </Button>
                        <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-amber-400 h-7 text-[10px]"
                          onClick={() => toast.info("Restauración iniciada...")}>
                          <RefreshCw className="w-3 h-3 mr-1" /> Restaurar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="rounded-xl border border-red-500/20 bg-red-500/[0.03] p-5 space-y-3">
                <h4 className="text-xs font-semibold text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5" /> Zona de Peligro
                </h4>
                <p className="text-[10px] text-red-400/60">
                  Restaurar un backup reemplazará todos los datos actuales del tenant. Esta acción no se puede deshacer.
                </p>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" className="border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs"
                    onClick={() => toast.error("Funcionalidad protegida — requiere confirmación de super admin")}>
                    <Trash2 className="w-3 h-3 mr-1" /> Purgar Datos del Tenant
                  </Button>
                  <span className="text-[10px] text-red-400/40">Requiere autenticación 2FA</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </SaasLayout>
  );
}