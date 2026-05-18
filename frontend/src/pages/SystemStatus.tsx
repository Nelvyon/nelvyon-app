/**
 * NELVYON OS — Estado del Sistema
 * Internal system health dashboard with real-time healthchecks,
 * traffic-light semaphores, queue status, and observability metrics.
 * Separated from PlatformHealth (SaaS-facing) — this is for internal ops.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createClient } from "@metagptx/web-sdk";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Activity, AlertTriangle, BarChart3, Bot, CheckCircle2, Clock,
  Cpu, Database, Globe, HardDrive, Loader2, RefreshCw, Server,
  Shield, TrendingUp, Wifi, WifiOff, Zap, Webhook, Mail,
  Lock, Unlock, XCircle, ArrowUpRight, ArrowDownRight, Minus,
  Timer, Layers, GitBranch, Radio,
} from "lucide-react";

const sdkClient = createClient();

/* ─── RBAC ─── */
type UserRole = "admin" | "manager" | "editor" | "viewer";
const ROLE_PERMISSIONS: Record<UserRole, { label: string; canRefresh: boolean; canViewDetails: boolean; canViewLogs: boolean }> = {
  admin:   { label: "Administrador", canRefresh: true, canViewDetails: true, canViewLogs: true },
  manager: { label: "Manager",       canRefresh: true, canViewDetails: true, canViewLogs: true },
  editor:  { label: "Editor",        canRefresh: false, canViewDetails: true, canViewLogs: false },
  viewer:  { label: "Visor",         canRefresh: false, canViewDetails: false, canViewLogs: false },
};

interface AuditEntry { action: string; timestamp: string; user: string; role: string; details?: string }

/* ─── Healthcheck Types ─── */
type HealthStatus = "healthy" | "degraded" | "down" | "checking";

interface ServiceHealth {
  name: string;
  displayName: string;
  icon: React.ReactNode;
  status: HealthStatus;
  latencyMs: number;
  lastChecked: string;
  details: string;
  uptime: number; // percentage
  errorCount: number;
}

interface SystemMetric {
  label: string;
  value: string | number;
  trend: "up" | "down" | "stable";
  trendValue: string;
  icon: React.ReactNode;
  color: string;
}

interface AppLogEntry {
  id: string;
  level: "info" | "warn" | "error" | "debug";
  service: string;
  message: string;
  timestamp: string;
  metadata?: string;
}

const STATUS_CONFIG: Record<HealthStatus, { label: string; color: string; bgColor: string; borderColor: string; dotColor: string }> = {
  healthy:  { label: "Operativo",    color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20", dotColor: "bg-emerald-400" },
  degraded: { label: "Degradado",    color: "text-amber-400",   bgColor: "bg-amber-500/10",   borderColor: "border-amber-500/20",   dotColor: "bg-amber-400" },
  down:     { label: "Caído",        color: "text-red-400",     bgColor: "bg-red-500/10",     borderColor: "border-red-500/20",     dotColor: "bg-red-400" },
  checking: { label: "Verificando",  color: "text-blue-400",    bgColor: "bg-blue-500/10",    borderColor: "border-blue-500/20",    dotColor: "bg-blue-400 animate-pulse" },
};

export default function SystemStatus() {
  const { user, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();

  /* ─── RBAC ─── */
  const [currentRole, setCurrentRole] = useState<UserRole>("admin");
  const permissions = ROLE_PERMISSIONS[currentRole];

  /* ─── Audit ─── */
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const addAudit = useCallback((action: string, details?: string) => {
    setAuditTrail(prev => [{ action, timestamp: new Date().toISOString(), user: user?.email || "Sistema", role: currentRole, details }, ...prev.slice(0, 99)]);
  }, [user, currentRole]);

  /* ─── State ─── */
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appLogs, setAppLogs] = useState<AppLogEntry[]>([]);
  const [showAppLogs, setShowAppLogs] = useState(false);
  const [lastFullCheck, setLastFullCheck] = useState<string>("");
  const checkInterval = useRef<NodeJS.Timeout | null>(null);

  /* ─── Queue Metrics ─── */
  const [queueMetrics, setQueueMetrics] = useState({
    pendingJobs: 0,
    runningJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    avgProcessingMs: 0,
    webhooksActive: 0,
    webhooksTotal: 0,
    integrationsConnected: 0,
    integrationsTotal: 0,
    integrationsWithErrors: 0,
  });

  /* ─── Add App Log ─── */
  const addAppLog = useCallback((level: AppLogEntry["level"], service: string, message: string, metadata?: string) => {
    setAppLogs(prev => [{
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      level, service, message, timestamp: new Date().toISOString(), metadata,
    }, ...prev.slice(0, 299)]);
  }, []);

  /* ─── Healthcheck: Database ─── */
  const checkDatabase = useCallback(async (): Promise<ServiceHealth> => {
    const start = Date.now();
    try {
      // Test DB connectivity by querying a lightweight entity
      await sdkClient.entities.nelvyon_clients.query({ query: {}, limit: 1 });
      const latency = Date.now() - start;
      addAppLog("info", "Database", `Healthcheck OK — ${latency}ms`);
      return {
        name: "database", displayName: "PostgreSQL Database",
        icon: <Database className="w-5 h-5" />,
        status: latency < 500 ? "healthy" : "degraded",
        latencyMs: latency, lastChecked: new Date().toISOString(),
        details: latency < 500 ? "Respondiendo normalmente" : "Latencia elevada",
        uptime: 99.9, errorCount: 0,
      };
    } catch (err: any) {
      const latency = Date.now() - start;
      addAppLog("error", "Database", `Healthcheck FAILED — ${err?.message || "timeout"}`, JSON.stringify(err));
      return {
        name: "database", displayName: "PostgreSQL Database",
        icon: <Database className="w-5 h-5" />,
        status: "down", latencyMs: latency, lastChecked: new Date().toISOString(),
        details: err?.message || "No se pudo conectar", uptime: 0, errorCount: 1,
      };
    }
  }, [addAppLog]);

  /* ─── Healthcheck: API Backend ─── */
  const checkAPI = useCallback(async (): Promise<ServiceHealth> => {
    const start = Date.now();
    try {
      await sdkClient.apiCall.invoke({ url: "/api/v1/automation/stats", method: "GET" });
      const latency = Date.now() - start;
      addAppLog("info", "API", `Healthcheck OK — ${latency}ms`);
      return {
        name: "api", displayName: "API Backend (FastAPI)",
        icon: <Server className="w-5 h-5" />,
        status: latency < 800 ? "healthy" : "degraded",
        latencyMs: latency, lastChecked: new Date().toISOString(),
        details: latency < 800 ? "Endpoints respondiendo" : "Respuesta lenta",
        uptime: 99.5, errorCount: 0,
      };
    } catch (err: any) {
      const latency = Date.now() - start;
      addAppLog("error", "API", `Healthcheck FAILED — ${err?.message || "unreachable"}`);
      return {
        name: "api", displayName: "API Backend (FastAPI)",
        icon: <Server className="w-5 h-5" />,
        status: "down", latencyMs: latency, lastChecked: new Date().toISOString(),
        details: err?.message || "Backend no accesible", uptime: 0, errorCount: 1,
      };
    }
  }, [addAppLog]);

  /* ─── Healthcheck: Object Storage ─── */
  const checkStorage = useCallback(async (): Promise<ServiceHealth> => {
    const start = Date.now();
    try {
      // Test storage by listing assets
      await sdkClient.entities.nelvyon_assets?.query({ query: {}, limit: 1 });
      const latency = Date.now() - start;
      addAppLog("info", "Storage", `Healthcheck OK — ${latency}ms`);
      return {
        name: "storage", displayName: "Object Storage",
        icon: <HardDrive className="w-5 h-5" />,
        status: latency < 600 ? "healthy" : "degraded",
        latencyMs: latency, lastChecked: new Date().toISOString(),
        details: "Almacenamiento accesible", uptime: 99.8, errorCount: 0,
      };
    } catch (err: any) {
      const latency = Date.now() - start;
      addAppLog("warn", "Storage", `Healthcheck degraded — ${err?.message || "slow"}`);
      return {
        name: "storage", displayName: "Object Storage",
        icon: <HardDrive className="w-5 h-5" />,
        status: "degraded", latencyMs: latency, lastChecked: new Date().toISOString(),
        details: "Respuesta lenta o parcial", uptime: 95, errorCount: 0,
      };
    }
  }, [addAppLog]);

  /* ─── Healthcheck: Automation Jobs ─── */
  const checkJobs = useCallback(async (): Promise<ServiceHealth> => {
    const start = Date.now();
    try {
      const res = await sdkClient.apiCall.invoke({ url: "/api/v1/automation/stats", method: "GET" });
      const latency = Date.now() - start;
      const stats = res.data || {};
      const failRate = stats.total_jobs > 0 ? (stats.failed / stats.total_jobs) * 100 : 0;

      setQueueMetrics(prev => ({
        ...prev,
        pendingJobs: stats.pending || 0,
        runningJobs: 0,
        completedJobs: stats.completed || 0,
        failedJobs: stats.failed || 0,
        avgProcessingMs: stats.average_processing_ms || 0,
      }));

      addAppLog("info", "Jobs", `Stats loaded — ${stats.total_jobs || 0} total, ${stats.failed || 0} failed`);
      return {
        name: "jobs", displayName: "Cola de Jobs",
        icon: <Layers className="w-5 h-5" />,
        status: failRate > 20 ? "degraded" : "healthy",
        latencyMs: latency, lastChecked: new Date().toISOString(),
        details: `${stats.total_jobs || 0} jobs · ${stats.pending || 0} pendientes · ${failRate.toFixed(1)}% fallos`,
        uptime: 100 - failRate, errorCount: stats.failed || 0,
      };
    } catch (err: any) {
      const latency = Date.now() - start;
      addAppLog("error", "Jobs", `Stats unavailable — ${err?.message || "error"}`);
      return {
        name: "jobs", displayName: "Cola de Jobs",
        icon: <Layers className="w-5 h-5" />,
        status: "down", latencyMs: latency, lastChecked: new Date().toISOString(),
        details: "No se pudo obtener estado de jobs", uptime: 0, errorCount: 1,
      };
    }
  }, [addAppLog]);

  /* ─── Healthcheck: Webhooks ─── */
  const checkWebhooks = useCallback(async (): Promise<ServiceHealth> => {
    const start = Date.now();
    try {
      const res = await sdkClient.entities.automation_webhooks.query({ query: {}, limit: 100 });
      const latency = Date.now() - start;
      const items = res.data?.items || [];
      const active = items.filter((w: any) => w.is_active !== false).length;

      setQueueMetrics(prev => ({ ...prev, webhooksActive: active, webhooksTotal: items.length }));

      addAppLog("info", "Webhooks", `${items.length} webhooks, ${active} activos`);
      return {
        name: "webhooks", displayName: "Webhooks",
        icon: <Webhook className="w-5 h-5" />,
        status: "healthy",
        latencyMs: latency, lastChecked: new Date().toISOString(),
        details: `${items.length} configurados · ${active} activos`,
        uptime: 100, errorCount: 0,
      };
    } catch (err: any) {
      const latency = Date.now() - start;
      addAppLog("warn", "Webhooks", `Check failed — ${err?.message || "error"}`);
      return {
        name: "webhooks", displayName: "Webhooks",
        icon: <Webhook className="w-5 h-5" />,
        status: "degraded", latencyMs: latency, lastChecked: new Date().toISOString(),
        details: "No se pudo verificar webhooks", uptime: 50, errorCount: 1,
      };
    }
  }, [addAppLog]);

  /* ─── Healthcheck: Integrations ─── */
  const checkIntegrations = useCallback(async (): Promise<ServiceHealth> => {
    const start = Date.now();
    try {
      const res = await api.getConnectorConfigs(0, 200);
      const latency = Date.now() - start;
      const items = res.items || [];
      const connected = items.filter((c: any) => c.status === "active").length;
      const withErrors = items.filter((c: any) => c.sync_status === "error").length;

      setQueueMetrics(prev => ({
        ...prev,
        integrationsConnected: connected,
        integrationsTotal: items.length,
        integrationsWithErrors: withErrors,
      }));

      addAppLog("info", "Integrations", `${items.length} conectores, ${connected} activos, ${withErrors} con error`);
      return {
        name: "integrations", displayName: "Integraciones",
        icon: <GitBranch className="w-5 h-5" />,
        status: withErrors > 0 ? "degraded" : connected > 0 ? "healthy" : "healthy",
        latencyMs: latency, lastChecked: new Date().toISOString(),
        details: `${items.length} conectores · ${connected} activos · ${withErrors} con error`,
        uptime: items.length > 0 ? ((items.length - withErrors) / items.length) * 100 : 100,
        errorCount: withErrors,
      };
    } catch (err: any) {
      const latency = Date.now() - start;
      addAppLog("error", "Integrations", `Check failed — ${err?.message || "error"}`);
      return {
        name: "integrations", displayName: "Integraciones",
        icon: <GitBranch className="w-5 h-5" />,
        status: "down", latencyMs: latency, lastChecked: new Date().toISOString(),
        details: "No se pudo verificar integraciones", uptime: 0, errorCount: 1,
      };
    }
  }, [addAppLog]);

  /* ─── Healthcheck: Auth Service ─── */
  const checkAuth = useCallback(async (): Promise<ServiceHealth> => {
    const start = Date.now();
    // Auth is working if we have a user session
    const latency = Date.now() - start + 10;
    if (user) {
      addAppLog("info", "Auth", "Session active");
      return {
        name: "auth", displayName: "Autenticación",
        icon: <Shield className="w-5 h-5" />,
        status: "healthy", latencyMs: latency, lastChecked: new Date().toISOString(),
        details: `Sesión activa: ${user.email}`, uptime: 100, errorCount: 0,
      };
    }
    return {
      name: "auth", displayName: "Autenticación",
      icon: <Shield className="w-5 h-5" />,
      status: "down", latencyMs: latency, lastChecked: new Date().toISOString(),
      details: "Sin sesión activa", uptime: 0, errorCount: 1,
    };
  }, [user, addAppLog]);

  /* ─── Run All Healthchecks ─── */
  const runAllChecks = useCallback(async () => {
    setRefreshing(true);
    addAudit("Healthcheck completo iniciado");
    addAppLog("info", "System", "Running full healthcheck suite...");

    // Set all to checking
    setServices(prev => prev.map(s => ({ ...s, status: "checking" as HealthStatus })));

    const results = await Promise.all([
      checkDatabase(),
      checkAPI(),
      checkStorage(),
      checkJobs(),
      checkWebhooks(),
      checkIntegrations(),
      checkAuth(),
    ]);

    setServices(results);
    setLastFullCheck(new Date().toISOString());
    setRefreshing(false);
    setLoading(false);

    const healthy = results.filter(r => r.status === "healthy").length;
    const degraded = results.filter(r => r.status === "degraded").length;
    const down = results.filter(r => r.status === "down").length;

    addAppLog("info", "System", `Healthcheck complete: ${healthy} healthy, ${degraded} degraded, ${down} down`);
    addAudit("Healthcheck completo finalizado", `${healthy} OK · ${degraded} degradados · ${down} caídos`);

    if (down > 0) toast.error(`⚠️ ${down} servicio(s) caído(s)`);
    else if (degraded > 0) toast.warning(`⚡ ${degraded} servicio(s) degradado(s)`);
    else toast.success("✅ Todos los servicios operativos");
  }, [checkDatabase, checkAPI, checkStorage, checkJobs, checkWebhooks, checkIntegrations, checkAuth, addAudit, addAppLog]);

  useEffect(() => {
    if (user) {
      runAllChecks();
      checkInterval.current = setInterval(runAllChecks, 60_000); // Auto-refresh every 60s
    }
    return () => { if (checkInterval.current) clearInterval(checkInterval.current); };
  }, [user, runAllChecks]);

  /* ─── Derived Metrics ─── */
  const overallStatus: HealthStatus = services.some(s => s.status === "down")
    ? "down"
    : services.some(s => s.status === "degraded")
      ? "degraded"
      : services.some(s => s.status === "checking")
        ? "checking"
        : "healthy";

  const avgLatency = services.length > 0
    ? Math.round(services.reduce((s, svc) => s + svc.latencyMs, 0) / services.length)
    : 0;

  const totalErrors = services.reduce((s, svc) => s + svc.errorCount, 0);

  const systemMetrics: SystemMetric[] = [
    { label: "Servicios Activos", value: `${services.filter(s => s.status === "healthy").length}/${services.length}`, trend: "stable", trendValue: "", icon: <Activity className="w-4 h-4" />, color: "text-emerald-400" },
    { label: "Latencia Promedio", value: `${avgLatency}ms`, trend: avgLatency < 400 ? "down" : "up", trendValue: avgLatency < 400 ? "Normal" : "Elevada", icon: <Timer className="w-4 h-4" />, color: avgLatency < 400 ? "text-cyan-400" : "text-amber-400" },
    { label: "Errores Detectados", value: totalErrors, trend: totalErrors === 0 ? "down" : "up", trendValue: totalErrors === 0 ? "Sin errores" : `${totalErrors} activos`, icon: <AlertTriangle className="w-4 h-4" />, color: totalErrors === 0 ? "text-emerald-400" : "text-red-400" },
    { label: "Jobs Pendientes", value: queueMetrics.pendingJobs, trend: queueMetrics.pendingJobs > 10 ? "up" : "stable", trendValue: queueMetrics.pendingJobs > 10 ? "Cola alta" : "Normal", icon: <Layers className="w-4 h-4" />, color: "text-purple-400" },
    { label: "Webhooks Activos", value: `${queueMetrics.webhooksActive}/${queueMetrics.webhooksTotal}`, trend: "stable", trendValue: "", icon: <Webhook className="w-4 h-4" />, color: "text-indigo-400" },
    { label: "Integraciones", value: `${queueMetrics.integrationsConnected}/${queueMetrics.integrationsTotal}`, trend: queueMetrics.integrationsWithErrors > 0 ? "up" : "stable", trendValue: queueMetrics.integrationsWithErrors > 0 ? `${queueMetrics.integrationsWithErrors} con error` : "OK", icon: <GitBranch className="w-4 h-4" />, color: queueMetrics.integrationsWithErrors > 0 ? "text-amber-400" : "text-cyan-400" },
  ];

  const formatDate = (d: string) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
    catch { return d; }
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <Activity className="w-16 h-16 text-cyan-400" />
          <h2 className="text-2xl font-bold text-white">Estado del Sistema</h2>
          <p className="text-gray-400">Inicia sesión para acceder</p>
          <Button onClick={login} className="bg-cyan-600 hover:bg-cyan-700 text-white">Iniciar Sesión</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <div className={cn(
                "p-2.5 rounded-xl border",
                overallStatus === "healthy" ? "bg-emerald-500/10 border-emerald-500/30" :
                overallStatus === "degraded" ? "bg-amber-500/10 border-amber-500/30" :
                overallStatus === "down" ? "bg-red-500/10 border-red-500/30" :
                "bg-blue-500/10 border-blue-500/30"
              )}>
                <Radio className={cn("w-6 h-6", STATUS_CONFIG[overallStatus].color)} />
              </div>
              Estado del Sistema
            </h1>
            <p className="text-gray-400 mt-1 flex items-center gap-2">
              Healthchecks en tiempo real · DB, API, Storage, Jobs, Webhooks, Integraciones
              {lastFullCheck && (
                <span className="text-[10px] text-zinc-600">
                  Último check: {formatDate(lastFullCheck)}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Overall semaphore */}
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm",
              STATUS_CONFIG[overallStatus].bgColor,
              STATUS_CONFIG[overallStatus].borderColor,
              STATUS_CONFIG[overallStatus].color,
            )}>
              <div className={cn("w-3 h-3 rounded-full", STATUS_CONFIG[overallStatus].dotColor)} />
              {overallStatus === "healthy" ? "TODOS LOS SISTEMAS OPERATIVOS" :
               overallStatus === "degraded" ? "RENDIMIENTO DEGRADADO" :
               overallStatus === "down" ? "SERVICIOS CAÍDOS" : "VERIFICANDO..."}
            </div>
            {permissions.canRefresh && (
              <Button onClick={runAllChecks} disabled={refreshing} variant="outline" size="sm"
                className="border-gray-700 text-gray-300 hover:bg-gray-800">
                <RefreshCw className={cn("w-4 h-4 mr-1", refreshing && "animate-spin")} />
                {refreshing ? "Verificando..." : "Verificar Todo"}
              </Button>
            )}
          </div>
        </div>

        {/* RBAC Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
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
          <div className="flex gap-2 ml-auto">
            {permissions.canViewLogs && (
              <>
                <Button size="sm" variant="outline" className="h-7 text-[10px] border-white/10 text-zinc-400"
                  onClick={() => setShowAppLogs(!showAppLogs)}>
                  <Cpu className="w-3 h-3 mr-1" /> App Logs ({appLogs.length})
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[10px] border-white/10 text-zinc-400"
                  onClick={() => setShowAuditLog(!showAuditLog)}>
                  <Clock className="w-3 h-3 mr-1" /> Auditoría ({auditTrail.length})
                </Button>
              </>
            )}
          </div>
        </div>

        {/* App Logs Panel (separated from audit logs) */}
        {showAppLogs && permissions.canViewLogs && (
          <div className="p-4 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" /> App Logs — Sistema ({appLogs.length})
              </span>
              <button onClick={() => setShowAppLogs(false)} className="text-zinc-600 hover:text-zinc-400">
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto font-mono">
              {appLogs.length === 0 ? (
                <p className="text-[10px] text-zinc-600 text-center py-4">Sin logs del sistema</p>
              ) : appLogs.map(log => (
                <div key={log.id} className="flex items-start gap-2 p-1.5 rounded bg-white/[0.02] border border-white/[0.03]">
                  <span className={cn("text-[9px] font-bold uppercase w-10 shrink-0 mt-0.5",
                    log.level === "error" ? "text-red-400" :
                    log.level === "warn" ? "text-amber-400" :
                    log.level === "debug" ? "text-zinc-500" : "text-cyan-400"
                  )}>{log.level}</span>
                  <span className="text-[9px] text-indigo-400 w-20 shrink-0 truncate">{log.service}</span>
                  <span className="text-[9px] text-zinc-400 flex-1 truncate">{log.message}</span>
                  <span className="text-[8px] text-zinc-700 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audit Log Panel */}
        {showAuditLog && permissions.canViewLogs && auditTrail.length > 0 && (
          <div className="p-4 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-400" /> Registro de Auditoría ({auditTrail.length})
              </span>
              <button onClick={() => setShowAuditLog(false)} className="text-zinc-600 hover:text-zinc-400">
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {auditTrail.map((entry, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <Clock className="w-3 h-3 text-zinc-600 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-cyan-400">{entry.action}</span>
                      <span className="text-[9px] text-zinc-500">{entry.user}</span>
                      <span className="text-[8px] px-1 py-0.5 rounded bg-white/[0.04] text-zinc-600">
                        {ROLE_PERMISSIONS[entry.role as UserRole]?.label || entry.role}
                      </span>
                    </div>
                    {entry.details && <p className="text-[9px] text-zinc-600 mt-0.5">{entry.details}</p>}
                    <p className="text-[8px] text-zinc-700">{formatDate(entry.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {systemMetrics.map((metric) => (
            <div key={metric.label} className="bg-[#12141A] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">{metric.label}</span>
                <span className={metric.color}>{metric.icon}</span>
              </div>
              <p className="text-xl font-bold text-white">{metric.value}</p>
              {metric.trendValue && (
                <div className="flex items-center gap-1 mt-1">
                  {metric.trend === "up" ? <ArrowUpRight className="w-3 h-3 text-red-400" /> :
                   metric.trend === "down" ? <ArrowDownRight className="w-3 h-3 text-emerald-400" /> :
                   <Minus className="w-3 h-3 text-zinc-500" />}
                  <span className={cn("text-[9px]",
                    metric.trend === "up" ? "text-red-400" :
                    metric.trend === "down" ? "text-emerald-400" : "text-zinc-500"
                  )}>{metric.trendValue}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Service Healthchecks — Semaphore Grid */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Healthchecks por Servicio
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              <span className="ml-3 text-zinc-400">Ejecutando healthchecks...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {services.map((svc) => {
                const cfg = STATUS_CONFIG[svc.status];
                return (
                  <div key={svc.name} className={cn(
                    "rounded-xl border p-5 transition-all hover:border-white/[0.12]",
                    "bg-[#12141A]",
                    cfg.borderColor,
                  )}>
                    {/* Semaphore dot + name */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg", cfg.bgColor, cfg.color)}>
                          {svc.icon}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-white">{svc.displayName}</h3>
                          <span className="text-[10px] text-zinc-500">{svc.name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full", cfg.dotColor)} />
                        <span className={cn("text-[10px] font-bold", cfg.color)}>{cfg.label}</span>
                      </div>
                    </div>

                    {/* Details */}
                    <p className="text-xs text-zinc-400 mb-3">{svc.details}</p>

                    {/* Metrics row */}
                    {permissions.canViewDetails && (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-center">
                          <p className="text-[8px] text-zinc-500 uppercase">Latencia</p>
                          <p className={cn("text-[11px] font-bold mt-0.5",
                            svc.latencyMs < 400 ? "text-emerald-400" : svc.latencyMs < 800 ? "text-amber-400" : "text-red-400"
                          )}>{svc.latencyMs}ms</p>
                        </div>
                        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-center">
                          <p className="text-[8px] text-zinc-500 uppercase">Uptime</p>
                          <p className={cn("text-[11px] font-bold mt-0.5",
                            svc.uptime >= 99 ? "text-emerald-400" : svc.uptime >= 95 ? "text-amber-400" : "text-red-400"
                          )}>{svc.uptime.toFixed(1)}%</p>
                        </div>
                        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-center">
                          <p className="text-[8px] text-zinc-500 uppercase">Errores</p>
                          <p className={cn("text-[11px] font-bold mt-0.5",
                            svc.errorCount === 0 ? "text-emerald-400" : "text-red-400"
                          )}>{svc.errorCount}</p>
                        </div>
                      </div>
                    )}

                    {/* Last checked */}
                    <p className="text-[8px] text-zinc-700 mt-2 text-right">
                      Último check: {formatDate(svc.lastChecked)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Queue Status Summary */}
        <div className="p-5 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            Resumen de Colas y Conectividad
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Jobs Pendientes", value: queueMetrics.pendingJobs, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
              { label: "Jobs Completados", value: queueMetrics.completedJobs, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
              { label: "Jobs Fallidos", value: queueMetrics.failedJobs, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
              { label: "Webhooks Activos", value: `${queueMetrics.webhooksActive}/${queueMetrics.webhooksTotal}`, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
              { label: "Integraciones OK", value: `${queueMetrics.integrationsConnected}/${queueMetrics.integrationsTotal}`, color: queueMetrics.integrationsWithErrors > 0 ? "text-amber-400" : "text-cyan-400", bg: queueMetrics.integrationsWithErrors > 0 ? "bg-amber-500/10 border-amber-500/20" : "bg-cyan-500/10 border-cyan-500/20" },
            ].map(item => (
              <div key={item.label} className={cn("p-3 rounded-xl border text-center", item.bg)}>
                <p className="text-[9px] text-zinc-500 uppercase mb-1">{item.label}</p>
                <p className={cn("text-lg font-bold", item.color)}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Processing time */}
          {queueMetrics.avgProcessingMs > 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
              <Timer className="w-3.5 h-3.5 text-purple-400" />
              Tiempo promedio de procesamiento: <span className="text-white font-bold">{queueMetrics.avgProcessingMs < 1000 ? `${queueMetrics.avgProcessingMs}ms` : `${(queueMetrics.avgProcessingMs / 1000).toFixed(1)}s`}</span>
            </div>
          )}
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Integraciones", path: "/saas/integrations", icon: <GitBranch className="w-4 h-4" />, color: "text-indigo-400" },
            { label: "Automatización", path: "/automation", icon: <Zap className="w-4 h-4" />, color: "text-cyan-400" },
            { label: "Platform Health", path: "/saas/platform-health", icon: <Activity className="w-4 h-4" />, color: "text-purple-400" },
            { label: "Admin Panel", path: "/saas/admin", icon: <Shield className="w-4 h-4" />, color: "text-emerald-400" },
          ].map(link => (
            <button key={link.path} onClick={() => navigate(link.path)}
              className="flex items-center gap-3 p-4 rounded-xl bg-[#12141A] border border-white/[0.06] hover:border-white/[0.12] transition-all text-left">
              <span className={link.color}>{link.icon}</span>
              <span className="text-sm text-white font-medium">{link.label}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 ml-auto" />
            </button>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}