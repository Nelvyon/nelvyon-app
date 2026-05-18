import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import E2EFlowBanner from "@/components/E2EFlowBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, CheckCircle2, XCircle, Clock, AlertTriangle,
  RefreshCw, TrendingUp, Ban, Loader2, Hammer,
  Shield, ScrollText, UserCog, ArrowRight, Image, FileText, Share2
} from "lucide-react";
import { api, type NelvyonOutput, type NelvyonProject, type NelvyonClient, type QADashboardStats } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { buildE2EUrl, parseE2EParams } from "@/lib/e2e-flow";

/* ═══════════════════════════════════════════════
   RBAC — Roles & Permissions
═══════════════════════════════════════════════ */
type Role = "Admin" | "Manager" | "Editor" | "Visor";
const ROLES: Role[] = ["Admin", "Manager", "Editor", "Visor"];

interface Permission {
  validate: boolean;
  viewDetail: boolean;
  viewLogs: boolean;
}

const ROLE_PERMISSIONS: Record<Role, Permission> = {
  Admin:   { validate: true,  viewDetail: true,  viewLogs: true },
  Manager: { validate: true,  viewDetail: true,  viewLogs: true },
  Editor:  { validate: false, viewDetail: true,  viewLogs: false },
  Visor:   { validate: false, viewDetail: true,  viewLogs: false },
};

const ROLE_COLORS: Record<Role, string> = {
  Admin: "bg-red-500/20 text-red-300 border-red-500/30",
  Manager: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  Editor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  Visor: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
};

/* ═══════════════════════════════════════════════
   Audit Trail
═══════════════════════════════════════════════ */
interface AuditEntry {
  id: string;
  action: string;
  detail: string;
  user: string;
  role: Role;
  timestamp: string;
}

export default function QAPanel() {
  const { ts } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const e2eParams = parseE2EParams(searchParams.toString());
  const [outputs, setOutputs] = useState<NelvyonOutput[]>([]);
  const [projects, setProjects] = useState<NelvyonProject[]>([]);
  const [clients, setClients] = useState<NelvyonClient[]>([]);
  const [selected, setSelected] = useState<NelvyonOutput | null>(null);
  const [validating, setValidating] = useState<number | null>(null);
  const [stats, setStats] = useState<QADashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // RBAC
  const [currentRole, setCurrentRole] = useState<Role>("Admin");
  const perms = ROLE_PERMISSIONS[currentRole];

  // Audit Trail
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [showAudit, setShowAudit] = useState(false);

  const addAudit = useCallback((action: string, detail: string) => {
    setAuditLog(prev => [{
      id: crypto.randomUUID(),
      action,
      detail,
      user: user?.name || user?.email || "Sistema",
      role: currentRole,
      timestamp: new Date().toLocaleString("es-ES"),
    }, ...prev].slice(0, 100));
  }, [currentRole, user]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading, navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [outputsRes, projectsRes, clientsRes, qaRes] = await Promise.allSettled([
        api.getOutputs(0, 100),
        api.getProjects(0, 100),
        api.getClients(0, 100),
        api.getQADashboard(),
      ]);
      if (outputsRes.status === "fulfilled") setOutputs(outputsRes.value.items || []);
      if (projectsRes.status === "fulfilled") setProjects(projectsRes.value.items || []);
      if (clientsRes.status === "fulfilled") setClients(clientsRes.value.items || []);
      if (qaRes.status === "fulfilled") setStats(qaRes.value);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error cargando datos QA";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const handleValidate = async (outputId: number) => {
    if (!perms.validate) { toast.error("Sin permisos para validar outputs"); return; }
    setValidating(outputId);
    addAudit("VALIDATE_START", `Validación iniciada para Output #${outputId}`);
    try {
      const result = await api.validateOutput(outputId);
      setOutputs(prev => prev.map(o => {
        if (o.id === outputId) {
          return {
            ...o,
            qa_score: result.qa_score,
            qa_status: result.qa_status,
            qa_attempts: result.qa_attempts,
            qa_feedback: result.qa_feedback,
          };
        }
        return o;
      }));
      if (selected?.id === outputId) {
        setSelected(prev => prev ? {
          ...prev,
          qa_score: result.qa_score,
          qa_status: result.qa_status,
          qa_attempts: result.qa_attempts,
          qa_feedback: result.qa_feedback,
        } : null);
      }
      try {
        const newStats = await api.getQADashboard();
        setStats(newStats);
      } catch { /* ignore stats refresh error */ }

      if (result.qa_status === "passed") {
        addAudit("VALIDATE_PASS", `Output #${outputId} APROBADO — Score: ${result.qa_score}`);
        toast.success(`Output #${outputId} aprobado con score ${result.qa_score}`);
      } else {
        addAudit("VALIDATE_FAIL", `Output #${outputId} NO APROBADO — Score: ${result.qa_score}`);
        toast.error(`Output #${outputId} no aprobado. Score: ${result.qa_score}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error validando output";
      addAudit("VALIDATE_ERROR", `Error validando Output #${outputId}: ${msg}`);
      toast.error(msg);
    } finally {
      setValidating(null);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-400";
    if (score >= 70) return "text-amber-400";
    return "text-red-400";
  };

  const totalOutputs = stats?.total_outputs ?? outputs.length;
  const passed = stats?.passed ?? 0;
  const failed = stats?.failed ?? 0;
  const pending = stats?.pending ?? 0;
  const passRate = stats?.pass_rate ?? 0;

  return (
    <DashboardLayout title="QA Engine" subtitle="Motor de calidad con bloqueo automático (score mínimo: 90)">
      {/* ─── E2E Flow Banner ─── */}
      <E2EFlowBanner
        clientName={e2eParams.client_id ? clients.find(c => c.id === e2eParams.client_id)?.business_name : undefined}
        projectName={e2eParams.project_id ? projects.find(p => p.id === e2eParams.project_id)?.name : undefined}
        extra={e2eParams.output_id ? `Output #${e2eParams.output_id}` : undefined}
      />

      {/* RBAC Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 rounded-xl bg-[#111113] border border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <UserCog className="w-4 h-4 text-violet-400" />
            <span className="text-xs text-zinc-400">Rol:</span>
            <select
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value as Role)}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:border-violet-500/50 focus:outline-none"
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <Badge className={cn("text-[10px]", ROLE_COLORS[currentRole])}>{currentRole}</Badge>
          <div className="flex gap-1.5 ml-2">
            {Object.entries(perms).map(([key, val]) => (
              <span key={key} className={cn(
                "text-[9px] px-1.5 py-0.5 rounded border",
                val ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-zinc-800 text-zinc-600 border-zinc-700 line-through"
              )}>
                {key === "validate" ? "Validar" : key === "viewDetail" ? "Ver Detalle" : "Ver Logs"}
              </span>
            ))}
          </div>
        </div>
        {perms.viewLogs && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAudit(!showAudit)}
            className={cn("h-7 text-[10px] border-white/10", showAudit ? "bg-violet-600/20 text-violet-300" : "text-zinc-400")}
          >
            <ScrollText className="w-3 h-3 mr-1" />
            Audit Log ({auditLog.length})
          </Button>
        )}
      </div>

      {/* Audit Trail Panel */}
      {showAudit && perms.viewLogs && (
        <div className="mb-4 rounded-xl bg-[#0d0d0f] border border-violet-500/20 overflow-hidden">
          <div className="px-4 py-3 border-b border-violet-500/10 flex items-center justify-between">
            <h4 className="text-xs font-semibold text-violet-300 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" /> Audit Trail — QA Engine
            </h4>
            <span className="text-[9px] text-zinc-500">{auditLog.length} registros</span>
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-white/[0.03]">
            {auditLog.length === 0 ? (
              <p className="text-xs text-zinc-600 p-4 text-center">Sin registros de auditoría</p>
            ) : auditLog.map(entry => (
              <div key={entry.id} className="px-4 py-2 flex items-center gap-3 text-[11px]">
                <span className="text-zinc-600 w-32 shrink-0">{entry.timestamp}</span>
                <Badge className={cn("text-[9px]", ROLE_COLORS[entry.role])}>{entry.role}</Badge>
                <span className="text-zinc-400">{entry.user}</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[9px] font-medium",
                  entry.action.includes("FAIL") || entry.action.includes("ERROR") ? "bg-red-500/10 text-red-400" :
                  entry.action.includes("PASS") ? "bg-emerald-500/10 text-emerald-400" :
                  "bg-blue-500/10 text-blue-400"
                )}>{entry.action}</span>
                <span className="text-zinc-500 truncate">{entry.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Total Outputs", value: totalOutputs, icon: ShieldCheck, color: "text-violet-400" },
          { label: "Aprobados", value: passed, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Fallidos", value: failed, icon: XCircle, color: "text-red-400" },
          { label: "Pendientes", value: pending, icon: Clock, color: "text-amber-400" },
          { label: "Pass Rate", value: `${passRate.toFixed(0)}%`, icon: TrendingUp, color: "text-blue-400" },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-xl bg-[#111113] border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={cn("w-4 h-4", s.color)} />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{s.label}</span>
            </div>
            <p className="text-xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          <span className="ml-3 text-sm text-zinc-400">Cargando datos QA...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Output List */}
          <div className="lg:col-span-2 rounded-xl bg-[#111113] border border-white/[0.06] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white">Outputs para Validación</h3>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {outputs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Hammer className="w-10 h-10 text-zinc-700 mb-3" />
                  <p className="text-sm text-zinc-500">No hay outputs generados</p>
                  <p className="text-xs text-zinc-600 mt-1">Usa el Generador Nelvyon para crear contenido</p>
                </div>
              ) : (
                outputs.map((o) => {
                  const project = projects.find(p => p.id === o.project_id);
                  const client = clients.find(c => c.id === o.client_id);

                  return (
                    <div
                      key={o.id}
                      className={cn(
                        "flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer",
                        selected?.id === o.id && "bg-violet-500/[0.05]"
                      )}
                      onClick={() => perms.viewDetail && setSelected(o)}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shrink-0",
                        o.qa_status === "passed" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" :
                        o.qa_status === "failed" ? "bg-red-500/10 border border-red-500/20 text-red-400" :
                        "bg-zinc-500/10 border border-zinc-500/20 text-zinc-400"
                      )}>
                        {o.qa_score || "—"}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{o.title || `Output #${o.id}`}</p>
                        <p className="text-xs text-zinc-500">{client?.business_name || "—"} · {project?.name || "—"}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-zinc-600">v{o.version || 1} · {o.qa_attempts || 0} intentos</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {(o.qa_status === "pending" || o.qa_status === "failed" || !o.qa_status) ? (
                          perms.validate ? (
                            <Button
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); handleValidate(o.id); }}
                              disabled={validating === o.id || (o.qa_attempts || 0) >= 3}
                              className={cn(
                                "h-8 text-xs",
                                (o.qa_attempts || 0) >= 3
                                  ? "bg-zinc-600/20 text-zinc-500 cursor-not-allowed"
                                  : "bg-violet-600/20 text-violet-300 hover:bg-violet-600/30 border border-violet-500/20"
                              )}
                            >
                              {validating === o.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (o.qa_attempts || 0) >= 3 ? (
                                <><Ban className="w-3 h-3 mr-1" /> Bloqueado</>
                              ) : (
                                <><RefreshCw className="w-3 h-3 mr-1" /> Validar</>
                              )}
                            </Button>
                          ) : (
                            <Badge className="bg-zinc-800 text-zinc-500 border-zinc-700 text-[9px]">Solo lectura</Badge>
                          )
                        ) : (
                          <span className="text-[11px] px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Aprobado
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Detail Panel */}
          <div className="rounded-xl bg-[#111113] border border-white/[0.06] overflow-hidden">
            {selected && perms.viewDetail ? (
              <div className="h-full flex flex-col">
                <div className="px-5 py-4 border-b border-white/[0.06]">
                  <h3 className="text-sm font-semibold text-white">Detalle QA</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {/* Score Circle */}
                  <div className="flex items-center justify-center">
                    <div className="relative w-24 h-24">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                        <circle
                          cx="50" cy="50" r="42" fill="none"
                          stroke={(selected.qa_score || 0) >= 90 ? "#10B981" : (selected.qa_score || 0) >= 70 ? "#F59E0B" : "#EF4444"}
                          strokeWidth="8" strokeLinecap="round"
                          strokeDasharray={`${(selected.qa_score || 0) * 2.64} 264`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={cn("text-xl font-bold", getScoreColor(selected.qa_score || 0))}>{selected.qa_score || "—"}</span>
                        <span className="text-[9px] text-zinc-500">SCORE</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Output</span>
                      <p className="text-sm text-white mt-0.5">{selected.title || `Output #${selected.id}`}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Tipo</span>
                      <p className="text-sm text-white mt-0.5">{selected.output_type}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Versión</span>
                        <p className="text-sm text-white mt-0.5">v{selected.version || 1}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Intentos</span>
                        <p className="text-sm text-white mt-0.5">{selected.qa_attempts || 0}/3</p>
                      </div>
                    </div>
                  </div>

                  {/* Feedback */}
                  {selected.qa_feedback && (() => {
                    try {
                      const fb = JSON.parse(selected.qa_feedback);
                      return (
                        <div className="space-y-3">
                          {fb.issues?.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> Problemas
                              </h4>
                              <div className="space-y-1">
                                {fb.issues.map((issue: string, i: number) => (
                                  <div key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                                    <XCircle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                                    {issue}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {fb.strengths?.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-emerald-400 mb-2 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Fortalezas
                              </h4>
                              <div className="space-y-1">
                                {fb.strengths.map((s: string, i: number) => (
                                  <div key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                                    {s}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    } catch {
                      return (
                        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Feedback</span>
                          <p className="text-xs text-zinc-300 mt-1 whitespace-pre-wrap">{selected.qa_feedback}</p>
                        </div>
                      );
                    }
                  })()}

                  {/* Blocking Info */}
                  {(selected.qa_score || 0) < 90 && selected.qa_score !== undefined && selected.qa_score > 0 && (
                    <div className="p-3 rounded-lg bg-red-500/[0.05] border border-red-500/10">
                      <div className="flex items-center gap-2 mb-1">
                        <Ban className="w-4 h-4 text-red-400" />
                        <span className="text-xs font-semibold text-red-300">Output Bloqueado</span>
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        Score mínimo requerido: 90. Este output no puede ser entregado al cliente hasta que supere la validación QA.
                      </p>
                    </div>
                  )}

                  {/* ─── E2E Actions (on approved outputs) ─── */}
                  {selected.qa_status === "passed" && (
                    <div className="p-3 rounded-lg bg-emerald-500/[0.05] border border-emerald-500/10 space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-semibold text-emerald-300">Aprobado — Siguiente paso E2E</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => navigate(buildE2EUrl("/assets", { output_id: selected.id, client_id: selected.client_id, project_id: selected.project_id, source: "qa_approved" }))}
                          className="h-6 text-[9px] bg-violet-600/20 text-violet-300 hover:bg-violet-600/30 border border-violet-500/20"
                        >
                          <Image className="w-2.5 h-2.5 mr-1" /> Enviar a Assets <ArrowRight className="w-2.5 h-2.5 ml-0.5" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => navigate(buildE2EUrl("/saas/contracts", { client_id: selected.client_id, project_id: selected.project_id, source: "qa_approved" }))}
                          className="h-6 text-[9px] bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 border border-blue-500/20"
                        >
                          <FileText className="w-2.5 h-2.5 mr-1" /> Generar Contrato
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => navigate(buildE2EUrl("/saas/social", { client_id: selected.client_id, source: "qa_approved" }))}
                          className="h-6 text-[9px] bg-pink-600/20 text-pink-300 hover:bg-pink-600/30 border border-pink-500/20"
                        >
                          <Share2 className="w-2.5 h-2.5 mr-1" /> Publicar en Social
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center px-8 py-12">
                <ShieldCheck className="w-12 h-12 text-zinc-700 mb-4" />
                <p className="text-sm text-zinc-500 mb-1">Selecciona un output</p>
                <p className="text-xs text-zinc-600">para ver el detalle de validación QA</p>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}