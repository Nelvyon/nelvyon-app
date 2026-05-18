import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SaasLayout from "@/components/SaasLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Crown, Users, KeyRound, Copy, Check, Plus, Trash2,
  Shield, Ban, CheckCircle2, Mail, Clock, Zap, AlertTriangle,
  UserPlus, RefreshCw, ChevronDown, Database, Activity, Settings,
  FileText, Eye, Search, Edit, Save, X, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  PLANS,
  type PlanId,
  type UserRole,
  type Invitation,
  type ManagedUser,
  getPlanBadgeStyle,
} from "@/lib/plans";
import { api, type SecurityEvent } from "@/lib/api";

type TabKey = "overview" | "users" | "invitations" | "create" | "audit";

interface BackendStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalRoles: number;
  platformMetrics: number;
  recentEvents: Array<{ type: string; detail: string; time: string }>;
}

export default function SaasAdminPanel() {
  const { ts } = useI18n();
  const {
    user, loading: authLoading, isSuperAdmin,
    createInvitation, getInvitations, getManagedUsers,
    suspendUser, activateUser, changeUserPlan, deleteUser,
  } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendConnected, setBackendConnected] = useState(false);

  // Create form
  const [newEmail, setNewEmail] = useState("");
  const [newPlan, setNewPlan] = useState<PlanId>("starter");
  const [newRole, setNewRole] = useState<UserRole>("user");

  // Backend data
  const [stats, setStats] = useState<BackendStats>({
    totalUsers: 0, activeSubscriptions: 0, totalRoles: 0,
    platformMetrics: 0, recentEvents: [],
  });
  const [userRoles, setUserRoles] = useState<Array<Record<string, unknown>>>([]);
  const [subscriptions, setSubscriptions] = useState<Array<Record<string, unknown>>>([]);

  // Audit log
  const [auditEvents, setAuditEvents] = useState<SecurityEvent[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditFilter, setAuditFilter] = useState<string>("all");

  // Inline edit
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [editRoleData, setEditRoleData] = useState({ role: "", plan_id: "", status: "" });
  const [savingRole, setSavingRole] = useState(false);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setInvitations(getInvitations());
    setManagedUsers(getManagedUsers());

    try {
      const [rolesRes, subsRes, metricsRes] = await Promise.allSettled([
        api.getUserRoles(0, 200),
        api.getSubscriptions(0, 200),
        api.getPlatformMetrics(0, 50),
      ]);

      const roles = rolesRes.status === "fulfilled" ? rolesRes.value.items || [] : [];
      const subs = subsRes.status === "fulfilled" ? subsRes.value.items || [] : [];
      const metrics = metricsRes.status === "fulfilled" ? metricsRes.value.items || [] : [];

      setUserRoles(roles);
      setSubscriptions(subs);

      const activeSubs = subs.filter((s) => (s.status as string) === "active").length;

      const events: BackendStats["recentEvents"] = [];
      roles.slice(0, 3).forEach((r) => {
        events.push({
          type: "role",
          detail: `Rol ${(r.role as string) || "user"} asignado a usuario`,
          time: (r.created_at as string) || "",
        });
      });
      subs.slice(0, 3).forEach((s) => {
        events.push({
          type: "subscription",
          detail: `Suscripción ${(s.plan_id as string) || "plan"} — ${(s.status as string) || "unknown"}`,
          time: (s.created_at as string) || "",
        });
      });

      setStats({
        totalUsers: roles.length,
        activeSubscriptions: activeSubs,
        totalRoles: roles.length,
        platformMetrics: metrics.length,
        recentEvents: events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 6),
      });

      if (roles.length > 0 || subs.length > 0 || metrics.length > 0) {
        setBackendConnected(true);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[SaasAdminPanel] Backend error:", err);
    } finally {
      setLoading(false);
    }
  }, [getInvitations, getManagedUsers]);

  const fetchAuditLog = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await api.getSecurityEvents(0, 200);
      setAuditEvents(res.items || []);
    } catch {
      // silent
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && (!user || !isSuperAdmin)) {
      navigate("/saas/dashboard");
    }
  }, [user, authLoading, isSuperAdmin, navigate]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (activeTab === "audit") fetchAuditLog();
  }, [activeTab, fetchAuditLog]);

  const handleCreateInvite = async () => {
    if (!newEmail.trim() || !newEmail.includes("@")) {
      toast.error("Introduce un email válido");
      return;
    }
    const invite = createInvitation(newEmail.trim(), newPlan, newRole);
    try {
      await api.createUserRole({
        email: newEmail.trim(),
        role: newRole,
        plan_id: newPlan,
        status: "invited",
      });
      // Log audit event
      try {
        await api.createSecurityEvent({
          event_type: "invitation_created",
          severity: "info",
          source: "admin_panel",
          description: `Invitación creada para ${newEmail.trim()} — Plan: ${newPlan}, Rol: ${newRole}`,
          status: "logged",
        });
      } catch { /* non-critical */ }
      toast.success("Invitación creada y sincronizada con backend");
    } catch {
      toast.success("Invitación creada (solo local)");
    }
    setNewEmail("");
    setNewPlan("starter");
    setNewRole("user");
    refreshData();
    if (invite) void invite;
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Código copiado");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSuspend = async (uid: string) => {
    suspendUser(uid);
    try {
      const role = userRoles.find((r) => (r.user_id as string) === uid);
      if (role) await api.updateUserRole(role.id as number, { status: "suspended" });
      await api.createSecurityEvent({
        event_type: "user_suspended", severity: "warning", source: "admin_panel",
        description: `Usuario ${uid.slice(0, 12)}… suspendido`, status: "logged",
      }).catch(() => {});
    } catch { /* local fallback */ }
    toast.success("Usuario suspendido");
    refreshData();
  };

  const handleActivate = async (uid: string) => {
    activateUser(uid);
    try {
      const role = userRoles.find((r) => (r.user_id as string) === uid);
      if (role) await api.updateUserRole(role.id as number, { status: "active" });
      await api.createSecurityEvent({
        event_type: "user_activated", severity: "info", source: "admin_panel",
        description: `Usuario ${uid.slice(0, 12)}… activado`, status: "logged",
      }).catch(() => {});
    } catch { /* local fallback */ }
    toast.success("Usuario activado");
    refreshData();
  };

  const handleChangePlan = async (uid: string, plan: PlanId) => {
    changeUserPlan(uid, plan);
    try {
      const role = userRoles.find((r) => (r.user_id as string) === uid);
      if (role) await api.updateUserRole(role.id as number, { plan_id: plan });
      await api.createSecurityEvent({
        event_type: "plan_changed", severity: "info", source: "admin_panel",
        description: `Plan cambiado a ${plan} para usuario ${uid.slice(0, 12)}…`, status: "logged",
      }).catch(() => {});
    } catch { /* local fallback */ }
    toast.success(`Plan cambiado a ${plan}`);
    refreshData();
  };

  const handleDeleteUser = async (uid: string) => {
    deleteUser(uid);
    try {
      const role = userRoles.find((r) => (r.user_id as string) === uid);
      if (role) await api.deleteUserRole(role.id as number);
      await api.createSecurityEvent({
        event_type: "user_deleted", severity: "warning", source: "admin_panel",
        description: `Usuario ${uid.slice(0, 12)}… eliminado`, status: "logged",
      }).catch(() => {});
    } catch { /* local fallback */ }
    toast.success("Usuario eliminado");
    refreshData();
  };

  const handleInlineRoleEdit = (r: Record<string, unknown>) => {
    setEditingRoleId(r.id as number);
    setEditRoleData({
      role: (r.role as string) || "user",
      plan_id: (r.plan_id as string) || "starter",
      status: (r.status as string) || "active",
    });
  };

  const handleSaveInlineRole = async () => {
    if (!editingRoleId) return;
    setSavingRole(true);
    try {
      await api.updateUserRole(editingRoleId, editRoleData);
      toast.success("Rol actualizado");
      setEditingRoleId(null);
      refreshData();
    } catch {
      toast.error("Error actualizando rol");
    } finally {
      setSavingRole(false);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const severityConfig: Record<string, { color: string; icon: typeof Shield }> = {
    critical: { color: "text-red-400 bg-red-500/10", icon: AlertTriangle },
    warning: { color: "text-amber-400 bg-amber-500/10", icon: AlertTriangle },
    info: { color: "text-blue-400 bg-blue-500/10", icon: Activity },
    low: { color: "text-slate-400 bg-slate-500/10", icon: Shield },
  };

  const filteredAudit = auditEvents.filter((ev) => {
    const matchSearch = !auditSearch ||
      (ev.description || "").toLowerCase().includes(auditSearch.toLowerCase()) ||
      ev.event_type.toLowerCase().includes(auditSearch.toLowerCase());
    const matchFilter = auditFilter === "all" || ev.severity === auditFilter;
    return matchSearch && matchFilter;
  });

  const tabs: { key: TabKey; label: string; icon: typeof Users }[] = [
    { key: "overview", label: "Panel General", icon: Activity },
    { key: "users", label: "Usuarios", icon: Users },
    { key: "invitations", label: "Invitaciones", icon: Mail },
    { key: "create", label: "Crear Invitación", icon: UserPlus },
    { key: "audit", label: "Audit Log", icon: FileText },
  ];

  if (authLoading || !user) return null;

  return (
    <SaasLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Crown className="w-6 h-6 text-amber-400" /> Panel de Administración
            </h1>
            <p className="text-sm text-slate-400 mt-1">Gestión completa de usuarios, roles, suscripciones y auditoría</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
              backendConnected
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
            )}>
              <Database className="w-3 h-3" />
              {backendConnected ? "PostgreSQL conectado" : "Solo datos locales"}
            </div>
            <Button size="sm" variant="outline" onClick={refreshData} className="border-white/10 text-slate-300 hover:bg-white/5">
              <RefreshCw className={cn("w-4 h-4 mr-1", loading && "animate-spin")} /> Actualizar
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#12141A] rounded-xl p-1 border border-white/[0.06] overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                activeTab === t.key
                  ? "bg-violet-600/20 text-violet-300 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Usuarios Registrados", value: stats.totalUsers, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
                { label: "Suscripciones Activas", value: stats.activeSubscriptions, icon: Crown, color: "text-amber-400", bg: "bg-amber-500/10" },
                { label: "Roles Asignados", value: stats.totalRoles, icon: Shield, color: "text-violet-400", bg: "bg-violet-500/10" },
                { label: "Métricas Plataforma", value: stats.platformMetrics, icon: Activity, color: "text-emerald-400", bg: "bg-emerald-500/10" },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-[#12141A] border border-white/[0.06] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-400 uppercase tracking-wider">{kpi.label}</span>
                    <div className={cn("p-2 rounded-lg", kpi.bg)}>
                      <kpi.icon className={cn("w-4 h-4", kpi.color)} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white">{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Subscriptions Table */}
            <div className="bg-[#12141A] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">Suscripciones (Backend)</h3>
                <span className="text-xs text-slate-500 ml-auto">{subscriptions.length} registros</span>
              </div>
              {subscriptions.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  Sin suscripciones en backend — los datos aparecerán cuando los usuarios se suscriban
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">Plan</th>
                        <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">Ciclo</th>
                        <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">Estado</th>
                        <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">Monto</th>
                        <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscriptions.slice(0, 10).map((s, i) => (
                        <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-white font-medium">{(s.plan_id as string) || "—"}</td>
                          <td className="px-4 py-3 text-slate-300">{(s.billing_cycle as string) || "—"}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-xs font-medium",
                              (s.status as string) === "active" ? "bg-emerald-500/10 text-emerald-400" :
                              (s.status as string) === "pending" ? "bg-amber-500/10 text-amber-400" :
                              "bg-slate-500/10 text-slate-400"
                            )}>
                              {(s.status as string) || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white">
                            {s.amount_paid != null ? `€${Number(s.amount_paid).toFixed(2)}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-xs">{formatDate((s.created_at as string) || "")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* User Roles Table with inline edit */}
            <div className="bg-[#12141A] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
                <Shield className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-semibold text-white">Roles de Usuario (Backend)</h3>
                <span className="text-xs text-slate-500 ml-auto">{userRoles.length} registros</span>
              </div>
              {userRoles.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  Sin roles en backend — se crearán al invitar usuarios
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">User ID</th>
                        <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">Rol</th>
                        <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">Plan</th>
                        <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">Estado</th>
                        <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">Creado</th>
                        <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userRoles.slice(0, 15).map((r) => {
                        const isEditing = editingRoleId === (r.id as number);
                        return (
                          <tr key={r.id as number} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                            <td className="px-4 py-3 text-slate-300 font-mono text-xs">{((r.user_id as string) || (r.email as string) || "—").slice(0, 16)}…</td>
                            <td className="px-4 py-3">
                              {isEditing ? (
                                <select value={editRoleData.role} onChange={(e) => setEditRoleData(d => ({ ...d, role: e.target.value }))}
                                  className="bg-[#0A0C10] border border-white/10 rounded px-2 py-1 text-xs text-white">
                                  <option value="user">user</option>
                                  <option value="admin">admin</option>
                                  <option value="super_admin">super_admin</option>
                                </select>
                              ) : (
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-xs font-medium",
                                  (r.role as string) === "super_admin" ? "bg-amber-500/10 text-amber-400" :
                                  (r.role as string) === "admin" ? "bg-violet-500/10 text-violet-400" :
                                  "bg-blue-500/10 text-blue-400"
                                )}>
                                  {(r.role as string) || "user"}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {isEditing ? (
                                <select value={editRoleData.plan_id} onChange={(e) => setEditRoleData(d => ({ ...d, plan_id: e.target.value }))}
                                  className="bg-[#0A0C10] border border-white/10 rounded px-2 py-1 text-xs text-white">
                                  {Object.keys(PLANS).map(k => <option key={k} value={k}>{k}</option>)}
                                </select>
                              ) : (
                                <span className="text-white">{(r.plan_id as string) || "—"}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {isEditing ? (
                                <select value={editRoleData.status} onChange={(e) => setEditRoleData(d => ({ ...d, status: e.target.value }))}
                                  className="bg-[#0A0C10] border border-white/10 rounded px-2 py-1 text-xs text-white">
                                  <option value="active">active</option>
                                  <option value="suspended">suspended</option>
                                  <option value="invited">invited</option>
                                </select>
                              ) : (
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-xs",
                                  (r.status as string) === "active" ? "bg-emerald-500/10 text-emerald-400" :
                                  (r.status as string) === "suspended" ? "bg-red-500/10 text-red-400" :
                                  "bg-slate-500/10 text-slate-400"
                                )}>
                                  {(r.status as string) || "—"}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-400 text-xs">{formatDate((r.created_at as string) || "")}</td>
                            <td className="px-4 py-3">
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <Button size="sm" variant="ghost" onClick={handleSaveInlineRole} disabled={savingRole}
                                    className="h-7 w-7 p-0 text-emerald-400 hover:text-emerald-300">
                                    {savingRole ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingRoleId(null)}
                                    className="h-7 w-7 p-0 text-slate-400 hover:text-white">
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ) : (
                                <Button size="sm" variant="ghost" onClick={() => handleInlineRoleEdit(r)}
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-white">
                                  <Edit className="w-3 h-3" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent Events */}
            {stats.recentEvents.length > 0 && (
              <div className="bg-[#12141A] border border-white/[0.06] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" /> Actividad Reciente (Backend)
                </h3>
                <div className="space-y-3">
                  {stats.recentEvents.map((ev, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <div className={cn("w-2 h-2 rounded-full",
                        ev.type === "role" ? "bg-violet-400" : "bg-amber-400")} />
                      <span className="text-slate-300 flex-1">{ev.detail}</span>
                      <span className="text-xs text-slate-500">{formatDate(ev.time)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="bg-[#12141A] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white">Usuarios Gestionados</h3>
            </div>
            {managedUsers.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No hay usuarios gestionados aún</p>
                <p className="text-xs mt-1">Crea invitaciones para añadir usuarios</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {managedUsers.map((mu) => (
                  <div key={mu.uid} className="px-5 py-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                      {mu.email[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{mu.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn("px-2 py-0.5 rounded text-xs font-medium", getPlanBadgeStyle(mu.plan))}>
                          {PLANS[mu.plan]?.name || mu.plan}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs",
                          mu.status === "active" ? "bg-emerald-500/10 text-emerald-400" :
                          mu.status === "suspended" ? "bg-red-500/10 text-red-400" :
                          "bg-slate-500/10 text-slate-400"
                        )}>
                          {mu.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select value={mu.plan} onChange={(e) => handleChangePlan(mu.uid, e.target.value as PlanId)}
                        className="bg-[#0A0C10] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white">
                        {Object.entries(PLANS).map(([k, v]) => (
                          <option key={k} value={k}>{v.name}</option>
                        ))}
                      </select>
                      {mu.status === "active" ? (
                        <Button size="sm" variant="outline" onClick={() => handleSuspend(mu.uid)}
                          className="border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs">
                          <Ban className="w-3 h-3 mr-1" /> Suspender
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleActivate(mu.uid)}
                          className="border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Activar
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleDeleteUser(mu.uid)}
                        className="border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Invitations Tab */}
        {activeTab === "invitations" && (
          <div className="bg-[#12141A] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white">Invitaciones Enviadas</h3>
            </div>
            {invitations.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No hay invitaciones aún</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {invitations.map((inv) => (
                  <div key={inv.code} className="px-5 py-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium">{inv.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn("px-2 py-0.5 rounded text-xs font-medium", getPlanBadgeStyle(inv.plan))}>
                          {PLANS[inv.plan]?.name}
                        </span>
                        <span className="text-xs text-slate-500">{inv.role}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs",
                          inv.used ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                        )}>
                          {inv.used ? "Usado" : "Pendiente"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-[#0A0C10] px-3 py-1.5 rounded-lg text-violet-300 font-mono border border-white/[0.06]">
                        {inv.code}
                      </code>
                      <Button size="sm" variant="ghost" onClick={() => handleCopyCode(inv.code)}
                        className="text-slate-400 hover:text-white">
                        {copiedCode === inv.code ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Invitation Tab */}
        {activeTab === "create" && (
          <div className="bg-[#12141A] border border-white/[0.06] rounded-xl p-6 max-w-lg">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-violet-400" /> Nueva Invitación
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Email del cliente</label>
                <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="cliente@empresa.com" className="bg-[#0A0C10] border-white/10 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Plan</label>
                  <select value={newPlan} onChange={(e) => setNewPlan(e.target.value as PlanId)}
                    className="w-full bg-[#0A0C10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    {Object.entries(PLANS).map(([k, v]) => (
                      <option key={k} value={k}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Rol</label>
                  <select value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full bg-[#0A0C10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="user">Usuario</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
              </div>
              <Button onClick={handleCreateInvite} className="w-full bg-violet-600 hover:bg-violet-700 text-white">
                <Plus className="w-4 h-4 mr-2" /> Crear Invitación
              </Button>
            </div>
          </div>
        )}

        {/* Audit Log Tab */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input value={auditSearch} onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Buscar eventos..." className="pl-9 bg-[#12141A] border-white/10 text-white" />
              </div>
              <div className="flex gap-1">
                {["all", "critical", "warning", "info", "low"].map((s) => (
                  <button key={s} onClick={() => setAuditFilter(s)}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                      auditFilter === s ? "bg-violet-600/20 text-violet-300" : "text-slate-400 hover:text-white hover:bg-white/5")}>
                    {s === "all" ? "Todos" : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              <Button size="sm" variant="outline" onClick={fetchAuditLog} className="border-white/10 text-slate-300 hover:bg-white/5">
                <RefreshCw className={cn("w-4 h-4 mr-1", auditLoading && "animate-spin")} /> Actualizar
              </Button>
            </div>

            <div className="bg-[#12141A] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">Registro de Auditoría</h3>
                <span className="text-xs text-slate-500 ml-auto">{filteredAudit.length} eventos</span>
              </div>
              {auditLoading ? (
                <div className="p-12 text-center">
                  <Loader2 className="w-6 h-6 text-violet-400 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Cargando eventos...</p>
                </div>
              ) : filteredAudit.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Sin eventos de auditoría</p>
                  <p className="text-xs mt-1">Los eventos se registran automáticamente con cada acción administrativa</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {filteredAudit.map((ev) => {
                    const sev = severityConfig[ev.severity || "info"] || severityConfig.info;
                    const SevIcon = sev.icon;
                    return (
                      <div key={ev.id} className="px-5 py-3 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-start gap-3">
                          <div className={cn("p-1.5 rounded-lg mt-0.5", sev.color.split(" ")[1])}>
                            <SevIcon className={cn("w-3.5 h-3.5", sev.color.split(" ")[0])} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm text-white font-medium">{ev.event_type.replace(/_/g, " ")}</span>
                              <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-medium uppercase", sev.color)}>
                                {ev.severity}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">{ev.description || "—"}</p>
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                              {ev.source && <span>📍 {ev.source}</span>}
                              <span>{formatDate(ev.created_at || "")}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </SaasLayout>
  );
}