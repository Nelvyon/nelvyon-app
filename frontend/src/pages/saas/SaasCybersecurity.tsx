/**
 * SaasCybersecurity — Enterprise Security Center
 * SSO/SAML/OIDC config, session management, IP allowlist, 2FA enforcement, security events.
 */
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SaasLayout from "@/components/SaasLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SkeletonCardGrid } from "@/components/SkeletonCards";
import {
  Shield, RefreshCw, AlertTriangle, CheckCircle2, Lock, Eye,
  Activity, Clock, XCircle, ShieldCheck, Globe, Key, Users,
  Monitor, Smartphone, MapPin, LogOut, Plus, Trash2, Settings,
  Fingerprint, Scan, Wifi, WifiOff, FileText, Download, Loader2,
  ShieldAlert, ShieldOff, UserX, Laptop, ChevronDown, ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ── Types ── */
interface SecurityEvent {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  status: "detected" | "investigating" | "mitigated" | "resolved";
  message: string;
  source_ip: string;
  user_email: string | null;
  timestamp: string;
  details?: string;
}

interface ActiveSession {
  id: string;
  user_email: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  started_at: string;
  last_active: string;
  is_current: boolean;
  risk_level: "low" | "medium" | "high";
}

interface SSOConfig {
  provider: "saml" | "oidc" | "google" | "microsoft" | "none";
  enabled: boolean;
  entity_id: string;
  sso_url: string;
  certificate: string;
  auto_provision: boolean;
  default_role: string;
  allowed_domains: string[];
}

interface IPRule {
  id: string;
  type: "allow" | "block";
  ip: string;
  label: string;
  created_at: string;
}

/* ── Severity Config ── */
const severityConfig: Record<string, { color: string; label: string }> = {
  critical: { color: "bg-red-500/10 text-red-400 border-red-500/20", label: "Crítico" },
  high: { color: "bg-orange-500/10 text-orange-400 border-orange-500/20", label: "Alto" },
  medium: { color: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "Medio" },
  low: { color: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "Bajo" },
  info: { color: "bg-slate-500/10 text-slate-400 border-slate-500/20", label: "Info" },
};

const statusConfig: Record<string, { color: string; label: string }> = {
  detected: { color: "bg-red-500/10 text-red-400", label: "Detectado" },
  investigating: { color: "bg-amber-500/10 text-amber-400", label: "Investigando" },
  mitigated: { color: "bg-emerald-500/10 text-emerald-400", label: "Mitigado" },
  resolved: { color: "bg-slate-500/10 text-slate-400", label: "Resuelto" },
};

/* ── Mock Data ── */
function generateMockEvents(): SecurityEvent[] {
  return [
    { id: "se1", type: "brute_force", severity: "critical", status: "mitigated", message: "Ataque de fuerza bruta detectado — 50 intentos fallidos desde 185.220.101.x", source_ip: "185.220.101.42", user_email: null, timestamp: "2026-04-12T06:30:00Z", details: "IP bloqueada automáticamente por 24h" },
    { id: "se2", type: "suspicious_login", severity: "high", status: "investigating", message: "Login desde ubicación inusual: Moscú, RU para admin@nelvyon.com", source_ip: "95.142.47.12", user_email: "admin@nelvyon.com", timestamp: "2026-04-12T04:15:00Z" },
    { id: "se3", type: "permission_escalation", severity: "medium", status: "detected", message: "Intento de escalación de permisos: user editor intentó acceder a /admin", source_ip: "192.168.1.50", user_email: "editor@nelvyon.com", timestamp: "2026-04-11T22:00:00Z" },
    { id: "se4", type: "api_abuse", severity: "high", status: "mitigated", message: "Rate limit excedido: 15,000 requests en 1 hora desde API key nv_live_sk_a1b2", source_ip: "203.0.113.15", user_email: null, timestamp: "2026-04-11T18:30:00Z", details: "API key temporalmente suspendida" },
    { id: "se5", type: "new_device", severity: "low", status: "resolved", message: "Nuevo dispositivo detectado para maria@nelvyon.com: iPhone 16 Pro", source_ip: "88.12.34.56", user_email: "maria@nelvyon.com", timestamp: "2026-04-11T14:00:00Z" },
    { id: "se6", type: "2fa_disabled", severity: "medium", status: "resolved", message: "2FA desactivado por usuario: carlos@nelvyon.com", source_ip: "192.168.1.25", user_email: "carlos@nelvyon.com", timestamp: "2026-04-11T10:30:00Z" },
    { id: "se7", type: "data_export", severity: "info", status: "resolved", message: "Exportación masiva de datos: 5,000 contactos exportados por admin", source_ip: "192.168.1.10", user_email: "admin@nelvyon.com", timestamp: "2026-04-10T16:00:00Z" },
  ];
}

function generateMockSessions(): ActiveSession[] {
  return [
    { id: "s1", user_email: "admin@nelvyon.com", device: "MacBook Pro", browser: "Chrome 124", ip: "192.168.1.10", location: "Madrid, ES", started_at: "2026-04-12T08:00:00Z", last_active: "2026-04-12T09:45:00Z", is_current: true, risk_level: "low" },
    { id: "s2", user_email: "admin@nelvyon.com", device: "iPhone 15 Pro", browser: "Safari Mobile", ip: "88.12.34.56", location: "Madrid, ES", started_at: "2026-04-12T07:30:00Z", last_active: "2026-04-12T09:30:00Z", is_current: false, risk_level: "low" },
    { id: "s3", user_email: "maria@nelvyon.com", device: "Windows PC", browser: "Edge 124", ip: "192.168.1.25", location: "Barcelona, ES", started_at: "2026-04-12T09:00:00Z", last_active: "2026-04-12T09:40:00Z", is_current: false, risk_level: "low" },
    { id: "s4", user_email: "carlos@nelvyon.com", device: "Linux Desktop", browser: "Firefox 126", ip: "95.142.47.12", location: "Moscú, RU", started_at: "2026-04-12T04:15:00Z", last_active: "2026-04-12T04:20:00Z", is_current: false, risk_level: "high" },
  ];
}

function generateMockIPRules(): IPRule[] {
  return [
    { id: "ip1", type: "allow", ip: "192.168.1.0/24", label: "Oficina Madrid", created_at: "2026-01-15T10:00:00Z" },
    { id: "ip2", type: "allow", ip: "10.0.0.0/8", label: "VPN Corporativa", created_at: "2026-02-01T12:00:00Z" },
    { id: "ip3", type: "block", ip: "185.220.101.0/24", label: "Tor Exit Node (auto-blocked)", created_at: "2026-04-12T06:30:00Z" },
    { id: "ip4", type: "block", ip: "95.142.47.0/24", label: "Suspicious RU range", created_at: "2026-04-12T04:30:00Z" },
  ];
}

/* ── Component ── */
export default function SaasCybersecurity() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"overview" | "sso" | "sessions" | "firewall" | "events">("overview");
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [ipRules, setIpRules] = useState<IPRule[]>([]);
  const [ssoConfig, setSsoConfig] = useState<SSOConfig>({
    provider: "none", enabled: false, entity_id: "", sso_url: "", certificate: "",
    auto_provision: false, default_role: "user", allowed_domains: ["nelvyon.com"],
  });

  // 2FA Policy
  const [enforce2FA, setEnforce2FA] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(480); // minutes
  const [maxSessions, setMaxSessions] = useState(5);
  const [passwordMinLength, setPasswordMinLength] = useState(12);
  const [requireSpecialChars, setRequireSpecialChars] = useState(true);

  // IP form
  const [newIPType, setNewIPType] = useState<"allow" | "block">("allow");
  const [newIP, setNewIP] = useState("");
  const [newIPLabel, setNewIPLabel] = useState("");
  const [showAddIP, setShowAddIP] = useState(false);

  // SSO form
  const [ssoProvider, setSsoProvider] = useState<SSOConfig["provider"]>("none");
  const [ssoEntityId, setSsoEntityId] = useState("");
  const [ssoUrl, setSsoUrl] = useState("");
  const [ssoCert, setSsoCert] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/saas");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setEvents(generateMockEvents());
      setSessions(generateMockSessions());
      setIpRules(generateMockIPRules());
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const formatDate = (d?: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const handleForceLogout = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    toast.success("Sesión cerrada forzosamente");
  };

  const handleForceLogoutAll = () => {
    setSessions(prev => prev.filter(s => s.is_current));
    toast.success("Todas las sesiones remotas cerradas");
  };

  const handleAddIPRule = () => {
    if (!newIP.trim()) { toast.error("IP requerida"); return; }
    const rule: IPRule = {
      id: `ip_${Date.now()}`, type: newIPType, ip: newIP, label: newIPLabel || newIP,
      created_at: new Date().toISOString(),
    };
    setIpRules(prev => [rule, ...prev]);
    setNewIP("");
    setNewIPLabel("");
    setShowAddIP(false);
    toast.success(`Regla ${newIPType === "allow" ? "permitir" : "bloquear"} añadida`);
  };

  const handleDeleteIPRule = (id: string) => {
    setIpRules(prev => prev.filter(r => r.id !== id));
    toast.success("Regla eliminada");
  };

  const handleSaveSSO = () => {
    setSsoConfig({
      provider: ssoProvider, enabled: ssoProvider !== "none",
      entity_id: ssoEntityId, sso_url: ssoUrl, certificate: ssoCert,
      auto_provision: true, default_role: "user", allowed_domains: ["nelvyon.com"],
    });
    toast.success("Configuración SSO guardada");
  };

  const criticalCount = events.filter(e => e.severity === "critical" || e.severity === "high").length;
  const activeSessions = sessions.length;
  const riskySessions = sessions.filter(s => s.risk_level === "high").length;

  const tabs = [
    { id: "overview" as const, label: "Resumen", icon: Shield },
    { id: "sso" as const, label: "SSO / SAML", icon: Key },
    { id: "sessions" as const, label: "Sesiones", icon: Monitor },
    { id: "firewall" as const, label: "Firewall IP", icon: Globe },
    { id: "events" as const, label: "Eventos", icon: Activity },
  ];

  if (authLoading) return <SaasLayout><SkeletonCardGrid count={4} /></SaasLayout>;

  return (
    <SaasLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" /> Centro de Seguridad
            </h1>
            <p className="text-xs text-white/40 mt-1">SSO, sesiones, firewall IP, políticas de seguridad y eventos</p>
          </div>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] animate-pulse">
                <AlertTriangle className="w-3 h-3 mr-1" /> {criticalCount} alertas críticas
              </Badge>
            )}
            <Badge className={cn("text-[10px] border",
              riskySessions > 0 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            )}>
              {riskySessions > 0 ? `${riskySessions} sesiones sospechosas` : "Sin riesgos activos"}
            </Badge>
          </div>
        </div>

        {/* Security Score */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Score Seguridad", value: enforce2FA ? "92/100" : "68/100", icon: Shield, color: enforce2FA ? "text-emerald-400" : "text-amber-400" },
            { label: "Sesiones Activas", value: activeSessions, icon: Monitor, color: "text-sky-400" },
            { label: "Eventos Críticos", value: criticalCount, icon: AlertTriangle, color: criticalCount > 0 ? "text-red-400" : "text-emerald-400" },
            { label: "Reglas Firewall", value: ipRules.length, icon: Globe, color: "text-violet-400" },
            { label: "SSO", value: ssoConfig.enabled ? "Activo" : "Inactivo", icon: Key, color: ssoConfig.enabled ? "text-emerald-400" : "text-zinc-400" },
          ].map(stat => (
            <div key={stat.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
                <span className="text-[10px] text-white/40 uppercase">{stat.label}</span>
              </div>
              <p className="text-lg font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/[0.03] rounded-lg p-1 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap",
                activeTab === tab.id ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60")}>
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          ))}
        </div>

        {loading ? <SkeletonCardGrid count={3} /> : (
          <>
            {/* ═══ OVERVIEW TAB ═══ */}
            {activeTab === "overview" && (
              <div className="space-y-4">
                {/* Security Policies */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                    <Lock className="w-4 h-4 text-sky-400" /> Políticas de Seguridad
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between bg-white/[0.02] rounded-lg p-3">
                      <div>
                        <p className="text-xs font-medium text-white flex items-center gap-2">
                          <Fingerprint className="w-3.5 h-3.5 text-emerald-400" /> Forzar 2FA para todos
                        </p>
                        <p className="text-[10px] text-white/30 mt-0.5">Todos los usuarios deben tener 2FA activo</p>
                      </div>
                      <Switch checked={enforce2FA} onCheckedChange={setEnforce2FA} />
                    </div>
                    <div className="flex items-center justify-between bg-white/[0.02] rounded-lg p-3">
                      <div>
                        <p className="text-xs font-medium text-white flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-violet-400" /> Caracteres Especiales
                        </p>
                        <p className="text-[10px] text-white/30 mt-0.5">Requerir !@#$% en contraseñas</p>
                      </div>
                      <Switch checked={requireSpecialChars} onCheckedChange={setRequireSpecialChars} />
                    </div>
                    <div className="bg-white/[0.02] rounded-lg p-3">
                      <p className="text-xs font-medium text-white flex items-center gap-2 mb-2">
                        <Clock className="w-3.5 h-3.5 text-amber-400" /> Timeout de Sesión
                      </p>
                      <div className="flex gap-2">
                        {[60, 240, 480, 1440].map(mins => (
                          <button key={mins} onClick={() => setSessionTimeout(mins)}
                            className={cn("px-3 py-1.5 rounded-md text-[11px] transition-all",
                              sessionTimeout === mins ? "bg-amber-600 text-white" : "bg-white/5 text-white/40 hover:text-white/60")}>
                            {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white/[0.02] rounded-lg p-3">
                      <p className="text-xs font-medium text-white flex items-center gap-2 mb-2">
                        <Users className="w-3.5 h-3.5 text-sky-400" /> Max Sesiones Simultáneas
                      </p>
                      <div className="flex gap-2">
                        {[1, 3, 5, 10].map(n => (
                          <button key={n} onClick={() => setMaxSessions(n)}
                            className={cn("px-3 py-1.5 rounded-md text-[11px] transition-all",
                              maxSessions === n ? "bg-sky-600 text-white" : "bg-white/5 text-white/40 hover:text-white/60")}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white/[0.02] rounded-lg p-3">
                      <p className="text-xs font-medium text-white flex items-center gap-2 mb-2">
                        <Key className="w-3.5 h-3.5 text-rose-400" /> Longitud Mínima Contraseña
                      </p>
                      <div className="flex gap-2">
                        {[8, 10, 12, 16].map(n => (
                          <button key={n} onClick={() => setPasswordMinLength(n)}
                            className={cn("px-3 py-1.5 rounded-md text-[11px] transition-all",
                              passwordMinLength === n ? "bg-rose-600 text-white" : "bg-white/5 text-white/40 hover:text-white/60")}>
                            {n} chars
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Critical Events */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-4 h-4 text-red-400" /> Eventos Recientes Críticos
                  </h3>
                  <div className="space-y-2">
                    {events.filter(e => e.severity === "critical" || e.severity === "high").slice(0, 4).map(ev => (
                      <div key={ev.id} className="flex items-start gap-3 bg-white/[0.02] rounded-lg p-3">
                        <span className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0",
                          ev.severity === "critical" ? "bg-red-400 animate-pulse" : "bg-orange-400")} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white/80">{ev.message}</p>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-white/30">
                            <span>{formatDate(ev.timestamp)}</span>
                            <span>IP: {ev.source_ip}</span>
                            <Badge className={cn("text-[9px] border", statusConfig[ev.status]?.color)}>{statusConfig[ev.status]?.label}</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ SSO TAB ═══ */}
            {activeTab === "sso" && (
              <div className="space-y-4">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                    <Key className="w-4 h-4 text-violet-400" /> Configuración SSO / SAML / OIDC
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] text-white/40 uppercase mb-2 block">Proveedor de Identidad</label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {([
                          { id: "none" as const, label: "Ninguno", icon: ShieldOff },
                          { id: "saml" as const, label: "SAML 2.0", icon: Shield },
                          { id: "oidc" as const, label: "OpenID Connect", icon: Key },
                          { id: "google" as const, label: "Google Workspace", icon: Globe },
                          { id: "microsoft" as const, label: "Azure AD", icon: Monitor },
                        ]).map(p => (
                          <button key={p.id} onClick={() => setSsoProvider(p.id)}
                            className={cn("flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                              ssoProvider === p.id
                                ? "bg-violet-500/10 border-violet-500/30 text-violet-300"
                                : "bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white/60")}>
                            <p.icon className="w-5 h-5" />
                            <span className="text-[11px] font-medium">{p.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {ssoProvider !== "none" && (
                      <div className="space-y-3 border-t border-white/[0.06] pt-4">
                        {(ssoProvider === "saml" || ssoProvider === "oidc") && (
                          <>
                            <div>
                              <label className="text-[10px] text-white/40 uppercase mb-1 block">
                                {ssoProvider === "saml" ? "Entity ID / Issuer" : "Client ID"}
                              </label>
                              <Input value={ssoEntityId} onChange={e => setSsoEntityId(e.target.value)}
                                placeholder={ssoProvider === "saml" ? "https://idp.example.com/entity" : "your-client-id"}
                                className="bg-white/5 border-white/10 text-white text-xs font-mono" />
                            </div>
                            <div>
                              <label className="text-[10px] text-white/40 uppercase mb-1 block">
                                {ssoProvider === "saml" ? "SSO URL (IdP)" : "Authorization URL"}
                              </label>
                              <Input value={ssoUrl} onChange={e => setSsoUrl(e.target.value)}
                                placeholder={ssoProvider === "saml" ? "https://idp.example.com/sso" : "https://auth.example.com/authorize"}
                                className="bg-white/5 border-white/10 text-white text-xs font-mono" />
                            </div>
                            <div>
                              <label className="text-[10px] text-white/40 uppercase mb-1 block">
                                {ssoProvider === "saml" ? "Certificado X.509" : "Client Secret"}
                              </label>
                              <Input value={ssoCert} onChange={e => setSsoCert(e.target.value)} type="password"
                                placeholder="••••••••••••••••"
                                className="bg-white/5 border-white/10 text-white text-xs font-mono" />
                            </div>
                          </>
                        )}
                        {(ssoProvider === "google" || ssoProvider === "microsoft") && (
                          <div className="bg-white/[0.02] rounded-lg p-4">
                            <p className="text-xs text-white/60">
                              {ssoProvider === "google"
                                ? "Configura Google Workspace SSO desde la consola de administración de Google. Necesitarás el Client ID y Secret de tu proyecto en Google Cloud Console."
                                : "Configura Azure AD SSO desde el portal de Azure. Registra una aplicación en Azure AD y configura los redirect URIs."}
                            </p>
                            <div className="mt-3 space-y-2">
                              <div>
                                <label className="text-[10px] text-white/40 uppercase mb-1 block">Client ID</label>
                                <Input value={ssoEntityId} onChange={e => setSsoEntityId(e.target.value)}
                                  placeholder="your-client-id" className="bg-white/5 border-white/10 text-white text-xs font-mono" />
                              </div>
                              <div>
                                <label className="text-[10px] text-white/40 uppercase mb-1 block">Client Secret</label>
                                <Input value={ssoCert} onChange={e => setSsoCert(e.target.value)} type="password"
                                  placeholder="••••••••••••••••" className="bg-white/5 border-white/10 text-white text-xs font-mono" />
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-4 bg-white/[0.02] rounded-lg p-3">
                          <p className="text-xs text-white/60">Callback URL (copia en tu IdP):</p>
                          <code className="text-[11px] font-mono text-sky-300 bg-sky-500/10 px-2 py-1 rounded">
                            https://app.nelvyon.com/auth/sso/callback
                          </code>
                        </div>
                        <div className="flex justify-end">
                          <Button onClick={handleSaveSSO} className="bg-violet-600 hover:bg-violet-500 text-white text-xs">
                            <Shield className="w-3.5 h-3.5 mr-1" /> Guardar Configuración SSO
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ SESSIONS TAB ═══ */}
            {activeTab === "sessions" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-white/50">{sessions.length} sesiones activas</p>
                  <Button onClick={handleForceLogoutAll} variant="ghost" size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs">
                    <LogOut className="w-3.5 h-3.5 mr-1" /> Cerrar Todas las Remotas
                  </Button>
                </div>
                <div className="space-y-3">
                  {sessions.map(session => (
                    <div key={session.id} className={cn(
                      "bg-white/[0.03] border rounded-xl p-4 transition-all",
                      session.risk_level === "high" ? "border-red-500/20" : "border-white/[0.06]",
                      session.is_current && "ring-1 ring-sky-500/30"
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center",
                            session.device.includes("iPhone") || session.device.includes("Android")
                              ? "bg-violet-500/10" : "bg-sky-500/10")}>
                            {session.device.includes("iPhone") || session.device.includes("Android")
                              ? <Smartphone className="w-5 h-5 text-violet-400" />
                              : <Laptop className="w-5 h-5 text-sky-400" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-white">{session.device}</p>
                              {session.is_current && <Badge className="bg-sky-500/10 text-sky-400 text-[9px]">Sesión Actual</Badge>}
                              {session.risk_level === "high" && (
                                <Badge className="bg-red-500/10 text-red-400 text-[9px] animate-pulse border border-red-500/20">
                                  <AlertTriangle className="w-3 h-3 mr-1" /> Alto Riesgo
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-white/40">{session.user_email} · {session.browser}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right text-[10px]">
                            <p className="text-white/50 flex items-center gap-1"><MapPin className="w-3 h-3" /> {session.location}</p>
                            <p className="text-white/30">IP: {session.ip}</p>
                            <p className="text-white/30">Última actividad: {formatDate(session.last_active)}</p>
                          </div>
                          {!session.is_current && (
                            <Button variant="ghost" size="sm" onClick={() => handleForceLogout(session.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                              <LogOut className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ FIREWALL TAB ═══ */}
            {activeTab === "firewall" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-white/50">Controla qué IPs pueden acceder a la plataforma</p>
                  <Button onClick={() => setShowAddIP(!showAddIP)} size="sm"
                    className="bg-sky-600 hover:bg-sky-500 text-white text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Nueva Regla
                  </Button>
                </div>

                {showAddIP && (
                  <div className="bg-white/[0.04] border border-sky-500/20 rounded-xl p-4 space-y-3">
                    <div className="flex gap-2 mb-2">
                      <button onClick={() => setNewIPType("allow")}
                        className={cn("px-3 py-1.5 rounded-md text-xs transition-all",
                          newIPType === "allow" ? "bg-emerald-600 text-white" : "bg-white/5 text-white/40")}>
                        ✓ Permitir
                      </button>
                      <button onClick={() => setNewIPType("block")}
                        className={cn("px-3 py-1.5 rounded-md text-xs transition-all",
                          newIPType === "block" ? "bg-red-600 text-white" : "bg-white/5 text-white/40")}>
                        ✗ Bloquear
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input value={newIP} onChange={e => setNewIP(e.target.value)}
                        placeholder="192.168.1.0/24" className="bg-white/5 border-white/10 text-white text-xs font-mono" />
                      <Input value={newIPLabel} onChange={e => setNewIPLabel(e.target.value)}
                        placeholder="Etiqueta (opcional)" className="bg-white/5 border-white/10 text-white text-xs" />
                      <Button onClick={handleAddIPRule} className="bg-sky-600 hover:bg-sky-500 text-white text-xs">
                        <Plus className="w-3.5 h-3.5 mr-1" /> Añadir
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Allow Rules */}
                  <div className="bg-white/[0.03] border border-emerald-500/10 rounded-xl p-4">
                    <h4 className="text-xs font-semibold text-emerald-400 flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Permitidas ({ipRules.filter(r => r.type === "allow").length})
                    </h4>
                    <div className="space-y-2">
                      {ipRules.filter(r => r.type === "allow").map(rule => (
                        <div key={rule.id} className="flex items-center justify-between bg-white/[0.02] rounded-lg p-2.5">
                          <div>
                            <code className="text-[11px] font-mono text-emerald-300">{rule.ip}</code>
                            <p className="text-[10px] text-white/30">{rule.label}</p>
                          </div>
                          <button onClick={() => handleDeleteIPRule(rule.id)} className="text-white/20 hover:text-red-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Block Rules */}
                  <div className="bg-white/[0.03] border border-red-500/10 rounded-xl p-4">
                    <h4 className="text-xs font-semibold text-red-400 flex items-center gap-2 mb-3">
                      <XCircle className="w-3.5 h-3.5" /> Bloqueadas ({ipRules.filter(r => r.type === "block").length})
                    </h4>
                    <div className="space-y-2">
                      {ipRules.filter(r => r.type === "block").map(rule => (
                        <div key={rule.id} className="flex items-center justify-between bg-white/[0.02] rounded-lg p-2.5">
                          <div>
                            <code className="text-[11px] font-mono text-red-300">{rule.ip}</code>
                            <p className="text-[10px] text-white/30">{rule.label}</p>
                          </div>
                          <button onClick={() => handleDeleteIPRule(rule.id)} className="text-white/20 hover:text-red-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ EVENTS TAB ═══ */}
            {activeTab === "events" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-white/50">{events.length} eventos de seguridad</p>
                  <Button variant="ghost" size="sm" className="text-white/40 text-xs"
                    onClick={() => toast.success("Exportando eventos...")}>
                    <Download className="w-3.5 h-3.5 mr-1" /> Exportar
                  </Button>
                </div>
                <div className="space-y-2">
                  {events.map(ev => (
                    <div key={ev.id} className={cn(
                      "bg-white/[0.03] border rounded-xl p-4 transition-all",
                      ev.severity === "critical" ? "border-red-500/20" : "border-white/[0.06]"
                    )}>
                      <div className="flex items-start gap-3">
                        <span className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0",
                          ev.severity === "critical" ? "bg-red-400 animate-pulse" :
                          ev.severity === "high" ? "bg-orange-400" :
                          ev.severity === "medium" ? "bg-amber-400" :
                          ev.severity === "low" ? "bg-blue-400" : "bg-slate-400")} />
                        <div className="flex-1">
                          <p className="text-xs text-white/80">{ev.message}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-white/30">
                            <Badge className={cn("text-[9px] border", severityConfig[ev.severity]?.color)}>{severityConfig[ev.severity]?.label}</Badge>
                            <Badge className={cn("text-[9px]", statusConfig[ev.status]?.color)}>{statusConfig[ev.status]?.label}</Badge>
                            <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {ev.source_ip}</span>
                            {ev.user_email && <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {ev.user_email}</span>}
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(ev.timestamp)}</span>
                          </div>
                          {ev.details && (
                            <p className="text-[10px] text-white/40 mt-2 bg-white/[0.02] rounded px-2 py-1">{ev.details}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </SaasLayout>
  );
}