import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useRBAC } from "@/contexts/RBACContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Shield, User, Bell, Palette,
  Key, Lock, Smartphone,
  RotateCcw, Download, Upload, Sparkles, Check, Crown, Loader2,
  ScrollText, UserCog, Building2, Globe, AlertTriangle, Users,
  ChevronRight, Search, Filter
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  THEME_PRESETS,
  COLOR_CATEGORIES,
  COLOR_LABELS,
  type NelvyonTheme,
} from "@/lib/theme-engine";
import { toast } from "sonner";
import { api, type AuditLogEntry, type PlatformSettings, type RBACAssignment, type RoleDefinitionResponse } from "@/lib/api";
import { type Role, getRoleLabel, getRoleColor } from "@/lib/rbac";

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-500/20 text-red-300 border-red-500/30",
  admin: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  manager: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  user: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  viewer: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
};

const SEVERITY_COLORS: Record<string, string> = {
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
};

interface UserSettingsData {
  id?: number;
  display_name: string;
  role: string;
  two_fa_enabled: boolean;
  notification_new_clients: boolean;
  notification_qa_complete: boolean;
  notification_deploys: boolean;
  notification_errors: boolean;
  notification_weekly_email: boolean;
  theme_id: string;
  custom_theme_json: string;
}

const defaultSettings: UserSettingsData = {
  display_name: "",
  role: "Administrador",
  two_fa_enabled: false,
  notification_new_clients: true,
  notification_qa_complete: true,
  notification_deploys: true,
  notification_errors: true,
  notification_weekly_email: false,
  theme_id: "nelvyon-default",
  custom_theme_json: "{}",
};

const tabs = [
  { id: "profile", label: "Perfil", icon: User },
  { id: "security", label: "Seguridad", icon: Shield },
  { id: "notifications", label: "Notificaciones", icon: Bell },
  { id: "appearance", label: "Personalización", icon: Palette },
  { id: "platform", label: "Plataforma", icon: Building2 },
  { id: "rbac", label: "RBAC", icon: Users },
  { id: "audit", label: "Audit Log", icon: ScrollText },
];

export default function Settings() {
  const { ts } = useI18n();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { currentTheme, setTheme, setThemeById, updateColor, resetTheme, colors } = useTheme();
  const { role, can, isAtLeast, roleLabel, roleColorClass } = useRBAC();

  const [activeTab, setActiveTab] = useState("profile");
  const [settings, setSettings] = useState<UserSettingsData>(defaultSettings);
  const [settingsId, setSettingsId] = useState<number | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileName, setProfileName] = useState("");

  // Audit log state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilter, setAuditFilter] = useState<{ source?: string; severity?: string }>({});
  const [auditTotal, setAuditTotal] = useState(0);

  // Platform settings state
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [platformLoading, setPlatformLoading] = useState(false);
  const [platformSaving, setPlatformSaving] = useState(false);

  // RBAC state
  const [roleDefinitions, setRoleDefinitions] = useState<RoleDefinitionResponse[]>([]);
  const [assignments, setAssignments] = useState<RBACAssignment[]>([]);
  const [rbacLoading, setRbacLoading] = useState(false);

  // Permissions based on real RBAC
  const canEditProfile = isAtLeast("user");
  const canEditSecurity = isAtLeast("admin");
  const canEditNotifications = isAtLeast("user");
  const canEditTheme = isAtLeast("user");
  const canViewLogs = isAtLeast("manager");
  const canManagePlatform = isAtLeast("admin");
  const canManageRBAC = can("users:manage_roles");

  // ─── Audit helper ───
  const logAudit = useCallback(async (eventType: string, description: string, source = "settings", severity = "info") => {
    try {
      await api.createAuditEntry({
        event_type: eventType,
        severity,
        source,
        description,
        details_json: JSON.stringify({ tab: activeTab, role }),
      });
    } catch {
      // Silent fail for audit logging
    }
  }, [activeTab, role]);

  useEffect(() => {
    if (!loading && !user) navigate("/");
  }, [user, loading, navigate]);

  // ─── Load user settings ───
  const loadSettings = useCallback(async () => {
    try {
      setLoadingSettings(true);
      const res = await api.getUserSettings(0, 10);
      if (res.items && res.items.length > 0) {
        const s = res.items[0] as Record<string, unknown>;
        setSettingsId(s.id as number);
        setSettings({
          id: s.id as number,
          display_name: (s.display_name as string) || "",
          role: (s.role as string) || "Administrador",
          two_fa_enabled: (s.two_fa_enabled as boolean) ?? false,
          notification_new_clients: (s.notification_new_clients as boolean) ?? true,
          notification_qa_complete: (s.notification_qa_complete as boolean) ?? true,
          notification_deploys: (s.notification_deploys as boolean) ?? true,
          notification_errors: (s.notification_errors as boolean) ?? true,
          notification_weekly_email: (s.notification_weekly_email as boolean) ?? false,
          theme_id: (s.theme_id as string) || "nelvyon-default",
          custom_theme_json: (s.custom_theme_json as string) || "{}",
        });
        setProfileName((s.display_name as string) || user?.name || "");
      } else {
        setProfileName(user?.name || "");
        const created = await api.createUserSettings({
          display_name: user?.name || "",
          role: "Administrador",
          two_fa_enabled: false,
          notification_new_clients: true,
          notification_qa_complete: true,
          notification_deploys: true,
          notification_errors: true,
          notification_weekly_email: false,
          theme_id: currentTheme.id,
          custom_theme_json: JSON.stringify(currentTheme),
        });
        setSettingsId(created.id as number);
      }
    } catch {
      setProfileName(user?.name || "");
    } finally {
      setLoadingSettings(false);
    }
  }, [user, currentTheme]);

  useEffect(() => {
    if (user) loadSettings();
  }, [user, loadSettings]);

  // ─── Load audit logs ───
  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await api.getAuditLogs({ ...auditFilter, skip: 0, limit: 100 });
      setAuditLogs(res.items || []);
      setAuditTotal(res.total || 0);
    } catch {
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  }, [auditFilter]);

  useEffect(() => {
    if (activeTab === "audit" && canViewLogs) loadAuditLogs();
  }, [activeTab, canViewLogs, loadAuditLogs]);

  // ─── Load platform settings ───
  const loadPlatformSettings = useCallback(async () => {
    setPlatformLoading(true);
    try {
      const res = await api.getPlatformSettings();
      setPlatformSettings(res);
    } catch {
      setPlatformSettings(null);
    } finally {
      setPlatformLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "platform") loadPlatformSettings();
  }, [activeTab, loadPlatformSettings]);

  // ─── Load RBAC data ───
  const loadRBACData = useCallback(async () => {
    setRbacLoading(true);
    try {
      const [defs, assigns] = await Promise.all([
        api.getRBACRoleDefinitions(),
        canManageRBAC ? api.getRBACAssignments(0, 100).catch(() => ({ items: [], total: 0 })) : Promise.resolve({ items: [] as RBACAssignment[], total: 0 }),
      ]);
      setRoleDefinitions(defs || []);
      setAssignments(assigns.items || []);
    } catch {
      setRoleDefinitions([]);
      setAssignments([]);
    } finally {
      setRbacLoading(false);
    }
  }, [canManageRBAC]);

  useEffect(() => {
    if (activeTab === "rbac") loadRBACData();
  }, [activeTab, loadRBACData]);

  // ─── Save helpers ───
  const saveSettings = async (partial: Partial<UserSettingsData>) => {
    if (!settingsId) return;
    setSaving(true);
    try {
      await api.updateUserSettings(settingsId, partial);
      setSettings((prev) => ({ ...prev, ...partial }));
      toast.success("Configuración guardada en el servidor");
    } catch {
      toast.error("Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!canEditProfile) { toast.error("Sin permisos para editar perfil"); return; }
    await logAudit("settings.profile_updated", `Nombre actualizado: ${profileName}`);
    await saveSettings({ display_name: profileName });
  };

  const toggleNotification = async (key: keyof UserSettingsData) => {
    if (!canEditNotifications) { toast.error("Sin permisos para editar notificaciones"); return; }
    const newVal = !settings[key];
    setSettings((prev) => ({ ...prev, [key]: newVal }));
    await logAudit("settings.notification_toggled", `${key}: ${newVal ? "activado" : "desactivado"}`);
    await saveSettings({ [key]: newVal });
  };

  const toggle2FA = async () => {
    if (!canEditSecurity) { toast.error("Sin permisos para editar seguridad"); return; }
    const newVal = !settings.two_fa_enabled;
    setSettings((prev) => ({ ...prev, two_fa_enabled: newVal }));
    await logAudit("settings.2fa_toggled", `2FA ${newVal ? "activado" : "desactivado"}`, "security", "warning");
    await saveSettings({ two_fa_enabled: newVal });
  };

  const handleExportTheme = () => {
    const blob = new Blob([JSON.stringify(currentTheme, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nelvyon-theme-${currentTheme.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    logAudit("settings.theme_exported", `Tema exportado: ${currentTheme.name}`);
    toast.success("Tema exportado correctamente");
  };

  const handleImportTheme = () => {
    if (!canEditTheme) { toast.error("Sin permisos para importar temas"); return; }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const theme = JSON.parse(ev.target?.result as string) as NelvyonTheme;
          if (theme.colors && theme.name) {
            setTheme(theme);
            saveSettings({ theme_id: theme.id, custom_theme_json: JSON.stringify(theme) });
            logAudit("settings.theme_imported", `Tema importado: ${theme.name}`);
            toast.success(`Tema "${theme.name}" importado correctamente`);
          } else {
            toast.error("Archivo de tema inválido");
          }
        } catch {
          toast.error("Error al leer el archivo");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleSetTheme = (themeId: string) => {
    if (!canEditTheme) { toast.error("Sin permisos para cambiar tema"); return; }
    setThemeById(themeId);
    logAudit("settings.theme_changed", `Tema aplicado: ${themeId}`);
    saveSettings({ theme_id: themeId });
    toast.success("Tema aplicado y guardado");
  };

  const handleSavePlatformSettings = async (updates: Partial<PlatformSettings>) => {
    if (!canManagePlatform) { toast.error("Solo administradores pueden cambiar la configuración de plataforma"); return; }
    setPlatformSaving(true);
    try {
      const res = await api.updatePlatformSettings(updates);
      setPlatformSettings(res);
      toast.success("Configuración de plataforma guardada");
    } catch {
      toast.error("Error al guardar configuración de plataforma");
    } finally {
      setPlatformSaving(false);
    }
  };

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };

  const notificationItems = [
    { key: "notification_new_clients" as const, label: "Nuevos clientes", desc: "Cuando un nuevo cliente se registra" },
    { key: "notification_qa_complete" as const, label: "QA completado", desc: "Cuando un output pasa el control de calidad" },
    { key: "notification_deploys" as const, label: "Deploys", desc: "Cuando el Hosting Agent completa un deploy" },
    { key: "notification_errors" as const, label: "Errores del sistema", desc: "Alertas de errores críticos" },
    { key: "notification_weekly_email" as const, label: "Email semanal", desc: "Resumen semanal por email" },
  ];

  return (
    <DashboardLayout title="Configuración" subtitle="Ajustes del sistema, seguridad, RBAC y personalización">
      {/* RBAC Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 rounded-xl bg-[#111113] border border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <UserCog className="w-4 h-4 text-violet-400" />
            <span className="text-xs text-zinc-400">Tu rol:</span>
            <Badge className={cn("text-[10px]", ROLE_COLORS[role] || "bg-zinc-500/20 text-zinc-300")}>
              {roleLabel || role}
            </Badge>
          </div>
          <div className="flex gap-1.5 ml-2">
            {[
              { label: "Perfil", ok: canEditProfile },
              { label: "Seguridad", ok: canEditSecurity },
              { label: "Notif.", ok: canEditNotifications },
              { label: "Tema", ok: canEditTheme },
              { label: "Plataforma", ok: canManagePlatform },
              { label: "RBAC", ok: canManageRBAC },
              { label: "Logs", ok: canViewLogs },
            ].map(({ label, ok }) => (
              <span key={label} className={cn(
                "text-[9px] px-1.5 py-0.5 rounded border",
                ok ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-zinc-800 text-zinc-600 border-zinc-700 line-through"
              )}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs */}
        <div className="w-full lg:w-[220px] shrink-0">
          <div className="rounded-xl bg-[#111113] border border-white/[0.06] p-2 space-y-1">
            {tabs.map((tab) => {
              // Hide tabs user can't access
              if (tab.id === "rbac" && !isAtLeast("manager")) return null;
              if (tab.id === "audit" && !canViewLogs) return null;
              if (tab.id === "platform" && !isAtLeast("manager")) return null;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    activeTab === tab.id
                      ? "bg-violet-600/15 text-violet-300 border border-violet-500/20"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="mt-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-medium">Backend conectado</span>
            </div>
            <p className="text-[9px] text-zinc-500 mt-1">RBAC + Audit persistidos en PostgreSQL</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 rounded-xl bg-[#111113] border border-white/[0.06] overflow-hidden">
          {loadingSettings && activeTab !== "audit" && activeTab !== "platform" && activeTab !== "rbac" ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
              <span className="ml-2 text-sm text-zinc-400">Cargando configuración del servidor...</span>
            </div>
          ) : (
            <>
              {/* ═══ PROFILE ═══ */}
              {activeTab === "profile" && (
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Perfil de Usuario</h3>
                    <p className="text-sm text-zinc-500">Gestiona tu información personal — persistida en el backend</p>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
                      style={{ background: `linear-gradient(135deg, ${colors.gradientStart}, ${colors.gradientEnd})` }}
                    >
                      {(profileName || user?.name)?.[0] || "N"}
                    </div>
                    <div>
                      <p className="text-base font-semibold text-white">{profileName || user?.name || "Operador"}</p>
                      <p className="text-sm text-zinc-500">{user?.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={cn("text-[10px]", ROLE_COLORS[role] || "bg-zinc-500/20 text-zinc-300")}>
                          {roleLabel || role}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Nombre</label>
                      <Input
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="bg-white/[0.04] border-white/[0.08] text-white"
                        disabled={!canEditProfile}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Email</label>
                      <Input defaultValue={user?.email || ""} className="bg-white/[0.04] border-white/[0.08] text-white" disabled />
                    </div>
                  </div>
                  {canEditProfile && (
                    <Button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="text-white"
                      style={{ background: `linear-gradient(135deg, ${colors.gradientStart}, ${colors.gradientEnd})` }}
                    >
                      {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</> : "Guardar Cambios"}
                    </Button>
                  )}
                </div>
              )}

              {/* ═══ SECURITY ═══ */}
              {activeTab === "security" && (
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Seguridad</h3>
                    <p className="text-sm text-zinc-500">Protege tu cuenta — estado persistido en backend</p>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-zinc-400" />
                        <div>
                          <p className="text-sm font-medium text-white">Contraseña</p>
                          <p className="text-xs text-zinc-500">Última actualización hace 30 días</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="border-white/10 text-zinc-400" disabled={!canEditSecurity}>Cambiar</Button>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-zinc-400" />
                        <div>
                          <p className="text-sm font-medium text-white">Autenticación 2FA</p>
                          <p className="text-xs text-zinc-500">{settings.two_fa_enabled ? "Activado" : "Desactivado"}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={toggle2FA}
                        disabled={!canEditSecurity}
                        variant={settings.two_fa_enabled ? "default" : "outline"}
                        className={settings.two_fa_enabled ? "bg-emerald-600 text-white" : "border-white/10 text-zinc-400"}
                      >
                        {settings.two_fa_enabled ? "Desactivar" : "Activar"}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <div className="flex items-center gap-3">
                        <Key className="w-5 h-5 text-zinc-400" />
                        <div>
                          <p className="text-sm font-medium text-white">API Keys</p>
                          <p className="text-xs text-zinc-500">2 claves activas</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="border-white/10 text-zinc-400" disabled={!canEditSecurity}>Gestionar</Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ NOTIFICATIONS ═══ */}
              {activeTab === "notifications" && (
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Notificaciones</h3>
                    <p className="text-sm text-zinc-500">Configura tus alertas — estado persistido en backend</p>
                  </div>
                  {notificationItems.map((n) => {
                    const enabled = settings[n.key] as boolean;
                    return (
                      <div key={n.key} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                        <div>
                          <p className="text-sm font-medium text-white">{n.label}</p>
                          <p className="text-xs text-zinc-500">{n.desc}</p>
                        </div>
                        <button
                          onClick={() => toggleNotification(n.key)}
                          disabled={!canEditNotifications}
                          className={cn(
                            "w-10 h-5 rounded-full transition-all relative",
                            enabled ? "bg-emerald-500" : "bg-zinc-700",
                            !canEditNotifications && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div
                            className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all"
                            style={{ left: enabled ? "calc(100% - 18px)" : "2px" }}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ═══ APPEARANCE ═══ */}
              {activeTab === "appearance" && (
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                        <Sparkles className="w-5 h-5" style={{ color: colors.primary }} />
                        Personalización Total
                      </h3>
                      <p className="text-sm text-zinc-500">Todos los colores del mundo para tu marca — OS y SaaS</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={handleImportTheme} disabled={!canEditTheme} className="border-white/10 text-zinc-400 h-8 text-xs">
                        <Upload className="w-3 h-3 mr-1" /> Importar
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleExportTheme} className="border-white/10 text-zinc-400 h-8 text-xs">
                        <Download className="w-3 h-3 mr-1" /> Exportar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { if (!canEditTheme) return; resetTheme(); logAudit("settings.theme_reset", "Tema reseteado a default"); saveSettings({ theme_id: "nelvyon-default" }); }} disabled={!canEditTheme} className="border-white/10 text-zinc-400 h-8 text-xs">
                        <RotateCcw className="w-3 h-3 mr-1" /> Reset
                      </Button>
                    </div>
                  </div>

                  {/* Current Theme */}
                  <div className="rounded-xl p-4" style={{ backgroundColor: hexToRgba(colors.primary, 0.05), border: `1px solid ${hexToRgba(colors.primary, 0.15)}` }}>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {[colors.primary, colors.secondary, colors.accent, colors.background].map((c, i) => (
                          <div key={i} className="w-6 h-6 rounded-md border border-white/10" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: colors.textPrimary }}>Tema actual: {currentTheme.name}</p>
                        <p className="text-[11px]" style={{ color: colors.textMuted }}>{currentTheme.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Theme Presets */}
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-3">Temas Predefinidos</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {THEME_PRESETS.map((theme) => (
                        <button
                          key={theme.id}
                          onClick={() => handleSetTheme(theme.id)}
                          disabled={!canEditTheme}
                          className={cn(
                            "rounded-xl p-3 border transition-all text-left",
                            currentTheme.id === theme.id
                              ? "ring-2 ring-offset-1 ring-offset-transparent"
                              : "hover:border-white/[0.15]",
                            !canEditTheme && "opacity-50 cursor-not-allowed"
                          )}
                          style={{
                            backgroundColor: theme.colors.card,
                            borderColor: currentTheme.id === theme.id ? theme.colors.primary : hexToRgba(theme.colors.textPrimary, 0.06),
                          }}
                        >
                          <div className="flex gap-1 mb-2">
                            {theme.preview.map((c, i) => (
                              <div key={i} className="w-5 h-5 rounded-md border border-white/10" style={{ backgroundColor: c }} />
                            ))}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {currentTheme.id === theme.id && <Check className="w-3 h-3" style={{ color: theme.colors.primary }} />}
                            <p className="text-[11px] font-semibold" style={{ color: theme.colors.textPrimary }}>{theme.name}</p>
                          </div>
                          <p className="text-[9px] mt-0.5" style={{ color: theme.colors.textMuted }}>{theme.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Color Pickers */}
                  {canEditTheme && (
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-400" />
                        Personalización Avanzada
                      </h4>
                      <p className="text-[11px] text-zinc-500 mb-4">Cambia cualquier color individualmente. Los cambios se aplican en tiempo real.</p>
                      <div className="space-y-5">
                        {COLOR_CATEGORIES.map((cat) => (
                          <div key={cat.label}>
                            <h5 className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">{cat.label}</h5>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                              {cat.keys.map((key) => {
                                const value = colors[key];
                                const isHex = typeof value === "string" && value.startsWith("#");
                                return (
                                  <div key={key} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                                    <div className="relative">
                                      <div className="w-8 h-8 rounded-lg border border-white/10 cursor-pointer" style={{ backgroundColor: value }} />
                                      {isHex && (
                                        <input
                                          type="color"
                                          value={value}
                                          onChange={(e) => updateColor(key, e.target.value)}
                                          className="absolute inset-0 opacity-0 cursor-pointer w-8 h-8"
                                        />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] font-medium text-white truncate">{COLOR_LABELS[key] || key}</p>
                                      <p className="text-[8px] text-zinc-600 font-mono truncate">{value}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ═══ PLATFORM SETTINGS ═══ */}
              {activeTab === "platform" && (
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-violet-400" />
                      Configuración de Plataforma
                    </h3>
                    <p className="text-sm text-zinc-500">Ajustes globales de la empresa — aplican a todo OS + SaaS</p>
                  </div>

                  {platformLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                      <span className="ml-2 text-sm text-zinc-400">Cargando configuración...</span>
                    </div>
                  ) : platformSettings ? (
                    <div className="space-y-4">
                      {/* Company */}
                      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 space-y-3">
                        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                          <Globe className="w-4 h-4 text-blue-400" /> Empresa
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-zinc-500 mb-1 block">Nombre de empresa</label>
                            <Input
                              value={platformSettings.company_name}
                              onChange={(e) => setPlatformSettings({ ...platformSettings, company_name: e.target.value })}
                              className="bg-white/[0.04] border-white/[0.08] text-white"
                              disabled={!canManagePlatform}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-zinc-500 mb-1 block">Zona horaria</label>
                            <Input
                              value={platformSettings.timezone}
                              onChange={(e) => setPlatformSettings({ ...platformSettings, timezone: e.target.value })}
                              className="bg-white/[0.04] border-white/[0.08] text-white"
                              disabled={!canManagePlatform}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-zinc-500 mb-1 block">Idioma</label>
                            <select
                              value={platformSettings.language}
                              onChange={(e) => setPlatformSettings({ ...platformSettings, language: e.target.value })}
                              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white"
                              disabled={!canManagePlatform}
                            >
                              <option value="es">Español</option>
                              <option value="en">English</option>
                              <option value="pt">Português</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-zinc-500 mb-1 block">Moneda</label>
                            <select
                              value={platformSettings.currency}
                              onChange={(e) => setPlatformSettings({ ...platformSettings, currency: e.target.value })}
                              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white"
                              disabled={!canManagePlatform}
                            >
                              <option value="MXN">MXN</option>
                              <option value="USD">USD</option>
                              <option value="EUR">EUR</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Security */}
                      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 space-y-3">
                        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                          <Shield className="w-4 h-4 text-amber-400" /> Seguridad Global
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                            <div>
                              <p className="text-xs font-medium text-white">Forzar 2FA</p>
                              <p className="text-[10px] text-zinc-500">Todos los usuarios deben tener 2FA</p>
                            </div>
                            <button
                              onClick={() => setPlatformSettings({ ...platformSettings, enforce_2fa: !platformSettings.enforce_2fa })}
                              disabled={!canManagePlatform}
                              className={cn(
                                "w-10 h-5 rounded-full transition-all relative",
                                platformSettings.enforce_2fa ? "bg-amber-500" : "bg-zinc-700",
                              )}
                            >
                              <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all"
                                style={{ left: platformSettings.enforce_2fa ? "calc(100% - 18px)" : "2px" }} />
                            </button>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                            <div>
                              <p className="text-xs font-medium text-white">Modo mantenimiento</p>
                              <p className="text-[10px] text-zinc-500">Bloquea acceso a usuarios no-admin</p>
                            </div>
                            <button
                              onClick={() => setPlatformSettings({ ...platformSettings, maintenance_mode: !platformSettings.maintenance_mode })}
                              disabled={!canManagePlatform}
                              className={cn(
                                "w-10 h-5 rounded-full transition-all relative",
                                platformSettings.maintenance_mode ? "bg-red-500" : "bg-zinc-700",
                              )}
                            >
                              <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all"
                                style={{ left: platformSettings.maintenance_mode ? "calc(100% - 18px)" : "2px" }} />
                            </button>
                          </div>
                          <div>
                            <label className="text-xs text-zinc-500 mb-1 block">Timeout de sesión (min)</label>
                            <Input
                              type="number"
                              value={platformSettings.session_timeout_minutes}
                              onChange={(e) => setPlatformSettings({ ...platformSettings, session_timeout_minutes: parseInt(e.target.value) || 480 })}
                              className="bg-white/[0.04] border-white/[0.08] text-white"
                              disabled={!canManagePlatform}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-zinc-500 mb-1 block">Rol por defecto (nuevos usuarios)</label>
                            <select
                              value={platformSettings.default_role_new_users}
                              onChange={(e) => setPlatformSettings({ ...platformSettings, default_role_new_users: e.target.value })}
                              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white"
                              disabled={!canManagePlatform}
                            >
                              <option value="viewer">Visor</option>
                              <option value="user">Usuario</option>
                              <option value="manager">Manager</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {canManagePlatform && (
                        <Button
                          onClick={() => handleSavePlatformSettings(platformSettings)}
                          disabled={platformSaving}
                          className="text-white"
                          style={{ background: `linear-gradient(135deg, ${colors.gradientStart}, ${colors.gradientEnd})` }}
                        >
                          {platformSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</> : "Guardar Configuración de Plataforma"}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">No se pudo cargar la configuración de plataforma.</p>
                  )}
                </div>
              )}

              {/* ═══ RBAC ═══ */}
              {activeTab === "rbac" && (
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                      <Users className="w-5 h-5 text-violet-400" />
                      Control de Acceso (RBAC)
                    </h3>
                    <p className="text-sm text-zinc-500">Roles, permisos y asignaciones — persistido en backend</p>
                  </div>

                  {rbacLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                    </div>
                  ) : (
                    <>
                      {/* Role Definitions */}
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-3">Jerarquía de Roles</h4>
                        <div className="space-y-2">
                          {roleDefinitions.map((def, i) => (
                            <div key={def.role} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                                style={{ background: `linear-gradient(135deg, ${colors.gradientStart}, ${colors.gradientEnd})`, opacity: 1 - i * 0.15 }}>
                                {def.level}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge className={cn("text-[10px]", ROLE_COLORS[def.role] || "bg-zinc-500/20 text-zinc-300")}>
                                    {def.label}
                                  </Badge>
                                  {role === def.role && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      Tu rol
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-zinc-500 mt-0.5">{def.description}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] text-zinc-500">{def.default_permissions.length} permisos</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Role Assignments */}
                      {canManageRBAC && assignments.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-white mb-3">Asignaciones Actuales</h4>
                          <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                            <div className="grid grid-cols-5 gap-2 px-4 py-2 bg-white/[0.02] text-[10px] text-zinc-500 font-semibold uppercase">
                              <span>Usuario</span>
                              <span>Email</span>
                              <span>Rol</span>
                              <span>Estado</span>
                              <span>Asignado</span>
                            </div>
                            {assignments.map((a) => (
                              <div key={a.id} className="grid grid-cols-5 gap-2 px-4 py-2.5 border-t border-white/[0.04] text-xs">
                                <span className="text-white truncate">{a.user_id.slice(0, 12)}...</span>
                                <span className="text-zinc-400 truncate">{a.email || "—"}</span>
                                <Badge className={cn("text-[9px] w-fit", ROLE_COLORS[a.role] || "bg-zinc-500/20 text-zinc-300")}>
                                  {a.role}
                                </Badge>
                                <span className={a.is_active ? "text-emerald-400" : "text-red-400"}>
                                  {a.is_active ? "Activo" : "Revocado"}
                                </span>
                                <span className="text-zinc-500">
                                  {a.created_at ? new Date(a.created_at).toLocaleDateString("es-ES") : "—"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ═══ AUDIT LOG ═══ */}
              {activeTab === "audit" && (
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                        <ScrollText className="w-5 h-5 text-violet-400" />
                        Audit Trail Unificado
                      </h3>
                      <p className="text-sm text-zinc-500">
                        Registro completo de acciones críticas — {auditTotal} eventos
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={loadAuditLogs}
                      disabled={auditLoading}
                      className="border-white/10 text-zinc-400 h-8 text-xs"
                    >
                      {auditLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                      <span className="ml-1">Refrescar</span>
                    </Button>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={auditFilter.source || ""}
                      onChange={(e) => setAuditFilter(prev => ({ ...prev, source: e.target.value || undefined }))}
                      className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white"
                    >
                      <option value="">Todos los módulos</option>
                      <option value="settings">Settings</option>
                      <option value="rbac">RBAC</option>
                      <option value="security">Security</option>
                      <option value="contracts">Contracts</option>
                      <option value="platform">Platform</option>
                      <option value="e2e">E2E</option>
                    </select>
                    <select
                      value={auditFilter.severity || ""}
                      onChange={(e) => setAuditFilter(prev => ({ ...prev, severity: e.target.value || undefined }))}
                      className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white"
                    >
                      <option value="">Todas las severidades</option>
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  {/* Log entries */}
                  {auditLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <ScrollText className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                      <p className="text-sm text-zinc-500">Sin registros de auditoría</p>
                      <p className="text-xs text-zinc-600 mt-1">Los eventos se registran automáticamente al realizar acciones</p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                      <div className="max-h-[500px] overflow-y-auto divide-y divide-white/[0.03]">
                        {auditLogs.map((entry) => (
                          <div key={entry.id} className="px-4 py-3 hover:bg-white/[0.02] transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-zinc-600 w-36 shrink-0">
                                {entry.created_at ? new Date(entry.created_at).toLocaleString("es-ES") : "—"}
                              </span>
                              <Badge className={cn("text-[9px]", SEVERITY_COLORS[entry.severity || "info"])}>
                                {entry.severity || "info"}
                              </Badge>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20">
                                {entry.source || "platform"}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-blue-500/10 text-blue-400">
                                {entry.event_type}
                              </span>
                              <span className="text-xs text-zinc-400 truncate flex-1">{entry.description}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}