/**
 * SaasSystemLogs — Compliance and Governance Center
 * GDPR tools, data export, retention policies, audit logs with export, compliance checklist.
 */
import { useState, useEffect } from "react";
import SaasLayout from "@/components/SaasLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SkeletonCardGrid } from "@/components/SkeletonCards";
import {
  AlertTriangle, CheckCircle2, XCircle, Info, Download, Search,
  Clock, FileText, Eye, Archive, Scale, ShieldCheck, Shield, Users,
  Lock, Globe, Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type LogLevel = "info" | "warn" | "error" | "success";

interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  user?: string;
  ip?: string;
}

interface RetentionPolicy {
  id: string;
  data_type: string;
  retention_days: number;
  auto_delete: boolean;
  last_purge: string | null;
  records_affected: number;
}

interface ComplianceItem {
  id: string;
  framework: string;
  requirement: string;
  status: "compliant" | "partial" | "non_compliant" | "not_applicable";
  notes: string;
  last_reviewed: string;
}

interface DataExportRequest {
  id: string;
  user_email: string;
  type: "full_export" | "deletion" | "portability";
  status: "pending" | "processing" | "completed" | "failed";
  requested_at: string;
  completed_at: string | null;
  file_size_mb: number | null;
}

const LEVEL_CONFIG: Record<LogLevel, { icon: typeof Info; color: string; label: string }> = {
  info: { icon: Info, color: "text-blue-400", label: "INFO" },
  warn: { icon: AlertTriangle, color: "text-amber-400", label: "WARN" },
  error: { icon: XCircle, color: "text-red-400", label: "ERROR" },
  success: { icon: CheckCircle2, color: "text-emerald-400", label: "OK" },
};

const MODULES = ["API", "Auth", "Database", "CRM", "Social", "Helpdesk", "Contracts", "Agents", "System", "Billing"];

function generateMockLogs(): LogEntry[] {
  const entries: { module: string; level: LogLevel; msg: string; user?: string }[] = [
    { module: "Auth", level: "success", msg: "User login successful: admin@nelvyon.com", user: "admin@nelvyon.com" },
    { module: "API", level: "info", msg: "Request processed: GET /api/v1/entities/contacts (200)" },
    { module: "Auth", level: "warn", msg: "Failed login attempt from IP 185.220.101.42", user: "unknown" },
    { module: "Database", level: "success", msg: "Connection pool healthy: 5/10 active connections" },
    { module: "CRM", level: "info", msg: "Contact created: ID #1042 by admin@nelvyon.com", user: "admin@nelvyon.com" },
    { module: "API", level: "warn", msg: "Slow query detected: GET /api/v1/analytics/crm (1.2s)" },
    { module: "Social", level: "error", msg: "Failed to publish to LinkedIn: Token expired" },
    { module: "Helpdesk", level: "info", msg: "SLA breach alert: Ticket #234 exceeded response time" },
    { module: "Billing", level: "success", msg: "Payment processed: $89.00 from client@example.com", user: "client@example.com" },
    { module: "System", level: "info", msg: "Backup completed: 2.3GB compressed, stored in S3" },
    { module: "Agents", level: "success", msg: "AI Agent Sales Bot processed 15 conversations" },
    { module: "Contracts", level: "info", msg: "Contract #89 signed digitally by both parties" },
    { module: "Auth", level: "warn", msg: "2FA disabled by user: carlos@nelvyon.com", user: "carlos@nelvyon.com" },
    { module: "Database", level: "warn", msg: "Query timeout on table social_posts (>5s)" },
    { module: "API", level: "error", msg: "Service unavailable: Backend returned 503" },
    { module: "System", level: "info", msg: "Data retention policy executed: 1200 records purged" },
  ];
  return entries.map((e, i) => ({
    id: `log_${i}`,
    timestamp: new Date(Date.now() - i * 1800000).toISOString(),
    level: e.level, module: e.module, message: e.msg, user: e.user,
    ip: `192.168.1.${10 + (i % 50)}`,
  }));
}

function generateMockRetention(): RetentionPolicy[] {
  return [
    { id: "ret1", data_type: "Audit Logs", retention_days: 365, auto_delete: true, last_purge: "2026-04-01T02:00:00Z", records_affected: 12400 },
    { id: "ret2", data_type: "System Logs", retention_days: 90, auto_delete: true, last_purge: "2026-04-10T02:00:00Z", records_affected: 45200 },
    { id: "ret3", data_type: "Session Data", retention_days: 30, auto_delete: true, last_purge: "2026-04-11T02:00:00Z", records_affected: 890 },
    { id: "ret4", data_type: "Deleted Contacts", retention_days: 30, auto_delete: false, last_purge: null, records_affected: 0 },
    { id: "ret5", data_type: "Email Campaigns", retention_days: 180, auto_delete: false, last_purge: null, records_affected: 0 },
    { id: "ret6", data_type: "Webhook Delivery Logs", retention_days: 60, auto_delete: true, last_purge: "2026-04-05T02:00:00Z", records_affected: 8900 },
  ];
}

function generateMockCompliance(): ComplianceItem[] {
  return [
    { id: "c1", framework: "GDPR", requirement: "Derecho al olvido (Art. 17)", status: "compliant", notes: "Endpoint DELETE /api/v1/gdpr/erasure", last_reviewed: "2026-04-01" },
    { id: "c2", framework: "GDPR", requirement: "Portabilidad de datos (Art. 20)", status: "compliant", notes: "Export JSON/CSV disponible", last_reviewed: "2026-04-01" },
    { id: "c3", framework: "GDPR", requirement: "Consentimiento explícito (Art. 7)", status: "compliant", notes: "Cookie banner + consent management", last_reviewed: "2026-03-15" },
    { id: "c4", framework: "GDPR", requirement: "DPO designado (Art. 37)", status: "partial", notes: "DPO interno asignado, pendiente registro", last_reviewed: "2026-03-01" },
    { id: "c5", framework: "SOC 2", requirement: "Cifrado en transito (CC6.1)", status: "compliant", notes: "TLS 1.3 en todas las comunicaciones", last_reviewed: "2026-04-01" },
    { id: "c6", framework: "SOC 2", requirement: "Control de acceso (CC6.3)", status: "compliant", notes: "RBAC + 2FA + SSO implementado", last_reviewed: "2026-04-01" },
    { id: "c7", framework: "SOC 2", requirement: "Monitoreo continuo (CC7.2)", status: "partial", notes: "Logs y alertas activos, pendiente SIEM", last_reviewed: "2026-03-15" },
    { id: "c8", framework: "HIPAA", requirement: "Cifrado en reposo", status: "compliant", notes: "AES-256 en DB y storage", last_reviewed: "2026-04-01" },
    { id: "c9", framework: "HIPAA", requirement: "Audit trail", status: "compliant", notes: "Audit log con retencion 1 anio", last_reviewed: "2026-04-01" },
    { id: "c10", framework: "HIPAA", requirement: "BAA con proveedores", status: "non_compliant", notes: "Pendiente firma BAA con cloud provider", last_reviewed: "2026-02-15" },
  ];
}

function generateMockExports(): DataExportRequest[] {
  return [
    { id: "exp1", user_email: "maria@example.com", type: "full_export", status: "completed", requested_at: "2026-04-10T14:00:00Z", completed_at: "2026-04-10T14:05:00Z", file_size_mb: 12.4 },
    { id: "exp2", user_email: "carlos@example.com", type: "deletion", status: "completed", requested_at: "2026-04-08T10:00:00Z", completed_at: "2026-04-08T10:02:00Z", file_size_mb: null },
    { id: "exp3", user_email: "ana@example.com", type: "portability", status: "processing", requested_at: "2026-04-12T08:00:00Z", completed_at: null, file_size_mb: null },
    { id: "exp4", user_email: "pedro@example.com", type: "full_export", status: "pending", requested_at: "2026-04-12T09:30:00Z", completed_at: null, file_size_mb: null },
  ];
}

export default function SaasSystemLogs() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"logs" | "retention" | "compliance" | "gdpr" | "privacy">("logs");
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [retention, setRetention] = useState<RetentionPolicy[]>([]);
  const [compliance, setCompliance] = useState<ComplianceItem[]>([]);
  const [exports, setExports] = useState<DataExportRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<LogLevel | "all">("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [cookieConsent, setCookieConsent] = useState(true);
  const [analyticsTracking, setAnalyticsTracking] = useState(true);
  const [anonymizeIPs, setAnonymizeIPs] = useState(false);
  const [autoDeleteInactive, setAutoDeleteInactive] = useState(true);
  const [inactiveDays, setInactiveDays] = useState(365);

  useEffect(() => {
    if (!authLoading && !user) navigate("/saas");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLogs(generateMockLogs());
      setRetention(generateMockRetention());
      setCompliance(generateMockCompliance());
      setExports(generateMockExports());
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const formatDate = (d?: string | null) => {
    if (!d) return "\u2014";
    return new Date(d).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const filteredLogs = logs.filter(log => {
    if (levelFilter !== "all" && log.level !== levelFilter) return false;
    if (moduleFilter !== "all" && log.module !== moduleFilter) return false;
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleExportLogs = (format: "csv" | "json") => {
    const data = format === "json"
      ? JSON.stringify(filteredLogs, null, 2)
      : ["timestamp,level,module,message,user,ip",
         ...filteredLogs.map(l => `${l.timestamp},${l.level},${l.module},"${l.message}",${l.user || ""},${l.ip || ""}`)
        ].join("\n");
    const blob = new Blob([data], { type: format === "json" ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nelvyon-logs-${new Date().toISOString().split("T")[0]}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Logs exportados como ${format.toUpperCase()}`);
  };

  const handleToggleRetention = (id: string) => {
    setRetention(prev => prev.map(r => r.id === id ? { ...r, auto_delete: !r.auto_delete } : r));
    toast.success("Politica actualizada");
  };

  const handleUpdateRetentionDays = (id: string, days: number) => {
    setRetention(prev => prev.map(r => r.id === id ? { ...r, retention_days: days } : r));
  };

  const complianceScore = compliance.length > 0
    ? Math.round((compliance.filter(c => c.status === "compliant").length / compliance.length) * 100)
    : 0;

  const complianceByFramework = compliance.reduce((acc, item) => {
    if (!acc[item.framework]) acc[item.framework] = [];
    acc[item.framework].push(item);
    return acc;
  }, {} as Record<string, ComplianceItem[]>);

  const statusBadge: Record<string, { color: string; label: string }> = {
    compliant: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Cumple" },
    partial: { color: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "Parcial" },
    non_compliant: { color: "bg-red-500/10 text-red-400 border-red-500/20", label: "No Cumple" },
    not_applicable: { color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20", label: "N/A" },
  };

  const exportStatusBadge: Record<string, { color: string; label: string }> = {
    pending: { color: "bg-blue-500/10 text-blue-400", label: "Pendiente" },
    processing: { color: "bg-amber-500/10 text-amber-400", label: "Procesando" },
    completed: { color: "bg-emerald-500/10 text-emerald-400", label: "Completado" },
    failed: { color: "bg-red-500/10 text-red-400", label: "Fallido" },
  };

  const tabs = [
    { id: "logs" as const, label: "System Logs", icon: FileText },
    { id: "retention" as const, label: "Retencion", icon: Archive },
    { id: "compliance" as const, label: "Compliance", icon: Scale },
    { id: "gdpr" as const, label: "GDPR / Data", icon: Shield },
    { id: "privacy" as const, label: "Privacidad", icon: Eye },
  ];

  if (authLoading) return <SaasLayout><SkeletonCardGrid count={4} /></SaasLayout>;

  return (
    <SaasLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-violet-400" /> Compliance y Governance
            </h1>
            <p className="text-xs text-white/40 mt-1">Logs, retencion de datos, GDPR y cumplimiento normativo</p>
          </div>
          <Badge className={cn("text-[10px] border",
            complianceScore >= 80 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
            complianceScore >= 60 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
            "bg-red-500/10 text-red-400 border-red-500/20"
          )}>
            <ShieldCheck className="w-3 h-3 mr-1" /> Score: {complianceScore}%
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Log Entries", value: logs.length, icon: FileText, color: "text-sky-400" },
            { label: "Errores (24h)", value: logs.filter(l => l.level === "error").length, icon: XCircle, color: "text-red-400" },
            { label: "Compliance", value: `${complianceScore}%`, icon: ShieldCheck, color: complianceScore >= 80 ? "text-emerald-400" : "text-amber-400" },
            { label: "Data Requests", value: exports.filter(e => e.status === "pending" || e.status === "processing").length, icon: Users, color: "text-violet-400" },
            { label: "Retencion Activa", value: retention.filter(r => r.auto_delete).length, icon: Archive, color: "text-amber-400" },
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
            {activeTab === "logs" && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                    <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Buscar en logs..." className="pl-9 bg-white/5 border-white/10 text-white text-xs" />
                  </div>
                  <div className="flex gap-1">
                    {(["all", "info", "warn", "error", "success"] as const).map(level => (
                      <button key={level} onClick={() => setLevelFilter(level)}
                        className={cn("px-3 py-1.5 rounded-md text-[11px] transition-all",
                          levelFilter === level ? "bg-white/10 text-white" : "bg-white/[0.03] text-white/40 hover:text-white/60")}>
                        {level === "all" ? "Todos" : LEVEL_CONFIG[level]?.label}
                      </button>
                    ))}
                  </div>
                  <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}
                    className="bg-white/5 border border-white/10 text-white text-xs rounded-md px-3 py-1.5">
                    <option value="all">Todos los modulos</option>
                    {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleExportLogs("csv")} className="text-white/40 text-xs">
                      <Download className="w-3.5 h-3.5 mr-1" /> CSV
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleExportLogs("json")} className="text-white/40 text-xs">
                      <Download className="w-3.5 h-3.5 mr-1" /> JSON
                    </Button>
                  </div>
                </div>

                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
                  <div className="max-h-[500px] overflow-y-auto">
                    {filteredLogs.map(log => {
                      const config = LEVEL_CONFIG[log.level];
                      const Icon = config.icon;
                      return (
                        <div key={log.id} className="flex items-start gap-3 px-4 py-2.5 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                          <Icon className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", config.color)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-white/70">{log.message}</p>
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-white/25">
                              <span>{formatDate(log.timestamp)}</span>
                              <Badge className="text-[9px] bg-white/5 text-white/40">{log.module}</Badge>
                              {log.user && <span>{log.user}</span>}
                              {log.ip && <span>{log.ip}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="px-4 py-2 border-t border-white/[0.06] text-[10px] text-white/30">
                    Mostrando {filteredLogs.length} de {logs.length} entradas
                  </div>
                </div>
              </div>
            )}

            {activeTab === "retention" && (
              <div className="space-y-4">
                <p className="text-xs text-white/50">Configura cuanto tiempo se retienen los datos antes de ser purgados</p>
                <div className="space-y-3">
                  {retention.map(policy => (
                    <div key={policy.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Archive className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-sm font-medium text-white">{policy.data_type}</span>
                            {policy.auto_delete && (
                              <Badge className="bg-amber-500/10 text-amber-400 text-[9px]">Auto-purge</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-[10px] text-white/30 mt-1">
                            <span>Ultima purga: {formatDate(policy.last_purge)}</span>
                            {policy.records_affected > 0 && (
                              <span>{policy.records_affected.toLocaleString()} registros purgados</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-white/40">Dias:</span>
                            <div className="flex gap-1">
                              {[30, 60, 90, 180, 365].map(d => (
                                <button key={d} onClick={() => handleUpdateRetentionDays(policy.id, d)}
                                  className={cn("px-2 py-1 rounded text-[10px] transition-all",
                                    policy.retention_days === d ? "bg-amber-600 text-white" : "bg-white/5 text-white/40 hover:text-white/60")}>
                                  {d}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-white/40">Auto:</span>
                            <Switch checked={policy.auto_delete} onCheckedChange={() => handleToggleRetention(policy.id)} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "compliance" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {Object.entries(complianceByFramework).map(([framework, items]) => {
                    const compliantCount = items.filter(i => i.status === "compliant").length;
                    const score = Math.round((compliantCount / items.length) * 100);
                    return (
                      <div key={framework} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center">
                        <p className="text-xs font-bold text-white">{framework}</p>
                        <p className={cn("text-2xl font-bold mt-1",
                          score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400"
                        )}>{score}%</p>
                        <p className="text-[10px] text-white/30">{compliantCount}/{items.length} requisitos</p>
                      </div>
                    );
                  })}
                </div>

                {Object.entries(complianceByFramework).map(([framework, items]) => (
                  <div key={framework} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-white mb-3">{framework}</h3>
                    <div className="space-y-2">
                      {items.map(item => (
                        <div key={item.id} className="flex items-center justify-between bg-white/[0.02] rounded-lg p-3">
                          <div className="flex-1">
                            <p className="text-xs text-white/70">{item.requirement}</p>
                            <p className="text-[10px] text-white/30 mt-0.5">{item.notes}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-white/20">{item.last_reviewed}</span>
                            <Badge className={cn("text-[9px] border", statusBadge[item.status]?.color)}>
                              {statusBadge[item.status]?.label}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "gdpr" && (
              <div className="space-y-4">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                    <Shield className="w-4 h-4 text-violet-400" /> Solicitudes de Datos (GDPR Art. 15-20)
                  </h3>
                  <div className="space-y-2">
                    {exports.map(exp => (
                      <div key={exp.id} className="flex items-center justify-between bg-white/[0.02] rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center",
                            exp.type === "deletion" ? "bg-red-500/10" : exp.type === "portability" ? "bg-violet-500/10" : "bg-sky-500/10"
                          )}>
                            {exp.type === "deletion" ? <Trash2 className="w-4 h-4 text-red-400" /> :
                             exp.type === "portability" ? <Globe className="w-4 h-4 text-violet-400" /> :
                             <Download className="w-4 h-4 text-sky-400" />}
                          </div>
                          <div>
                            <p className="text-xs text-white/70">{exp.user_email}</p>
                            <p className="text-[10px] text-white/30">
                              {exp.type === "full_export" ? "Exportacion completa" :
                               exp.type === "deletion" ? "Derecho al olvido" : "Portabilidad"}
                              {" \u2022 "}{formatDate(exp.requested_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {exp.file_size_mb && (
                            <span className="text-[10px] text-white/30">{exp.file_size_mb} MB</span>
                          )}
                          <Badge className={cn("text-[9px]", exportStatusBadge[exp.status]?.color)}>
                            {exportStatusBadge[exp.status]?.label}
                          </Badge>
                          {exp.status === "completed" && exp.type !== "deletion" && (
                            <Button variant="ghost" size="sm" className="text-sky-400 text-xs"
                              onClick={() => toast.success("Descargando paquete de datos...")}>
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                    <Users className="w-4 h-4 text-sky-400" /> Herramientas GDPR
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button onClick={() => toast.success("Generando paquete de datos...")}
                      className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-left hover:bg-white/[0.04] transition-all">
                      <Download className="w-5 h-5 text-sky-400 mb-2" />
                      <p className="text-xs font-medium text-white">Exportar Datos Usuario</p>
                      <p className="text-[10px] text-white/30 mt-1">Art. 15 - Generar paquete completo</p>
                    </button>
                    <button onClick={() => toast.success("Proceso de eliminacion iniciado...")}
                      className="bg-white/[0.02] border border-red-500/10 rounded-xl p-4 text-left hover:bg-red-500/5 transition-all">
                      <Trash2 className="w-5 h-5 text-red-400 mb-2" />
                      <p className="text-xs font-medium text-white">Eliminar Datos Usuario</p>
                      <p className="text-[10px] text-white/30 mt-1">Art. 17 - Derecho al olvido</p>
                    </button>
                    <button onClick={() => toast.success("Generando informe de procesamiento...")}
                      className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-left hover:bg-white/[0.04] transition-all">
                      <FileText className="w-5 h-5 text-violet-400 mb-2" />
                      <p className="text-xs font-medium text-white">Registro de Actividades</p>
                      <p className="text-[10px] text-white/30 mt-1">Art. 30 - Registro de procesamiento</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "privacy" && (
              <div className="space-y-4">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                    <Eye className="w-4 h-4 text-sky-400" /> Configuracion de Privacidad
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: "Cookie Consent Banner", desc: "Mostrar banner de consentimiento de cookies", value: cookieConsent, onChange: setCookieConsent, icon: Globe },
                      { label: "Analytics Tracking", desc: "Recopilar datos de uso anonimizados", value: analyticsTracking, onChange: setAnalyticsTracking, icon: Eye },
                      { label: "Anonimizar IPs", desc: "Enmascarar ultimos octetos de IP en logs", value: anonymizeIPs, onChange: setAnonymizeIPs, icon: Lock },
                      { label: "Auto-eliminar Inactivos", desc: `Eliminar cuentas inactivas despues de ${inactiveDays} dias`, value: autoDeleteInactive, onChange: setAutoDeleteInactive, icon: Clock },
                    ].map(setting => (
                      <div key={setting.label} className="flex items-center justify-between bg-white/[0.02] rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <setting.icon className="w-4 h-4 text-white/40" />
                          <div>
                            <p className="text-xs font-medium text-white">{setting.label}</p>
                            <p className="text-[10px] text-white/30">{setting.desc}</p>
                          </div>
                        </div>
                        <Switch checked={setting.value} onCheckedChange={setting.onChange} />
                      </div>
                    ))}
                  </div>
                </div>

                {autoDeleteInactive && (
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
                    <h4 className="text-xs font-semibold text-white mb-3">Periodo de Inactividad</h4>
                    <div className="flex gap-2">
                      {[90, 180, 365, 730].map(d => (
                        <button key={d} onClick={() => setInactiveDays(d)}
                          className={cn("px-4 py-2 rounded-lg text-xs transition-all",
                            inactiveDays === d ? "bg-sky-600 text-white" : "bg-white/5 text-white/40 hover:text-white/60")}>
                          {d} dias
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                  <p className="text-xs text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Los cambios en privacidad afectan a todos los tenants. Revisa con tu DPO antes de modificar.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </SaasLayout>
  );
}