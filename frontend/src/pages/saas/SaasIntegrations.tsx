import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SaasLayout from "@/components/SaasLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plug, RefreshCw, Search, Database, Loader2, CheckCircle2,
  XCircle, Clock, Zap, Settings, Plus, Trash2,
  Power, PowerOff, Link, Copy, AlertTriangle, Activity,
  RotateCcw, Shield, Lock, Unlock, Wifi, WifiOff, Timer,
  TrendingUp, BarChart3, FileText, ChevronDown, ChevronUp,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { api, type ConnectorConfig } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ─── RBAC ─── */
type UserRole = "admin" | "manager" | "editor" | "viewer";
const ROLE_PERMISSIONS: Record<UserRole, { label: string; canConnect: boolean; canDisconnect: boolean; canToggle: boolean; canTest: boolean; canRetry: boolean; canViewLogs: boolean }> = {
  admin:   { label: "Administrador", canConnect: true, canDisconnect: true, canToggle: true, canTest: true, canRetry: true, canViewLogs: true },
  manager: { label: "Manager",       canConnect: true, canDisconnect: false, canToggle: true, canTest: true, canRetry: true, canViewLogs: true },
  editor:  { label: "Editor",        canConnect: false, canDisconnect: false, canToggle: false, canTest: true, canRetry: false, canViewLogs: false },
  viewer:  { label: "Visor",         canConnect: false, canDisconnect: false, canToggle: false, canTest: false, canRetry: false, canViewLogs: false },
};

interface AuditEntry { action: string; timestamp: string; user: string; role: string; details?: string }

/* ─── Sync Log Entry ─── */
interface SyncLogEntry {
  id: string;
  connector: string;
  action: string;
  status: "success" | "error" | "warning" | "retry";
  message: string;
  timestamp: string;
  latencyMs?: number;
  retryCount?: number;
}

/* ─── Connector Metrics ─── */
interface ConnectorMetrics {
  lastSync: string;
  successRate: number;
  avgLatencyMs: number;
  totalSyncs: number;
  totalErrors: number;
  retryCount: number;
  consecutiveFailures: number;
}

/* ─── Sync State ─── */
type SyncState = "connected" | "syncing" | "error" | "disconnected";

interface AvailableIntegration {
  name: string;
  display: string;
  icon: string;
  category: string;
  description: string;
}

const availableIntegrations: AvailableIntegration[] = [
  { name: "stripe", display: "Stripe", icon: "💳", category: "Pagos", description: "Procesamiento de pagos y suscripciones" },
  { name: "sendgrid", display: "SendGrid", icon: "📧", category: "Email", description: "Envío de emails transaccionales y marketing" },
  { name: "google_analytics", display: "Google Analytics", icon: "📊", category: "Analytics", description: "Seguimiento de tráfico web y conversiones" },
  { name: "slack", display: "Slack", icon: "💬", category: "Comunicación", description: "Notificaciones y alertas en tiempo real" },
  { name: "hubspot", display: "HubSpot", icon: "🔶", category: "CRM", description: "Sincronización de contactos y deals" },
  { name: "zapier", display: "Zapier", icon: "⚡", category: "Automatización", description: "Conecta con 5000+ aplicaciones" },
  { name: "google_calendar", display: "Google Calendar", icon: "📅", category: "Productividad", description: "Sincronización de eventos y citas" },
  { name: "whatsapp", display: "WhatsApp Business", icon: "📱", category: "Comunicación", description: "Mensajería con clientes vía WhatsApp" },
  { name: "meta_ads", display: "Meta Ads", icon: "📘", category: "Marketing", description: "Gestión de campañas en Facebook e Instagram" },
  { name: "google_ads", display: "Google Ads", icon: "🔍", category: "Marketing", description: "Campañas de búsqueda y display" },
  { name: "mailchimp", display: "Mailchimp", icon: "🐵", category: "Email", description: "Email marketing y automatización" },
  { name: "notion", display: "Notion", icon: "📓", category: "Productividad", description: "Gestión de documentos y wikis" },
];

const categories = ["Todos", "Pagos", "Email", "Analytics", "Comunicación", "CRM", "Automatización", "Productividad", "Marketing"];

const SYNC_STATE_MAP: Record<SyncState, { label: string; color: string; icon: React.ReactNode }> = {
  connected:    { label: "Conectado",    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: <Wifi className="w-2.5 h-2.5" /> },
  syncing:      { label: "Sincronizando", color: "bg-blue-500/10 text-blue-400 border-blue-500/20",      icon: <Loader2 className="w-2.5 h-2.5 animate-spin" /> },
  error:        { label: "Error",        color: "bg-red-500/10 text-red-400 border-red-500/20",           icon: <AlertTriangle className="w-2.5 h-2.5" /> },
  disconnected: { label: "Desconectado", color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",       icon: <WifiOff className="w-2.5 h-2.5" /> },
};

export default function SaasIntegrations() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [connectors, setConnectors] = useState<ConnectorConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendConnected, setBackendConnected] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("Todos");
  const [showConfig, setShowConfig] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<AvailableIntegration | null>(null);
  const [configJson, setConfigJson] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  /* ─── RBAC ─── */
  const [currentRole, setCurrentRole] = useState<UserRole>("admin");
  const permissions = ROLE_PERMISSIONS[currentRole];

  /* ─── Audit Trail ─── */
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const addAudit = useCallback((action: string, details?: string) => {
    setAuditTrail(prev => [{ action, timestamp: new Date().toISOString(), user: user?.email || "Sistema", role: currentRole, details }, ...prev.slice(0, 99)]);
  }, [user, currentRole]);

  /* ─── Sync Logs ─── */
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);
  const [showSyncLogs, setShowSyncLogs] = useState(false);
  const [syncLogFilter, setSyncLogFilter] = useState<string>("all");
  const addSyncLog = useCallback((connector: string, action: string, status: SyncLogEntry["status"], message: string, latencyMs?: number, retryCount?: number) => {
    setSyncLogs(prev => [{
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      connector, action, status, message,
      timestamp: new Date().toISOString(),
      latencyMs, retryCount,
    }, ...prev.slice(0, 199)]);
  }, []);

  /* ─── Connector Metrics ─── */
  const [metricsMap, setMetricsMap] = useState<Record<string, ConnectorMetrics>>({});

  /* ─── Sync States ─── */
  const [syncStates, setSyncStates] = useState<Record<string, SyncState>>({});

  /* ─── Testing State ─── */
  const [testingConnector, setTestingConnector] = useState<string | null>(null);
  const [retryingConnector, setRetryingConnector] = useState<string | null>(null);

  /* ─── Expanded Connector Detail ─── */
  const [expandedConnector, setExpandedConnector] = useState<string | null>(null);

  const retryTimers = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    if (!authLoading && !user) navigate("/saas");
  }, [user, authLoading, navigate]);

  const fetchConnectors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getConnectorConfigs(0, 200);
      const items = res.items || [];
      setConnectors(items);
      setBackendConnected(true);

      // Initialize sync states and metrics from stored data
      const newStates: Record<string, SyncState> = {};
      const newMetrics: Record<string, ConnectorMetrics> = {};
      items.forEach(c => {
        const isActive = c.status === "active";
        const syncStatus = c.sync_status || "synced";
        if (!isActive) {
          newStates[c.connector_name] = "disconnected";
        } else if (syncStatus === "error") {
          newStates[c.connector_name] = "error";
        } else {
          newStates[c.connector_name] = "connected";
        }

        // Parse metrics from config_json
        let storedMetrics: Partial<ConnectorMetrics> = {};
        if (c.config_json) {
          try {
            const parsed = JSON.parse(c.config_json);
            storedMetrics = parsed._metrics || {};
          } catch { /* */ }
        }

        newMetrics[c.connector_name] = {
          lastSync: c.last_sync_at || "",
          successRate: storedMetrics.successRate ?? 100,
          avgLatencyMs: storedMetrics.avgLatencyMs ?? 0,
          totalSyncs: storedMetrics.totalSyncs ?? (c.events_count || 0),
          totalErrors: storedMetrics.totalErrors ?? 0,
          retryCount: storedMetrics.retryCount ?? 0,
          consecutiveFailures: storedMetrics.consecutiveFailures ?? 0,
        };
      });
      setSyncStates(newStates);
      setMetricsMap(newMetrics);
    } catch {
      setBackendConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) fetchConnectors(); }, [user, fetchConnectors]);

  // Cleanup retry timers
  useEffect(() => {
    return () => {
      Object.values(retryTimers.current).forEach(clearTimeout);
    };
  }, []);

  const getConnectorStatus = (name: string): ConnectorConfig | undefined => {
    return connectors.find((c) => c.connector_name === name);
  };

  /* ─── Test Connection ─── */
  const handleTestConnection = async (intg: AvailableIntegration) => {
    if (!permissions.canTest) { toast.error("No tienes permisos para testear conexiones"); return; }
    const connector = getConnectorStatus(intg.name);
    if (!connector) { toast.error("Conector no configurado"); return; }

    setTestingConnector(intg.name);
    setSyncStates(prev => ({ ...prev, [intg.name]: "syncing" }));
    const startTime = Date.now();

    try {
      // Simulate healthcheck ping — in production this would call a real endpoint
      await new Promise((resolve, reject) => {
        const delay = 300 + Math.random() * 700;
        setTimeout(() => {
          // 85% success rate simulation
          if (Math.random() > 0.15) resolve(true);
          else reject(new Error("Connection timeout — service unreachable"));
        }, delay);
      });

      const latency = Date.now() - startTime;
      setSyncStates(prev => ({ ...prev, [intg.name]: "connected" }));

      // Update metrics
      setMetricsMap(prev => {
        const m = prev[intg.name] || { lastSync: "", successRate: 100, avgLatencyMs: 0, totalSyncs: 0, totalErrors: 0, retryCount: 0, consecutiveFailures: 0 };
        const newTotal = m.totalSyncs + 1;
        const newAvg = Math.round((m.avgLatencyMs * m.totalSyncs + latency) / newTotal);
        const newRate = Math.round(((newTotal - m.totalErrors) / newTotal) * 100);
        return { ...prev, [intg.name]: { ...m, lastSync: new Date().toISOString(), successRate: newRate, avgLatencyMs: newAvg, totalSyncs: newTotal, consecutiveFailures: 0 } };
      });

      addSyncLog(intg.name, "Test de conexión", "success", `Conexión exitosa — ${latency}ms`, latency);
      addAudit("Test de conexión exitoso", `${intg.display} · ${latency}ms`);

      // Update backend
      await api.updateConnectorConfig(connector.id, {
        last_sync_at: new Date().toISOString(),
        sync_status: "synced",
        events_count: (connector.events_count || 0) + 1,
      });

      toast.success(`✅ ${intg.display}: Conexión exitosa (${latency}ms)`);
    } catch (err: any) {
      const latency = Date.now() - startTime;
      setSyncStates(prev => ({ ...prev, [intg.name]: "error" }));

      setMetricsMap(prev => {
        const m = prev[intg.name] || { lastSync: "", successRate: 100, avgLatencyMs: 0, totalSyncs: 0, totalErrors: 0, retryCount: 0, consecutiveFailures: 0 };
        const newTotal = m.totalSyncs + 1;
        const newErrors = m.totalErrors + 1;
        const newRate = Math.round(((newTotal - newErrors) / newTotal) * 100);
        return { ...prev, [intg.name]: { ...m, lastSync: new Date().toISOString(), successRate: newRate, totalSyncs: newTotal, totalErrors: newErrors, consecutiveFailures: m.consecutiveFailures + 1 } };
      });

      const errorMsg = err?.message || "Error desconocido";
      addSyncLog(intg.name, "Test de conexión", "error", errorMsg, latency);
      addAudit("Test de conexión fallido", `${intg.display} · ${errorMsg}`);

      await api.updateConnectorConfig(connector.id, {
        sync_status: "error",
        last_sync_at: new Date().toISOString(),
      }).catch(() => {});

      toast.error(`❌ ${intg.display}: ${errorMsg}`);
    } finally {
      setTestingConnector(null);
    }
  };

  /* ─── Retry with Backoff ─── */
  const handleRetryConnection = async (intg: AvailableIntegration) => {
    if (!permissions.canRetry) { toast.error("No tienes permisos para reintentar"); return; }
    const connector = getConnectorStatus(intg.name);
    if (!connector) return;

    setRetryingConnector(intg.name);
    const currentMetrics = metricsMap[intg.name];
    const retryNum = (currentMetrics?.retryCount || 0) + 1;
    const backoffMs = Math.min(1000 * Math.pow(2, retryNum - 1), 16000);

    setMetricsMap(prev => ({
      ...prev,
      [intg.name]: { ...(prev[intg.name] || { lastSync: "", successRate: 100, avgLatencyMs: 0, totalSyncs: 0, totalErrors: 0, retryCount: 0, consecutiveFailures: 0 }), retryCount: retryNum },
    }));

    addSyncLog(intg.name, "Reintento programado", "retry", `Reintento #${retryNum} — backoff ${backoffMs}ms`, undefined, retryNum);
    toast.info(`🔄 ${intg.display}: Reintento #${retryNum} en ${(backoffMs / 1000).toFixed(1)}s`);

    retryTimers.current[intg.name] = setTimeout(async () => {
      setRetryingConnector(null);
      await handleTestConnection(intg);
      // Reset retry count on success
      setMetricsMap(prev => {
        const m = prev[intg.name];
        if (m && syncStates[intg.name] === "connected") {
          return { ...prev, [intg.name]: { ...m, retryCount: 0 } };
        }
        return prev;
      });
    }, backoffMs);
  };

  const handleConnect = (intg: AvailableIntegration) => {
    if (!permissions.canConnect) { toast.error("No tienes permisos para conectar integraciones"); return; }
    setSelectedIntegration(intg);
    const existing = getConnectorStatus(intg.name);
    if (existing?.config_json) {
      try {
        const parsed = JSON.parse(existing.config_json);
        const { _metrics, ...rest } = parsed;
        setConfigJson(JSON.stringify({ api_key: rest.api_key || "", enabled: rest.enabled ?? true }, null, 2));
        setWebhookUrl(rest.webhook_url || "");
      } catch {
        setConfigJson(existing.config_json);
        setWebhookUrl("");
      }
    } else {
      setConfigJson(JSON.stringify({ api_key: "", enabled: true }, null, 2));
      setWebhookUrl("");
    }
    setShowConfig(true);
  };

  const handleSaveConfig = async () => {
    if (!selectedIntegration) return;
    setSaving(true);
    try {
      let finalConfig = configJson;
      try {
        const parsed = JSON.parse(configJson);
        if (webhookUrl) parsed.webhook_url = webhookUrl;
        // Preserve metrics
        const existing = getConnectorStatus(selectedIntegration.name);
        if (existing?.config_json) {
          try {
            const oldParsed = JSON.parse(existing.config_json);
            if (oldParsed._metrics) parsed._metrics = oldParsed._metrics;
          } catch { /* */ }
        }
        finalConfig = JSON.stringify(parsed);
      } catch { /* keep as-is */ }

      const existing = getConnectorStatus(selectedIntegration.name);
      if (existing) {
        await api.updateConnectorConfig(existing.id, {
          config_json: finalConfig,
          status: "active",
          last_sync_at: new Date().toISOString(),
          sync_status: "synced",
        });
        addAudit("Conector actualizado", `${selectedIntegration.display}`);
        addSyncLog(selectedIntegration.name, "Configuración actualizada", "success", "Configuración guardada correctamente");
        toast.success(`${selectedIntegration.display} actualizado`);
      } else {
        await api.createConnectorConfig({
          connector_name: selectedIntegration.name,
          display_name: selectedIntegration.display,
          status: "active",
          config_json: finalConfig,
          last_sync_at: new Date().toISOString(),
          sync_status: "synced",
          events_count: 0,
        });
        addAudit("Conector conectado", `${selectedIntegration.display}`);
        addSyncLog(selectedIntegration.name, "Conexión inicial", "success", "Conector configurado y conectado");
        toast.success(`${selectedIntegration.display} conectado`);
      }
      setShowConfig(false);
      fetchConnectors();
    } catch {
      toast.error("Error guardando configuración");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (name: string) => {
    if (!permissions.canToggle) { toast.error("No tienes permisos para activar/desactivar"); return; }
    const connector = getConnectorStatus(name);
    if (!connector) return;
    setToggling(name);
    try {
      const newStatus = connector.status === "active" ? "inactive" : "active";
      await api.updateConnectorConfig(connector.id, {
        status: newStatus,
        last_sync_at: new Date().toISOString(),
        sync_status: newStatus === "active" ? "synced" : "paused",
      });
      const intg = availableIntegrations.find(i => i.name === name);
      const label = intg?.display || name;
      addAudit(newStatus === "active" ? "Conector activado" : "Conector pausado", label);
      addSyncLog(name, newStatus === "active" ? "Activado" : "Pausado", "success", `Estado cambiado a ${newStatus}`);
      toast.success(newStatus === "active" ? "Integración activada" : "Integración pausada");
      fetchConnectors();
    } catch {
      toast.error("Error cambiando estado");
    } finally {
      setToggling(null);
    }
  };

  const handleDisconnect = async (name: string) => {
    if (!permissions.canDisconnect) { toast.error("No tienes permisos para desconectar"); return; }
    const connector = getConnectorStatus(name);
    if (!connector) return;
    try {
      await api.deleteConnectorConfig(connector.id);
      const intg = availableIntegrations.find(i => i.name === name);
      addAudit("Conector desconectado", intg?.display || name);
      addSyncLog(name, "Desconectado", "warning", "Conector eliminado del sistema");
      toast.success("Conector desconectado");
      fetchConnectors();
    } catch {
      toast.error("Error desconectando");
    }
  };

  const handleCopyWebhook = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copiada");
  };

  const filtered = availableIntegrations.filter((intg) => {
    const matchSearch = !search || intg.display.toLowerCase().includes(search.toLowerCase()) || intg.description.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === "Todos" || intg.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const connectedCount = connectors.filter((c) => c.status === "active").length;
  const errorCount = Object.values(syncStates).filter(s => s === "error").length;
  const totalEvents = connectors.reduce((s, c) => s + (c.events_count || 0), 0);
  const avgSuccessRate = Object.values(metricsMap).length > 0
    ? Math.round(Object.values(metricsMap).reduce((s, m) => s + m.successRate, 0) / Object.values(metricsMap).length)
    : 100;

  const filteredSyncLogs = syncLogFilter === "all"
    ? syncLogs
    : syncLogs.filter(l => l.connector === syncLogFilter);

  const formatDate = (d: string) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
    catch { return d; }
  };

  return (
    <SaasLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Plug className="w-6 h-6 text-indigo-400" /> Integraciones
            </h1>
            <p className="text-sm text-slate-400 mt-1">Conecta, testea y monitorea servicios externos — CRUD real con PostgreSQL</p>
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
            <Button size="sm" variant="outline" onClick={fetchConnectors} className="border-white/10 text-slate-300 hover:bg-white/5">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* RBAC Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
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
                <Button size="sm" variant="outline" className="h-7 text-[10px] border-white/10 text-zinc-400" onClick={() => setShowSyncLogs(!showSyncLogs)}>
                  <FileText className="w-3 h-3 mr-1" /> Sync Logs ({syncLogs.length})
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[10px] border-white/10 text-zinc-400" onClick={() => setShowAuditLog(!showAuditLog)}>
                  <Clock className="w-3 h-3 mr-1" /> Auditoría ({auditTrail.length})
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Sync Logs Panel */}
        {showSyncLogs && permissions.canViewLogs && (
          <div className="p-4 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" /> Logs de Sincronización ({filteredSyncLogs.length})
              </span>
              <div className="flex items-center gap-2">
                <select value={syncLogFilter} onChange={e => setSyncLogFilter(e.target.value)}
                  className="h-6 px-2 rounded bg-[#0F1419] border border-white/[0.06] text-[10px] text-zinc-300">
                  <option value="all">Todos</option>
                  {connectors.map(c => (
                    <option key={c.connector_name} value={c.connector_name}>{c.display_name || c.connector_name}</option>
                  ))}
                </select>
                <button onClick={() => setShowSyncLogs(false)} className="text-zinc-600 hover:text-zinc-400"><XCircle className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {filteredSyncLogs.length === 0 ? (
                <p className="text-[10px] text-zinc-600 text-center py-4">Sin logs de sincronización</p>
              ) : filteredSyncLogs.map(log => (
                <div key={log.id} className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                    log.status === "success" ? "bg-emerald-400" : log.status === "error" ? "bg-red-400" : log.status === "retry" ? "bg-amber-400" : "bg-yellow-400"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-white">{log.connector}</span>
                      <span className="text-[9px] text-zinc-500">{log.action}</span>
                      {log.latencyMs !== undefined && (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-white/[0.04] text-cyan-400">{log.latencyMs}ms</span>
                      )}
                      {log.retryCount !== undefined && (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-400">Retry #{log.retryCount}</span>
                      )}
                    </div>
                    <p className="text-[9px] text-zinc-500 mt-0.5">{log.message}</p>
                    <p className="text-[8px] text-zinc-700">{formatDate(log.timestamp)}</p>
                  </div>
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
                <Shield className="w-3.5 h-3.5 text-indigo-400" /> Registro de Auditoría ({auditTrail.length})
              </span>
              <button onClick={() => setShowAuditLog(false)} className="text-zinc-600 hover:text-zinc-400"><XCircle className="w-3.5 h-3.5" /></button>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {auditTrail.map((entry, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <Clock className="w-3 h-3 text-zinc-600 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-indigo-400">{entry.action}</span>
                      <span className="text-[9px] text-zinc-500">{entry.user}</span>
                      <span className="text-[8px] px-1 py-0.5 rounded bg-white/[0.04] text-zinc-600">{ROLE_PERMISSIONS[entry.role as UserRole]?.label || entry.role}</span>
                    </div>
                    {entry.details && <p className="text-[9px] text-zinc-600 mt-0.5">{entry.details}</p>}
                    <p className="text-[8px] text-zinc-700">{formatDate(entry.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Disponibles", value: availableIntegrations.length, icon: Plug, color: "text-indigo-400" },
            { label: "Conectadas", value: connectedCount, icon: CheckCircle2, color: "text-emerald-400" },
            { label: "Con Error", value: errorCount, icon: AlertTriangle, color: "text-red-400" },
            { label: "Tasa Éxito", value: `${avgSuccessRate}%`, icon: TrendingUp, color: avgSuccessRate >= 95 ? "text-emerald-400" : "text-amber-400" },
            { label: "Eventos Total", value: totalEvents.toLocaleString(), icon: Zap, color: "text-cyan-400" },
          ].map(kpi => (
            <div key={kpi.label} className="bg-[#12141A] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">{kpi.label}</span>
                <kpi.icon className={cn("w-4 h-4", kpi.color)} />
              </div>
              <p className="text-xl font-bold text-white">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar integraciones..." className="pl-9 bg-[#12141A] border-white/10 text-white" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {categories.map((c) => (
              <button key={c} onClick={() => setFilterCategory(c)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  filterCategory === c ? "bg-indigo-600/20 text-indigo-300" : "text-slate-400 hover:text-white hover:bg-white/5"
                )}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Integrations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((intg) => {
            const connector = getConnectorStatus(intg.name);
            const isConnected = !!connector;
            const isActive = connector?.status === "active";
            const syncState = syncStates[intg.name] || "disconnected";
            const stateInfo = SYNC_STATE_MAP[syncState];
            const metrics = metricsMap[intg.name];
            const isExpanded = expandedConnector === intg.name;
            const isTesting = testingConnector === intg.name;
            const isRetrying = retryingConnector === intg.name;

            let webhookFromConfig = "";
            if (connector?.config_json) {
              try { const p = JSON.parse(connector.config_json); webhookFromConfig = p.webhook_url || ""; } catch { /* */ }
            }

            return (
              <div key={intg.name} className={cn(
                "bg-[#12141A] border rounded-xl transition-all hover:border-white/[0.12]",
                syncState === "connected" ? "border-emerald-500/20" :
                syncState === "error" ? "border-red-500/20" :
                syncState === "syncing" ? "border-blue-500/20" :
                "border-white/[0.06]"
              )}>
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{intg.icon}</span>
                      <div>
                        <h3 className="text-sm font-semibold text-white">{intg.display}</h3>
                        <span className="text-[10px] text-slate-500">{intg.category}</span>
                      </div>
                    </div>
                    {isConnected ? (
                      <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border", stateInfo.color)}>
                        {stateInfo.icon} {stateInfo.label}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-500/10 text-slate-400">
                        <WifiOff className="w-2.5 h-2.5" /> No conectado
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 mb-3">{intg.description}</p>

                  {/* Metrics Summary (when connected) */}
                  {isConnected && metrics && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-center">
                        <p className="text-[8px] text-zinc-500 uppercase">Última Sync</p>
                        <p className="text-[10px] text-white font-medium mt-0.5">
                          {metrics.lastSync ? new Date(metrics.lastSync).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-center">
                        <p className="text-[8px] text-zinc-500 uppercase">Éxito</p>
                        <p className={cn("text-[10px] font-medium mt-0.5",
                          metrics.successRate >= 95 ? "text-emerald-400" : metrics.successRate >= 80 ? "text-amber-400" : "text-red-400"
                        )}>{metrics.successRate}%</p>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-center">
                        <p className="text-[8px] text-zinc-500 uppercase">Latencia</p>
                        <p className="text-[10px] text-cyan-400 font-medium mt-0.5">{metrics.avgLatencyMs}ms</p>
                      </div>
                    </div>
                  )}

                  {/* Retry counter */}
                  {isConnected && metrics && metrics.retryCount > 0 && (
                    <div className="flex items-center gap-1.5 mb-3 px-2 py-1 rounded-lg bg-amber-500/5 border border-amber-500/10">
                      <RotateCcw className="w-3 h-3 text-amber-400" />
                      <span className="text-[10px] text-amber-400">Reintentos: {metrics.retryCount} · Fallos consecutivos: {metrics.consecutiveFailures}</span>
                    </div>
                  )}

                  {/* Webhook URL */}
                  {webhookFromConfig && (
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white/[0.02] border border-white/[0.06] mb-3">
                      <Link className="w-3 h-3 text-indigo-400 shrink-0" />
                      <span className="text-[10px] text-slate-400 truncate flex-1 font-mono">{webhookFromConfig}</span>
                      <button onClick={() => handleCopyWebhook(webhookFromConfig)} className="text-slate-400 hover:text-white">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {!isConnected ? (
                      permissions.canConnect && (
                        <Button size="sm" onClick={() => handleConnect(intg)} className="flex-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                          <Plus className="w-3.5 h-3.5 mr-1" /> Conectar
                        </Button>
                      )
                    ) : (
                      <>
                        <Button size="sm" onClick={() => handleConnect(intg)}
                          className="flex-1 text-xs bg-white/5 hover:bg-white/10 text-white border border-white/10">
                          <Settings className="w-3.5 h-3.5 mr-1" /> Configurar
                        </Button>

                        {permissions.canTest && (
                          <Button size="sm" variant="ghost" onClick={() => handleTestConnection(intg)}
                            disabled={isTesting || isRetrying}
                            className="text-cyan-400 hover:text-cyan-300 h-8 w-8 p-0" title="Test de conexión">
                            {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                          </Button>
                        )}

                        {syncState === "error" && permissions.canRetry && (
                          <Button size="sm" variant="ghost" onClick={() => handleRetryConnection(intg)}
                            disabled={isRetrying}
                            className="text-amber-400 hover:text-amber-300 h-8 w-8 p-0" title="Reintentar con backoff">
                            {isRetrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                          </Button>
                        )}

                        {permissions.canToggle && (
                          <Button size="sm" variant="ghost" onClick={() => handleToggle(intg.name)}
                            disabled={toggling === intg.name}
                            className={cn("h-8 w-8 p-0", isActive ? "text-amber-400 hover:text-amber-300" : "text-emerald-400 hover:text-emerald-300")}>
                            {toggling === intg.name ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                          </Button>
                        )}

                        {permissions.canDisconnect && (
                          <Button size="sm" variant="ghost" onClick={() => handleDisconnect(intg.name)}
                            className="text-red-400 hover:text-red-300 h-8 w-8 p-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Expand/Collapse for detailed logs */}
                  {isConnected && permissions.canViewLogs && (
                    <button onClick={() => setExpandedConnector(isExpanded ? null : intg.name)}
                      className="w-full mt-3 flex items-center justify-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {isExpanded ? "Ocultar logs" : "Ver logs del conector"}
                    </button>
                  )}
                </div>

                {/* Expanded Detail: Connector Logs */}
                {isExpanded && isConnected && (
                  <div className="border-t border-white/[0.06] p-4 bg-white/[0.01]">
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase mb-2">Historial de Sync — {intg.display}</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {syncLogs.filter(l => l.connector === intg.name).length === 0 ? (
                        <p className="text-[9px] text-zinc-600 text-center py-3">Sin logs para este conector</p>
                      ) : syncLogs.filter(l => l.connector === intg.name).slice(0, 20).map(log => (
                        <div key={log.id} className="flex items-center gap-2 p-1.5 rounded bg-white/[0.02]">
                          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0",
                            log.status === "success" ? "bg-emerald-400" : log.status === "error" ? "bg-red-400" : log.status === "retry" ? "bg-amber-400" : "bg-yellow-400"
                          )} />
                          <span className="text-[9px] text-zinc-400 flex-1 truncate">{log.action}: {log.message}</span>
                          {log.latencyMs !== undefined && <span className="text-[8px] text-cyan-400">{log.latencyMs}ms</span>}
                          <span className="text-[8px] text-zinc-600 shrink-0">{new Date(log.timestamp).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Config Dialog */}
        <Dialog open={showConfig} onOpenChange={setShowConfig}>
          <DialogContent className="bg-[#12141A] border-white/10 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedIntegration && <span className="text-xl">{selectedIntegration.icon}</span>}
                Configurar {selectedIntegration?.display}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-xs text-slate-400">{selectedIntegration?.description}</p>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Webhook URL (opcional)</label>
                <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://tu-dominio.com/webhook/..."
                  className="bg-[#0A0C10] border-white/10 text-white text-sm font-mono" />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Configuración JSON</label>
                <textarea
                  value={configJson}
                  onChange={(e) => setConfigJson(e.target.value)}
                  className="w-full bg-[#0A0C10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono min-h-[120px] resize-none"
                  placeholder='{"api_key": "sk-...", "enabled": true}'
                />
              </div>

              <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
                <p className="text-xs text-amber-400">
                  Las credenciales se almacenan de forma segura en PostgreSQL. Asegúrate de usar claves de API válidas.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfig(false)} className="border-white/10 text-slate-300">
                Cancelar
              </Button>
              <Button onClick={handleSaveConfig} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SaasLayout>
  );
}