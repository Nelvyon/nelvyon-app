/**
 * SaasAPIHub — Public API Keys + Webhooks Management
 * Enterprise-grade API management: key generation, scopes, webhooks, delivery logs.
 */
import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SaasLayout from "@/components/SaasLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SkeletonCardGrid } from "@/components/SkeletonCards";
import {
  Key, Webhook, Plus, Copy, Trash2, Eye, EyeOff, RefreshCw,
  Shield, Clock, Activity, CheckCircle2, XCircle, AlertTriangle,
  Send, RotateCcw, Code, Lock, Unlock, Filter, Download,
  Globe, Zap, BarChart3, ChevronDown, ChevronUp, Loader2,
  FileText, Link2, Settings, Bell
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ── Types ── */
interface APIKey {
  id: string;
  name: string;
  key: string;
  prefix: string;
  scopes: string[];
  status: "active" | "revoked" | "expired";
  created_at: string;
  last_used: string | null;
  expires_at: string | null;
  requests_today: number;
  rate_limit: number;
  ip_whitelist: string[];
}

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  status: "active" | "paused" | "failing";
  secret: string;
  created_at: string;
  last_triggered: string | null;
  success_rate: number;
  total_deliveries: number;
  failed_deliveries: number;
  retry_policy: "none" | "linear" | "exponential";
}

interface DeliveryLog {
  id: string;
  webhook_id: string;
  event: string;
  status: "delivered" | "failed" | "retrying" | "pending";
  status_code: number | null;
  response_time_ms: number | null;
  attempt: number;
  timestamp: string;
  payload_preview: string;
}

/* ── Available Scopes ── */
const API_SCOPES = [
  { id: "contacts:read", label: "Leer Contactos", module: "CRM" },
  { id: "contacts:write", label: "Escribir Contactos", module: "CRM" },
  { id: "deals:read", label: "Leer Deals", module: "CRM" },
  { id: "deals:write", label: "Escribir Deals", module: "CRM" },
  { id: "campaigns:read", label: "Leer Campañas", module: "Marketing" },
  { id: "campaigns:write", label: "Escribir Campañas", module: "Marketing" },
  { id: "tickets:read", label: "Leer Tickets", module: "Helpdesk" },
  { id: "tickets:write", label: "Escribir Tickets", module: "Helpdesk" },
  { id: "social:read", label: "Leer Social", module: "Social" },
  { id: "social:write", label: "Publicar Social", module: "Social" },
  { id: "analytics:read", label: "Leer Analytics", module: "Analytics" },
  { id: "workflows:execute", label: "Ejecutar Workflows", module: "Automation" },
  { id: "webhooks:manage", label: "Gestionar Webhooks", module: "System" },
];

const WEBHOOK_EVENTS = [
  { id: "contact.created", label: "Contacto Creado", module: "CRM" },
  { id: "contact.updated", label: "Contacto Actualizado", module: "CRM" },
  { id: "deal.stage_changed", label: "Deal Cambió Etapa", module: "CRM" },
  { id: "deal.won", label: "Deal Ganado", module: "CRM" },
  { id: "deal.lost", label: "Deal Perdido", module: "CRM" },
  { id: "ticket.created", label: "Ticket Creado", module: "Helpdesk" },
  { id: "ticket.resolved", label: "Ticket Resuelto", module: "Helpdesk" },
  { id: "ticket.sla_breach", label: "SLA Incumplido", module: "Helpdesk" },
  { id: "campaign.sent", label: "Campaña Enviada", module: "Marketing" },
  { id: "campaign.completed", label: "Campaña Completada", module: "Marketing" },
  { id: "payment.received", label: "Pago Recibido", module: "Billing" },
  { id: "invoice.created", label: "Factura Creada", module: "Billing" },
  { id: "workflow.executed", label: "Workflow Ejecutado", module: "Automation" },
  { id: "workflow.failed", label: "Workflow Falló", module: "Automation" },
];

/* ── Mock Data Generators ── */
function generateMockKeys(): APIKey[] {
  return [
    {
      id: "key_1", name: "Production API", key: "nv_live_sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
      prefix: "nv_live_sk_", scopes: ["contacts:read", "contacts:write", "deals:read", "deals:write", "analytics:read"],
      status: "active", created_at: "2026-03-01T10:00:00Z", last_used: "2026-04-12T08:30:00Z",
      expires_at: "2027-03-01T10:00:00Z", requests_today: 1247, rate_limit: 10000, ip_whitelist: ["203.0.113.0/24"],
    },
    {
      id: "key_2", name: "Staging API", key: "nv_test_sk_z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4",
      prefix: "nv_test_sk_", scopes: ["contacts:read", "deals:read", "tickets:read"],
      status: "active", created_at: "2026-02-15T14:00:00Z", last_used: "2026-04-11T22:15:00Z",
      expires_at: null, requests_today: 89, rate_limit: 1000, ip_whitelist: [],
    },
    {
      id: "key_3", name: "Legacy Integration", key: "nv_live_sk_old_deprecated_key_12345",
      prefix: "nv_live_sk_", scopes: ["contacts:read"],
      status: "revoked", created_at: "2025-06-01T09:00:00Z", last_used: "2025-12-20T16:00:00Z",
      expires_at: "2026-01-01T00:00:00Z", requests_today: 0, rate_limit: 5000, ip_whitelist: [],
    },
  ];
}

function generateMockWebhooks(): WebhookEndpoint[] {
  return [
    {
      id: "wh_1", url: "https://app.example.com/webhooks/nelvyon",
      events: ["contact.created", "contact.updated", "deal.stage_changed", "deal.won"],
      status: "active", secret: "whsec_a1b2c3d4e5f6", created_at: "2026-03-10T08:00:00Z",
      last_triggered: "2026-04-12T09:15:00Z", success_rate: 99.2, total_deliveries: 1842,
      failed_deliveries: 15, retry_policy: "exponential",
    },
    {
      id: "wh_2", url: "https://hooks.slack.com/services/T00/B00/xxx",
      events: ["ticket.created", "ticket.sla_breach"],
      status: "active", secret: "whsec_slack_xyz", created_at: "2026-03-20T12:00:00Z",
      last_triggered: "2026-04-12T07:45:00Z", success_rate: 100, total_deliveries: 234,
      failed_deliveries: 0, retry_policy: "linear",
    },
    {
      id: "wh_3", url: "https://old-system.internal/callback",
      events: ["payment.received"],
      status: "failing", secret: "whsec_old_123", created_at: "2025-11-01T10:00:00Z",
      last_triggered: "2026-04-10T14:00:00Z", success_rate: 45.3, total_deliveries: 89,
      failed_deliveries: 49, retry_policy: "none",
    },
  ];
}

function generateMockDeliveries(): DeliveryLog[] {
  const events = WEBHOOK_EVENTS.map(e => e.id);
  const statuses: DeliveryLog["status"][] = ["delivered", "delivered", "delivered", "failed", "retrying"];
  return Array.from({ length: 20 }, (_, i) => ({
    id: `del_${i}`,
    webhook_id: ["wh_1", "wh_2", "wh_3"][i % 3],
    event: events[i % events.length],
    status: statuses[i % statuses.length],
    status_code: statuses[i % statuses.length] === "delivered" ? 200 : statuses[i % statuses.length] === "failed" ? 500 : null,
    response_time_ms: statuses[i % statuses.length] === "delivered" ? 50 + Math.floor(Math.random() * 200) : null,
    attempt: statuses[i % statuses.length] === "retrying" ? 2 : 1,
    timestamp: new Date(Date.now() - i * 3600000).toISOString(),
    payload_preview: `{"type":"${events[i % events.length]}","data":{"id":${1000 + i}}}`,
  }));
}

/* ── Component ── */
export default function SaasAPIHub() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"keys" | "webhooks" | "logs" | "docs">("keys");
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryLog[]>([]);
  const [showKeyValues, setShowKeyValues] = useState<Record<string, boolean>>({});
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);

  // Create key form
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>([]);
  const [newKeyExpiry, setNewKeyExpiry] = useState<"never" | "30d" | "90d" | "1y">("never");

  // Create webhook form
  const [newWhUrl, setNewWhUrl] = useState("");
  const [newWhEvents, setNewWhEvents] = useState<string[]>([]);
  const [newWhRetry, setNewWhRetry] = useState<"none" | "linear" | "exponential">("exponential");

  const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/saas");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setApiKeys(generateMockKeys());
      setWebhooks(generateMockWebhooks());
      setDeliveries(generateMockDeliveries());
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const formatDate = (d?: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado al portapapeles");
  };

  const maskKey = (key: string) => key.substring(0, 12) + "••••••••••••••••" + key.substring(key.length - 4);

  const handleCreateKey = () => {
    if (!newKeyName.trim()) { toast.error("Nombre requerido"); return; }
    if (newKeyScopes.length === 0) { toast.error("Selecciona al menos un scope"); return; }
    const newKey: APIKey = {
      id: `key_${Date.now()}`, name: newKeyName, key: `nv_live_sk_${Math.random().toString(36).substring(2, 34)}`,
      prefix: "nv_live_sk_", scopes: newKeyScopes, status: "active", created_at: new Date().toISOString(),
      last_used: null, expires_at: newKeyExpiry === "never" ? null : new Date(Date.now() + ({ "30d": 30, "90d": 90, "1y": 365 }[newKeyExpiry]) * 86400000).toISOString(),
      requests_today: 0, rate_limit: 10000, ip_whitelist: [],
    };
    setApiKeys(prev => [newKey, ...prev]);
    setShowKeyValues(prev => ({ ...prev, [newKey.id]: true }));
    setShowCreateKey(false);
    setNewKeyName("");
    setNewKeyScopes([]);
    toast.success("API Key creada — copia la clave ahora, no se mostrará de nuevo");
  };

  const handleRevokeKey = (id: string) => {
    setApiKeys(prev => prev.map(k => k.id === id ? { ...k, status: "revoked" as const } : k));
    toast.success("API Key revocada");
  };

  const handleCreateWebhook = () => {
    if (!newWhUrl.trim()) { toast.error("URL requerida"); return; }
    if (newWhEvents.length === 0) { toast.error("Selecciona al menos un evento"); return; }
    const wh: WebhookEndpoint = {
      id: `wh_${Date.now()}`, url: newWhUrl, events: newWhEvents, status: "active",
      secret: `whsec_${Math.random().toString(36).substring(2, 14)}`, created_at: new Date().toISOString(),
      last_triggered: null, success_rate: 100, total_deliveries: 0, failed_deliveries: 0, retry_policy: newWhRetry,
    };
    setWebhooks(prev => [wh, ...prev]);
    setShowCreateWebhook(false);
    setNewWhUrl("");
    setNewWhEvents([]);
    toast.success("Webhook creado");
  };

  const handleDeleteWebhook = (id: string) => {
    setWebhooks(prev => prev.filter(w => w.id !== id));
    toast.success("Webhook eliminado");
  };

  const handleToggleWebhook = (id: string) => {
    setWebhooks(prev => prev.map(w => w.id === id ? { ...w, status: w.status === "active" ? "paused" as const : "active" as const } : w));
  };

  const handleRetryDelivery = (id: string) => {
    setDeliveries(prev => prev.map(d => d.id === id ? { ...d, status: "pending" as const, attempt: d.attempt + 1 } : d));
    toast.success("Reintentando entrega...");
    setTimeout(() => {
      setDeliveries(prev => prev.map(d => d.id === id ? { ...d, status: "delivered" as const, status_code: 200, response_time_ms: 120 } : d));
    }, 1500);
  };

  const toggleScope = (scope: string) => {
    setNewKeyScopes(prev => prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]);
  };

  const toggleEvent = (event: string) => {
    setNewWhEvents(prev => prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]);
  };

  const tabs = [
    { id: "keys" as const, label: "API Keys", icon: Key, count: apiKeys.filter(k => k.status === "active").length },
    { id: "webhooks" as const, label: "Webhooks", icon: Webhook, count: webhooks.length },
    { id: "logs" as const, label: "Delivery Logs", icon: Activity, count: deliveries.filter(d => d.status === "failed").length },
    { id: "docs" as const, label: "API Docs", icon: FileText, count: 0 },
  ];

  const statusColors: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    revoked: "bg-red-500/10 text-red-400 border-red-500/20",
    expired: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    paused: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    failing: "bg-red-500/10 text-red-400 border-red-500/20",
    delivered: "bg-emerald-500/10 text-emerald-400",
    failed: "bg-red-500/10 text-red-400",
    retrying: "bg-amber-500/10 text-amber-400",
    pending: "bg-blue-500/10 text-blue-400",
  };

  if (authLoading) return <SaasLayout><SkeletonCardGrid count={4} /></SaasLayout>;

  return (
    <SaasLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-sky-400" /> API Hub & Webhooks
            </h1>
            <p className="text-xs text-white/40 mt-1">Gestiona claves API públicas, webhooks y monitorea entregas</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/20 text-[10px]">
              v2.1 REST API
            </Badge>
            <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20 text-[10px]">
              Rate Limit: 10K/día
            </Badge>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Keys Activas", value: apiKeys.filter(k => k.status === "active").length, icon: Key, color: "text-emerald-400" },
            { label: "Webhooks", value: webhooks.filter(w => w.status === "active").length, icon: Webhook, color: "text-sky-400" },
            { label: "Requests Hoy", value: apiKeys.reduce((s, k) => s + k.requests_today, 0).toLocaleString(), icon: Zap, color: "text-amber-400" },
            { label: "Entregas Fallidas", value: deliveries.filter(d => d.status === "failed").length, icon: AlertTriangle, color: "text-red-400" },
          ].map((stat) => (
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
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap",
                activeTab === tab.id ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
              )}>
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.count > 0 && (
                <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full",
                  tab.id === "logs" ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white/60"
                )}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? <SkeletonCardGrid count={3} /> : (
          <>
            {/* ═══ API KEYS TAB ═══ */}
            {activeTab === "keys" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-white/50">Claves API para acceso programático a la plataforma</p>
                  <Button onClick={() => setShowCreateKey(!showCreateKey)} size="sm"
                    className="bg-sky-600 hover:bg-sky-500 text-white text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Nueva API Key
                  </Button>
                </div>

                {/* Create Key Form */}
                {showCreateKey && (
                  <div className="bg-white/[0.04] border border-sky-500/20 rounded-xl p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Key className="w-4 h-4 text-sky-400" /> Crear Nueva API Key
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-white/40 uppercase mb-1 block">Nombre</label>
                        <Input value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
                          placeholder="e.g. Production API" className="bg-white/5 border-white/10 text-white text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] text-white/40 uppercase mb-1 block">Expiración</label>
                        <div className="flex gap-2">
                          {(["never", "30d", "90d", "1y"] as const).map(exp => (
                            <button key={exp} onClick={() => setNewKeyExpiry(exp)}
                              className={cn("px-3 py-1.5 rounded-md text-xs transition-all",
                                newKeyExpiry === exp ? "bg-sky-600 text-white" : "bg-white/5 text-white/40 hover:text-white/60")}>
                              {exp === "never" ? "Sin límite" : exp}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 uppercase mb-2 block">Scopes (Permisos)</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {API_SCOPES.map(scope => (
                          <button key={scope.id} onClick={() => toggleScope(scope.id)}
                            className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] transition-all border",
                              newKeyScopes.includes(scope.id)
                                ? "bg-sky-500/10 border-sky-500/30 text-sky-300"
                                : "bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white/60")}>
                            {newKeyScopes.includes(scope.id) ? <CheckCircle2 className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                            <span>{scope.label}</span>
                            <span className="text-[9px] text-white/20 ml-auto">{scope.module}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setShowCreateKey(false)} className="text-white/40 text-xs">Cancelar</Button>
                      <Button onClick={handleCreateKey} className="bg-sky-600 hover:bg-sky-500 text-white text-xs">
                        <Key className="w-3.5 h-3.5 mr-1" /> Generar Key
                      </Button>
                    </div>
                  </div>
                )}

                {/* Keys List */}
                <div className="space-y-3">
                  {apiKeys.map(key => (
                    <div key={key.id} className={cn(
                      "bg-white/[0.03] border rounded-xl p-4 transition-all",
                      key.status === "active" ? "border-white/[0.06]" : "border-white/[0.04] opacity-60"
                    )}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Key className={cn("w-3.5 h-3.5", key.status === "active" ? "text-emerald-400" : "text-zinc-500")} />
                            <span className="text-sm font-medium text-white">{key.name}</span>
                            <Badge className={cn("text-[9px] border", statusColors[key.status])}>
                              {key.status === "active" ? "Activa" : key.status === "revoked" ? "Revocada" : "Expirada"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <code className="text-[11px] font-mono text-white/50 bg-white/5 px-2 py-1 rounded">
                              {showKeyValues[key.id] ? key.key : maskKey(key.key)}
                            </code>
                            <button onClick={() => setShowKeyValues(prev => ({ ...prev, [key.id]: !prev[key.id] }))}
                              className="text-white/30 hover:text-white/60 transition-colors">
                              {showKeyValues[key.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => copyToClipboard(key.key)}
                              className="text-white/30 hover:text-white/60 transition-colors">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] text-white/30">
                          <div className="text-center">
                            <p className="text-white/60 font-medium">{key.requests_today.toLocaleString()}</p>
                            <p>requests hoy</p>
                          </div>
                          <div className="text-center">
                            <p className="text-white/60 font-medium">{key.rate_limit.toLocaleString()}</p>
                            <p>rate limit</p>
                          </div>
                          <div className="text-center">
                            <p className="text-white/60 font-medium">{key.scopes.length}</p>
                            <p>scopes</p>
                          </div>
                          {key.status === "active" && (
                            <Button variant="ghost" size="sm" onClick={() => handleRevokeKey(key.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-3">
                        {key.scopes.map(s => (
                          <span key={s} className="text-[9px] bg-white/5 text-white/40 px-2 py-0.5 rounded-full">{s}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-[10px] text-white/25">
                        <span>Creada: {formatDate(key.created_at)}</span>
                        <span>Último uso: {formatDate(key.last_used)}</span>
                        {key.expires_at && <span>Expira: {formatDate(key.expires_at)}</span>}
                        {key.ip_whitelist.length > 0 && (
                          <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> IP Whitelist: {key.ip_whitelist.join(", ")}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ WEBHOOKS TAB ═══ */}
            {activeTab === "webhooks" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-white/50">Endpoints que reciben notificaciones en tiempo real</p>
                  <Button onClick={() => setShowCreateWebhook(!showCreateWebhook)} size="sm"
                    className="bg-violet-600 hover:bg-violet-500 text-white text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Nuevo Webhook
                  </Button>
                </div>

                {/* Create Webhook Form */}
                {showCreateWebhook && (
                  <div className="bg-white/[0.04] border border-violet-500/20 rounded-xl p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Webhook className="w-4 h-4 text-violet-400" /> Crear Webhook
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-white/40 uppercase mb-1 block">URL del Endpoint</label>
                        <Input value={newWhUrl} onChange={e => setNewWhUrl(e.target.value)}
                          placeholder="https://your-app.com/webhooks" className="bg-white/5 border-white/10 text-white text-xs font-mono" />
                      </div>
                      <div>
                        <label className="text-[10px] text-white/40 uppercase mb-1 block">Política de Reintentos</label>
                        <div className="flex gap-2">
                          {(["none", "linear", "exponential"] as const).map(r => (
                            <button key={r} onClick={() => setNewWhRetry(r)}
                              className={cn("px-3 py-1.5 rounded-md text-xs transition-all",
                                newWhRetry === r ? "bg-violet-600 text-white" : "bg-white/5 text-white/40 hover:text-white/60")}>
                              {r === "none" ? "Sin reintentos" : r === "linear" ? "Lineal" : "Exponencial"}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 uppercase mb-2 block">Eventos a Suscribir</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {WEBHOOK_EVENTS.map(ev => (
                          <button key={ev.id} onClick={() => toggleEvent(ev.id)}
                            className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] transition-all border",
                              newWhEvents.includes(ev.id)
                                ? "bg-violet-500/10 border-violet-500/30 text-violet-300"
                                : "bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white/60")}>
                            {newWhEvents.includes(ev.id) ? <Bell className="w-3 h-3" /> : <Bell className="w-3 h-3 opacity-30" />}
                            <span>{ev.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setShowCreateWebhook(false)} className="text-white/40 text-xs">Cancelar</Button>
                      <Button onClick={handleCreateWebhook} className="bg-violet-600 hover:bg-violet-500 text-white text-xs">
                        <Webhook className="w-3.5 h-3.5 mr-1" /> Crear Webhook
                      </Button>
                    </div>
                  </div>
                )}

                {/* Webhooks List */}
                <div className="space-y-3">
                  {webhooks.map(wh => (
                    <div key={wh.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
                      <div className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Webhook className={cn("w-3.5 h-3.5",
                                wh.status === "active" ? "text-emerald-400" : wh.status === "failing" ? "text-red-400" : "text-amber-400")} />
                              <code className="text-xs font-mono text-white/70 truncate max-w-[300px]">{wh.url}</code>
                              <Badge className={cn("text-[9px] border", statusColors[wh.status])}>
                                {wh.status === "active" ? "Activo" : wh.status === "paused" ? "Pausado" : "Fallando"}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {wh.events.map(e => (
                                <span key={e} className="text-[9px] bg-violet-500/10 text-violet-300 px-2 py-0.5 rounded-full">{e}</span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-center text-[10px]">
                              <p className={cn("font-medium", wh.success_rate >= 95 ? "text-emerald-400" : wh.success_rate >= 70 ? "text-amber-400" : "text-red-400")}>
                                {wh.success_rate}%
                              </p>
                              <p className="text-white/30">éxito</p>
                            </div>
                            <div className="text-center text-[10px]">
                              <p className="text-white/60 font-medium">{wh.total_deliveries}</p>
                              <p className="text-white/30">entregas</p>
                            </div>
                            <Switch checked={wh.status === "active"} onCheckedChange={() => handleToggleWebhook(wh.id)} />
                            <button onClick={() => setExpandedWebhook(expandedWebhook === wh.id ? null : wh.id)}
                              className="text-white/30 hover:text-white/60">
                              {expandedWebhook === wh.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            <button onClick={() => handleDeleteWebhook(wh.id)}
                              className="text-red-400/50 hover:text-red-400">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                      {expandedWebhook === wh.id && (
                        <div className="border-t border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px]">
                            <div>
                              <p className="text-white/30 uppercase">Secret</p>
                              <code className="text-white/50 font-mono">{wh.secret}</code>
                            </div>
                            <div>
                              <p className="text-white/30 uppercase">Reintentos</p>
                              <p className="text-white/60">{wh.retry_policy === "none" ? "Sin reintentos" : wh.retry_policy === "linear" ? "Lineal (3x)" : "Exponencial (5x)"}</p>
                            </div>
                            <div>
                              <p className="text-white/30 uppercase">Último Trigger</p>
                              <p className="text-white/60">{formatDate(wh.last_triggered)}</p>
                            </div>
                            <div>
                              <p className="text-white/30 uppercase">Fallos</p>
                              <p className={cn("font-medium", wh.failed_deliveries > 0 ? "text-red-400" : "text-emerald-400")}>
                                {wh.failed_deliveries}
                              </p>
                            </div>
                          </div>
                          {/* Recent deliveries for this webhook */}
                          <div>
                            <p className="text-[10px] text-white/30 uppercase mb-2">Últimas Entregas</p>
                            <div className="space-y-1">
                              {deliveries.filter(d => d.webhook_id === wh.id).slice(0, 5).map(d => (
                                <div key={d.id} className="flex items-center gap-3 text-[10px] py-1.5 px-2 rounded bg-white/[0.02]">
                                  <span className={cn("w-1.5 h-1.5 rounded-full",
                                    d.status === "delivered" ? "bg-emerald-400" : d.status === "failed" ? "bg-red-400" : "bg-amber-400")} />
                                  <span className="text-white/50 font-mono">{d.event}</span>
                                  <span className="text-white/30 ml-auto">{d.status_code || "—"}</span>
                                  <span className="text-white/30">{d.response_time_ms ? `${d.response_time_ms}ms` : "—"}</span>
                                  <span className="text-white/20">{formatDate(d.timestamp)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ DELIVERY LOGS TAB ═══ */}
            {activeTab === "logs" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-white/50">Registro de todas las entregas de webhooks</p>
                  <Button variant="ghost" size="sm" className="text-white/40 text-xs"
                    onClick={() => { toast.success("Exportando logs..."); }}>
                    <Download className="w-3.5 h-3.5 mr-1" /> Exportar CSV
                  </Button>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <th className="text-left text-white/30 uppercase font-medium px-4 py-3">Estado</th>
                          <th className="text-left text-white/30 uppercase font-medium px-4 py-3">Evento</th>
                          <th className="text-left text-white/30 uppercase font-medium px-4 py-3">Webhook</th>
                          <th className="text-left text-white/30 uppercase font-medium px-4 py-3">HTTP</th>
                          <th className="text-left text-white/30 uppercase font-medium px-4 py-3">Latencia</th>
                          <th className="text-left text-white/30 uppercase font-medium px-4 py-3">Intento</th>
                          <th className="text-left text-white/30 uppercase font-medium px-4 py-3">Fecha</th>
                          <th className="text-left text-white/30 uppercase font-medium px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {deliveries.map(d => {
                          const wh = webhooks.find(w => w.id === d.webhook_id);
                          return (
                            <tr key={d.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-2.5">
                                <Badge className={cn("text-[9px]", statusColors[d.status])}>
                                  {d.status === "delivered" ? "✓ Entregado" : d.status === "failed" ? "✗ Fallido" : d.status === "retrying" ? "↻ Reintentando" : "⏳ Pendiente"}
                                </Badge>
                              </td>
                              <td className="px-4 py-2.5 font-mono text-white/50">{d.event}</td>
                              <td className="px-4 py-2.5 text-white/40 truncate max-w-[150px]">{wh?.url || d.webhook_id}</td>
                              <td className="px-4 py-2.5">
                                <span className={cn("font-mono",
                                  d.status_code === 200 ? "text-emerald-400" : d.status_code && d.status_code >= 400 ? "text-red-400" : "text-white/30"
                                )}>{d.status_code || "—"}</span>
                              </td>
                              <td className="px-4 py-2.5 text-white/40">{d.response_time_ms ? `${d.response_time_ms}ms` : "—"}</td>
                              <td className="px-4 py-2.5 text-white/40">#{d.attempt}</td>
                              <td className="px-4 py-2.5 text-white/30">{formatDate(d.timestamp)}</td>
                              <td className="px-4 py-2.5">
                                {d.status === "failed" && (
                                  <button onClick={() => handleRetryDelivery(d.id)}
                                    className="text-amber-400 hover:text-amber-300 transition-colors">
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ API DOCS TAB ═══ */}
            {activeTab === "docs" && (
              <div className="space-y-6">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                    <Code className="w-4 h-4 text-sky-400" /> API Reference — Quick Start
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] text-white/40 uppercase mb-2">Base URL</p>
                      <code className="text-xs font-mono text-sky-300 bg-sky-500/10 px-3 py-1.5 rounded block">
                        https://api.nelvyon.com/v2
                      </code>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 uppercase mb-2">Autenticación</p>
                      <div className="bg-zinc-900 rounded-lg p-4 font-mono text-xs text-white/70 overflow-x-auto">
                        <pre>{`curl -X GET "https://api.nelvyon.com/v2/contacts" \\
  -H "Authorization: Bearer nv_live_sk_your_key_here" \\
  -H "Content-Type: application/json"`}</pre>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { method: "GET", path: "/contacts", desc: "Listar contactos", scope: "contacts:read" },
                        { method: "POST", path: "/contacts", desc: "Crear contacto", scope: "contacts:write" },
                        { method: "GET", path: "/deals", desc: "Listar deals", scope: "deals:read" },
                        { method: "POST", path: "/deals", desc: "Crear deal", scope: "deals:write" },
                        { method: "GET", path: "/tickets", desc: "Listar tickets", scope: "tickets:read" },
                        { method: "POST", path: "/tickets", desc: "Crear ticket", scope: "tickets:write" },
                        { method: "GET", path: "/campaigns", desc: "Listar campañas", scope: "campaigns:read" },
                        { method: "POST", path: "/workflows/execute", desc: "Ejecutar workflow", scope: "workflows:execute" },
                      ].map(ep => (
                        <div key={ep.path + ep.method} className="flex items-center gap-3 bg-white/[0.02] rounded-lg p-3">
                          <Badge className={cn("text-[9px] font-mono",
                            ep.method === "GET" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                          )}>{ep.method}</Badge>
                          <code className="text-[11px] font-mono text-white/60">{ep.path}</code>
                          <span className="text-[10px] text-white/30 ml-auto">{ep.scope}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 uppercase mb-2">Webhook Payload Example</p>
                      <div className="bg-zinc-900 rounded-lg p-4 font-mono text-xs text-white/70 overflow-x-auto">
                        <pre>{`{
  "id": "evt_abc123",
  "type": "contact.created",
  "created_at": "2026-04-12T10:00:00Z",
  "data": {
    "id": 1042,
    "name": "María García",
    "email": "maria@example.com",
    "phone": "+34 612 345 678",
    "source": "web_form"
  },
  "webhook": {
    "id": "wh_1",
    "delivery_id": "del_xyz789"
  }
}`}</pre>
                      </div>
                    </div>
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                      <p className="text-xs text-amber-300 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        <strong>Verificación de Webhooks:</strong> Cada entrega incluye un header <code className="bg-white/5 px-1 rounded">X-Nelvyon-Signature</code> con HMAC-SHA256 del payload usando tu webhook secret.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </SaasLayout>
  );
}