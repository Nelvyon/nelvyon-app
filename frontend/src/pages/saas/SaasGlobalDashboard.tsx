/**
 * Vite global dashboard — GET /api/v1/global-dashboard/* (Fase 1C: contactos hybrid).
 * @see docs/PHASE_1C_LEGACY_DASHBOARDS.md
 */
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SaasLayout from "@/components/SaasLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api, type GlobalDashboardOverviewResponse, type GlobalDashboardModuleSummary } from "@/lib/api";
import { isAxiosError } from "axios";
import {
  DollarSign, Target, Headphones, Megaphone, FileText,
  Share2, TrendingUp, Activity, Heart, AlertTriangle,
  CheckCircle2, RefreshCw,
  BarChart3, Users, Zap, Globe, Loader2, ChevronRight,
  Sparkles, Shield,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const PERIODS = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "1y", label: "1y" },
];

const MODULE_ICONS: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  crm: { icon: Users, color: "text-blue-400", bg: "from-blue-500/10 to-cyan-500/10" },
  pipelines: { icon: Target, color: "text-emerald-400", bg: "from-emerald-500/10 to-green-500/10" },
  campaigns: { icon: Megaphone, color: "text-amber-400", bg: "from-amber-500/10 to-orange-500/10" },
  helpdesk: { icon: Headphones, color: "text-rose-400", bg: "from-rose-500/10 to-pink-500/10" },
  contracts: { icon: FileText, color: "text-violet-400", bg: "from-violet-500/10 to-purple-500/10" },
  social: { icon: Share2, color: "text-fuchsia-400", bg: "from-fuchsia-500/10 to-pink-500/10" },
};

const STATUS_COLORS: Record<string, string> = {
  healthy: "text-emerald-400",
  warning: "text-amber-400",
  critical: "text-red-400",
};

const HEALTH_COLORS = ["#10B981", "#F59E0B", "#EF4444", "#6B7280"];

const PIE_COLORS = ["#8B5CF6", "#10B981", "#EF4444", "#F59E0B"];

function isDealWonStage(stage: string): boolean {
  return ["won", "closed", "closed_won"].includes(stage);
}

function isDealLostStage(stage: string): boolean {
  return ["lost", "closed_lost"].includes(stage);
}

export default function SaasGlobalDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState("30d");
  const [dashboard, setDashboard] = useState<GlobalDashboardOverviewResponse | null>(null);
  const [modules, setModules] = useState<GlobalDashboardModuleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/saas");
  }, [user, authLoading, navigate]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [overview, modList] = await Promise.all([
        api.getGlobalDashboardOverview(period),
        api.getGlobalDashboardModulesSummary(),
      ]);
      setDashboard(overview);
      setModules(modList);
    } catch (err: unknown) {
      setDashboard(null);
      setModules([]);
      let msg = "No se pudieron cargar los datos del resumen ejecutivo.";
      if (isAxiosError(err)) {
        const d = err.response?.data as { detail?: string | unknown } | undefined;
        if (typeof d?.detail === "string") msg = d.detail;
        else if (err.response?.status === 400) {
          msg = "Selecciona un workspace (cabecera X-Workspace-Id requerida).";
        }
      }
      setLoadError(msg);
      if (import.meta.env.DEV) console.warn("[SaasGlobalDashboard]", err);
    } finally {
      setLoading(false);
    }
  }, [user, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const d = dashboard;
  const health = d?.account_health;
  const contractsValueComputable = d?.contracts_value_computable ?? true;
  const contractsValueNote =
    d?.contracts_value_note ??
    "Valor financiero no disponible en esta versión.";

  // Pipeline chart data
  const pipelineData = d ? [
    { name: "Abiertos", value: d.pipeline.open_deals, fill: "#8B5CF6" },
    { name: "Ganados", value: d.pipeline.won_deals, fill: "#10B981" },
    { name: "Perdidos", value: d.pipeline.lost_deals, fill: "#EF4444" },
  ].filter(x => x.value > 0) : [];

  return (
    <SaasLayout
      title="Resumen ejecutivo"
      subtitle="Mismo workspace que el dashboard operativo; vista agregada (salud, módulos, top deals)."
    >
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2 min-w-0">
          <Globe className="w-5 h-5 text-violet-400 shrink-0" />
          <span className="text-xs font-bold text-white">WORKSPACE ACTUAL</span>
          {d?.workspace_id != null && (
            <span className="text-[10px] text-zinc-500 font-mono">#{d.workspace_id}</span>
          )}
          <div className="flex items-center gap-1 ml-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-medium">LIVE</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/saas/dashboard")}
          className="text-[10px] text-violet-400 hover:text-violet-300 border border-violet-500/25 rounded-lg px-2 py-1"
        >
          ← Dashboard operativo
        </button>
        <div className="flex items-center gap-1.5 ml-auto">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all",
                period === p.key
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                  : "text-zinc-500 hover:text-zinc-300 border border-transparent"
              )}
            >
              {p.label}
            </button>
          ))}
          <Button size="sm" onClick={fetchData} variant="outline" className="border-white/10 text-zinc-400 h-7 ml-1">
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl p-5 bg-[#0F1419] border border-white/[0.06]">
                <div className="h-3 bg-white/[0.06] rounded w-20 mb-3" />
                <div className="h-7 bg-white/[0.08] rounded w-28 mb-2" />
                <div className="h-2 bg-white/[0.04] rounded w-16" />
              </div>
            ))}
          </div>
        </div>
      ) : d && !loadError ? (
        <div className="space-y-5">
          {/* Top KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Revenue Total", value: `€${d.revenue.total_revenue.toLocaleString()}`, sub: `€${d.revenue.period_revenue.toLocaleString()} en ${period}`, icon: DollarSign, color: "text-emerald-400", bg: "from-emerald-500/10 to-green-500/10" },
              { label: "Pipeline", value: `€${d.pipeline.pipeline_value.toLocaleString()}`, sub: `${d.pipeline.open_deals} deals abiertos`, icon: Target, color: "text-violet-400", bg: "from-violet-500/10 to-purple-500/10" },
              { label: "MRR", value: `€${d.revenue.mrr.toLocaleString()}`, sub: `ARR: €${d.revenue.arr.toLocaleString()}`, icon: TrendingUp, color: "text-blue-400", bg: "from-blue-500/10 to-cyan-500/10" },
              { label: "Win Rate", value: `${d.pipeline.win_rate}%`, sub: `${d.pipeline.won_deals} ganados / ${d.pipeline.lost_deals} perdidos`, icon: Zap, color: "text-amber-400", bg: "from-amber-500/10 to-orange-500/10" },
            ].map(kpi => (
              <div key={kpi.label} className="p-4 rounded-xl bg-[#0A0E13] border border-white/[0.04] hover:border-white/[0.08] transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{kpi.label}</span>
                  <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center", kpi.bg)}>
                    <kpi.icon className={cn("w-4 h-4", kpi.color)} />
                  </div>
                </div>
                <p className="text-xl font-bold text-white">{kpi.value}</p>
                <p className="text-[10px] text-zinc-600 mt-1">{kpi.sub}</p>
              </div>
            ))}
          </div>

          {/* Account Health + Pipeline Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Account Health */}
            <div className="lg:col-span-5 rounded-xl bg-[#0A0E13] border border-white/[0.04] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-semibold text-white">Salud de la Cuenta</span>
              </div>

              {health && (
                <>
                  <div className="flex items-center gap-4 mb-5">
                    <div className={cn(
                      "w-20 h-20 rounded-2xl flex items-center justify-center",
                      health.score >= 80 ? "bg-emerald-500/10" :
                      health.score >= 60 ? "bg-blue-500/10" :
                      health.score >= 40 ? "bg-amber-500/10" : "bg-red-500/10"
                    )}>
                      <span className={cn(
                        "text-3xl font-black",
                        health.score >= 80 ? "text-emerald-400" :
                        health.score >= 60 ? "text-blue-400" :
                        health.score >= 40 ? "text-amber-400" : "text-red-400"
                      )}>
                        {health.score}
                      </span>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">{health.label}</p>
                      <p className="text-[10px] text-zinc-500">Puntuación de salud de cuenta</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {health.factors.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                        {f.status === "good" ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : f.status === "warning" ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        ) : f.status === "missing" ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        ) : (
                          <Shield className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] text-white font-medium">{f.factor}</span>
                          {f.tip && <span className="text-[9px] text-zinc-600 ml-2">— {f.tip}</span>}
                        </div>
                        <span className={cn(
                          "text-[10px] font-bold",
                          f.status === "good" ? "text-emerald-400" :
                          f.status === "warning" ? "text-amber-400" :
                          f.status === "missing" ? "text-red-400" : "text-zinc-500"
                        )}>
                          +{f.score}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Pipeline Distribution */}
            <div className="lg:col-span-7 rounded-xl bg-[#0A0E13] border border-white/[0.04] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-semibold text-white">Pipeline & Deals</span>
              </div>

              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: "Total", value: d.pipeline.total_deals, color: "text-white" },
                  { label: "Abiertos", value: d.pipeline.open_deals, color: "text-violet-400" },
                  { label: "Ganados", value: d.pipeline.won_deals, color: "text-emerald-400" },
                  { label: "Perdidos", value: d.pipeline.lost_deals, color: "text-red-400" },
                ].map(s => (
                  <div key={s.label} className="text-center p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <p className={cn("text-lg font-bold", s.color)}>{s.value}</p>
                    <p className="text-[8px] text-zinc-600">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Top Deals */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-zinc-500 font-semibold uppercase">Top Deals</span>
                {d.top_deals.length === 0 ? (
                  <p className="text-[10px] text-zinc-600 text-center py-4">Sin deals registrados. Crea deals en el pipeline.</p>
                ) : d.top_deals.map((deal, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.03]">
                    <span className="text-[10px] text-zinc-600 font-bold w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-white truncate">{deal.title}</p>
                      <p className="text-[9px] text-zinc-600">{deal.contact}</p>
                    </div>
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded font-bold",
                      isDealWonStage(deal.stage) ? "bg-emerald-500/10 text-emerald-400" :
                      isDealLostStage(deal.stage) ? "bg-red-500/10 text-red-400" :
                      "bg-violet-500/10 text-violet-400"
                    )}>
                      {deal.stage}
                    </span>
                    <span className="text-xs font-bold text-white">€{deal.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Secondary Metrics Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Tickets Abiertos", value: d.tickets.open_tickets, total: d.tickets.total_tickets, icon: Headphones, color: "text-rose-400", bg: "from-rose-500/10 to-pink-500/10", sub: `${d.tickets.resolved_tickets} resueltos` },
              { label: "Campañas Activas", value: d.campaigns.active_campaigns, total: d.campaigns.total_campaigns, icon: Megaphone, color: "text-amber-400", bg: "from-amber-500/10 to-orange-500/10", sub: `${d.campaigns.total_sent.toLocaleString()} enviados` },
              {
                label: "Contratos Activos",
                value: d.contracts.active_contracts,
                total: d.contracts.total_contracts,
                icon: FileText,
                color: "text-violet-400",
                bg: "from-violet-500/10 to-purple-500/10",
                sub: contractsValueComputable
                  ? `€${d.contracts.total_value.toLocaleString()} valor total`
                  : "Valor financiero: No disponible",
                note: contractsValueComputable ? undefined : contractsValueNote,
              },
              { label: "Avg Deal Value", value: `€${d.revenue.avg_deal_value.toLocaleString()}`, total: null, icon: BarChart3, color: "text-cyan-400", bg: "from-cyan-500/10 to-blue-500/10", sub: `Open rate: ${d.campaigns.avg_open_rate}%` },
            ].map(m => (
              <div key={m.label} className="p-4 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-zinc-500 uppercase">{m.label}</span>
                  <div className={cn("w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center", m.bg)}>
                    <m.icon className={cn("w-3.5 h-3.5", m.color)} />
                  </div>
                </div>
                <p className="text-lg font-bold text-white">{typeof m.value === "number" ? m.value : m.value}</p>
                {m.total !== null && <p className="text-[9px] text-zinc-600">de {m.total} total</p>}
                <p className="text-[9px] text-zinc-500 mt-1">{m.sub}</p>
                {"note" in m && m.note ? (
                  <p className="text-[9px] text-amber-400/90 mt-1">{m.note}</p>
                ) : null}
              </div>
            ))}
          </div>

          {/* Module Summary Cards */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-semibold text-white">Resumen por Módulo</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {modules.map(mod => {
                const mi = MODULE_ICONS[mod.module] || { icon: Activity, color: "text-zinc-400", bg: "from-zinc-500/10 to-zinc-500/10" };
                const Icon = mi.icon;
                const isCrossWorkspaceSocial = mod.scope === "user_cross_workspace";
                return (
                  <button
                    key={mod.module}
                    onClick={() => navigate(`/saas/${mod.module === "pipelines" ? "pipelines" : mod.module}`)}
                    className="p-4 rounded-xl bg-[#0A0E13] border border-white/[0.04] hover:border-white/[0.10] transition-all text-left group"
                    title={isCrossWorkspaceSocial && mod.scope_note ? mod.scope_note : undefined}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center", mi.bg)}>
                        <Icon className={cn("w-4 h-4", mi.color)} />
                      </div>
                      <div className={cn("w-2 h-2 rounded-full", STATUS_COLORS[mod.status] || "text-zinc-500",
                        mod.status === "healthy" ? "bg-emerald-400" : mod.status === "warning" ? "bg-amber-400" : "bg-red-400"
                      )} />
                    </div>
                    <p className="text-sm font-bold text-white">{mod.primary_value}</p>
                    <p className="text-[8px] text-zinc-500">{mod.primary_metric}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[9px] text-zinc-600">{mod.secondary_metric}: {mod.secondary_value}</span>
                      <ChevronRight className="w-3 h-3 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                    </div>
                    {isCrossWorkspaceSocial ? (
                      <p className="text-[9px] text-amber-400/90 mt-1">
                        {mod.scope_note || "Actividad social personal (todas tus marcas)"}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-20">
          <Globe className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <p className="text-sm text-zinc-500">
            {loadError || "No hay datos del resumen ejecutivo para este workspace."}
          </p>
          <Button onClick={fetchData} variant="outline" className="mt-4 border-white/10 text-zinc-400">
            <RefreshCw className="w-4 h-4 mr-2" /> Reintentar
          </Button>
        </div>
      )}
    </SaasLayout>
  );
}