import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import SaasLayout from "@/components/SaasLayout";
import DataStateWrapper from "@/components/DataStateWrapper";
import { Button } from "@/components/ui/button";
import {
  BarChart3, TrendingUp, DollarSign, Users,
  RefreshCw, Activity, Zap, Loader2,
  Sparkles, Brain, Target, MessageSquare, Mail,
  Headphones, LayoutGrid, Calendar, Database, CreditCard
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { api, type DashboardMetricsResponse, type RevenueChartPoint, type DealStageData } from "@/lib/api";
import { aiAnalyticsInsights } from "@/lib/ai-helper";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PERIODS = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "1y", label: "1y" },
];

const STAGE_COLORS: Record<string, string> = {
  lead: "#3B82F6",
  qualified: "#06B6D4",
  proposal: "#8B5CF6",
  negotiation: "#F59E0B",
  won: "#10B981",
  closed_won: "#10B981",
  closed: "#10B981",
  lost: "#EF4444",
  closed_lost: "#EF4444",
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-[#1A1D23] border border-white/[0.08] rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-xs font-semibold text-white mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-[11px] text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: p.color }} />
          {p.name}: <span className="text-white font-medium">{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function SaasAnalytics() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { ts } = useI18n();
  const [period, setPeriod] = useState("30d");
  const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null);
  const [revenueChart, setRevenueChart] = useState<RevenueChartPoint[]>([]);
  const [dealStages, setDealStages] = useState<DealStageData[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiInsights, setAiInsights] = useState<{ insights: string[]; trends: string[]; anomalies: string[]; action_items: string[] } | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/saas");
  }, [user, loading, navigate]);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    setError(null);
    try {
      const [metricsRes, chartRes, stagesRes] = await Promise.allSettled([
        api.getDashboardMetrics(period),
        api.getRevenueChart(period),
        api.getDealsByStage(),
      ]);

      if (metricsRes.status === "fulfilled") setMetrics(metricsRes.value);
      else setError("Error cargando métricas");
      if (chartRes.status === "fulfilled") setRevenueChart(chartRes.value.data || []);
      if (stagesRes.status === "fulfilled") setDealStages(stagesRes.value.stages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading analytics");
    } finally {
      setLoadingData(false);
    }
  }, [period]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  const handleGenerateInsights = async () => {
    if (!metrics) return;
    setGeneratingAI(true);
    try {
      const dataStr = JSON.stringify({
        period,
        contacts: metrics.kpis.contacts,
        deals: metrics.kpis.deals,
        campaigns: metrics.kpis.campaigns,
        sales: metrics.kpis.sales,
        funnels: metrics.kpis.funnels,
        helpdesk: metrics.kpis.helpdesk,
        subscriptions: metrics.kpis.subscriptions,
      });
      const result = await aiAnalyticsInsights(dataStr);
      if (result.ok) {
        try {
          const parsed = JSON.parse(result.text);
          setAiInsights(parsed);
          toast.success("Insights generados con IA");
        } catch {
          setAiInsights({ insights: [result.text], trends: [], anomalies: [], action_items: [] });
        }
      } else {
        toast.error("Error generando insights: " + (result.error || "Unknown"));
      }
    } catch {
      toast.error("Error de conexión con IA");
    } finally {
      setGeneratingAI(false);
    }
  };

  const k = metrics?.kpis;

  const chartData = revenueChart.map(p => ({
    ...p,
    label: new Date(p.date).toLocaleDateString("es", { day: "2-digit", month: "short" }),
  }));

  // Pipeline chart data
  const pipelineData = dealStages.map(s => ({
    name: s.stage.charAt(0).toUpperCase() + s.stage.slice(1).replace("_", " "),
    count: s.count,
    value: s.value,
    fill: STAGE_COLORS[s.stage] || "#6366F1",
  }));

  // KPI cards
  const kpis = k ? [
    { label: "Revenue Total", value: `€${k.sales.total_amount.toLocaleString()}`, sub: `€${k.sales.period_amount.toLocaleString()} en ${period}`, icon: DollarSign, color: "text-emerald-400" },
    { label: "Contactos", value: k.contacts.total.toLocaleString(), sub: `+${k.contacts.period} en ${period}`, icon: Users, color: "text-blue-400" },
    { label: "Win Rate", value: `${k.deals.win_rate}%`, sub: `${k.deals.won} ganados de ${k.deals.total}`, icon: Target, color: "text-violet-400" },
    { label: "Open Rate", value: `${k.campaigns.open_rate}%`, sub: `${k.campaigns.opened} de ${k.campaigns.sent} enviados`, icon: Mail, color: "text-amber-400" },
  ] : [];

  return (
    <SaasLayout title={ts("analytics")} subtitle="Análisis completo con datos reales de PostgreSQL">
      {/* Period Selector + AI Button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                period === p.key
                  ? "bg-violet-500/20 text-violet-300 border-violet-500/30"
                  : "text-zinc-600 hover:text-zinc-400 border-transparent"
              )}
            >
              {p.label}
            </button>
          ))}
          <span className="text-[8px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ml-2">
            <Database className="w-2.5 h-2.5 inline mr-0.5" />LIVE
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleGenerateInsights}
            disabled={generatingAI || !metrics}
            className="bg-violet-600 hover:bg-violet-500 text-white text-xs gap-1.5"
          >
            {generatingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
            {ts("aiInsights")}
          </Button>
          <Button size="sm" variant="outline" onClick={loadData} className="border-white/10 text-zinc-400 h-8">
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <DataStateWrapper loading={loadingData} error={error} onRetry={loadData}>
        {/* AI Insights Panel */}
        {aiInsights && (
          <div className="mb-6 p-5 rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-bold text-white">{ts("aiInsights")} — Basado en datos reales</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiInsights.insights?.length > 0 && (
                <div>
                  <p className="text-[10px] text-violet-400 font-semibold mb-1.5">Insights</p>
                  {aiInsights.insights.map((ins, i) => (
                    <p key={i} className="text-[11px] text-zinc-300 mb-1">• {ins}</p>
                  ))}
                </div>
              )}
              {aiInsights.trends?.length > 0 && (
                <div>
                  <p className="text-[10px] text-emerald-400 font-semibold mb-1.5">Tendencias</p>
                  {aiInsights.trends.map((t, i) => (
                    <p key={i} className="text-[11px] text-zinc-300 mb-1">• {t}</p>
                  ))}
                </div>
              )}
              {aiInsights.anomalies?.length > 0 && (
                <div>
                  <p className="text-[10px] text-amber-400 font-semibold mb-1.5">Anomalías</p>
                  {aiInsights.anomalies.map((a, i) => (
                    <p key={i} className="text-[11px] text-zinc-300 mb-1">• {a}</p>
                  ))}
                </div>
              )}
              {aiInsights.action_items?.length > 0 && (
                <div>
                  <p className="text-[10px] text-blue-400 font-semibold mb-1.5">Acciones Recomendadas</p>
                  {aiInsights.action_items.map((a, i) => (
                    <p key={i} className="text-[11px] text-zinc-300 mb-1">• {a}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpis.map(kpi => (
            <div key={kpi.label} className="p-5 rounded-xl bg-[#0F1419] border border-white/[0.04]">
              <div className="flex items-center justify-between mb-3">
                <kpi.icon className={cn("w-5 h-5", kpi.color)} />
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-white">{kpi.value}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{kpi.label}</p>
              <p className="text-[9px] text-zinc-600 mt-1">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Charts Row 1: Revenue + Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue Over Time */}
          <div className="p-6 rounded-xl bg-[#0F1419] border border-white/[0.04]">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Revenue — {period}</h3>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="anRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="label" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="total" stroke="#10B981" fill="url(#anRevGrad)" strokeWidth={2} name="Revenue" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[240px] text-zinc-600 text-xs">
                Sin datos de revenue en este período
              </div>
            )}
          </div>

          {/* Pipeline by Stage */}
          <div className="p-6 rounded-xl bg-[#0F1419] border border-white/[0.04]">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-semibold text-white">Pipeline por Etapa</h3>
            </div>
            {pipelineData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={pipelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="name" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Deals">
                      {pipelineData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-3">
                  {pipelineData.map(s => (
                    <div key={s.name} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.fill }} />
                      <span className="text-[10px] text-zinc-500">{s.name}: {s.count} (€{s.value.toLocaleString()})</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-zinc-600 text-xs">
                Sin deals en el pipeline. Crea deals para ver el gráfico.
              </div>
            )}
          </div>
        </div>

        {/* Module Performance Grid */}
        {k && (
          <div className="rounded-xl bg-[#0F1419] border border-white/[0.04] p-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-violet-400" />
              Rendimiento por Módulo — Datos Reales
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "CRM", icon: Users, color: "text-blue-400", bg: "bg-blue-500/10",
                  stats: [
                    { k: "Contactos", v: k.contacts.total },
                    { k: "Nuevos", v: k.contacts.period },
                  ]},
                { label: "Deals", icon: Target, color: "text-emerald-400", bg: "bg-emerald-500/10",
                  stats: [
                    { k: "Abiertos", v: k.deals.open },
                    { k: "Win Rate", v: `${k.deals.win_rate}%` },
                  ]},
                { label: "Campañas", icon: Mail, color: "text-amber-400", bg: "bg-amber-500/10",
                  stats: [
                    { k: "Enviados", v: k.campaigns.sent },
                    { k: "Open Rate", v: `${k.campaigns.open_rate}%` },
                  ]},
                { label: "Helpdesk", icon: Headphones, color: "text-rose-400", bg: "bg-rose-500/10",
                  stats: [
                    { k: "Abiertos", v: k.helpdesk.open },
                    { k: "Resolución", v: `${k.helpdesk.resolution_rate}%` },
                  ]},
                { label: "Funnels", icon: LayoutGrid, color: "text-violet-400", bg: "bg-violet-500/10",
                  stats: [
                    { k: "Visitantes", v: k.funnels.visitors },
                    { k: "Conversión", v: `${k.funnels.conversion_rate}%` },
                  ]},
                { label: "Conversaciones", icon: MessageSquare, color: "text-cyan-400", bg: "bg-cyan-500/10",
                  stats: [
                    { k: "Total", v: k.conversations.total },
                    { k: "Sin leer", v: k.conversations.unread },
                  ]},
                { label: "Calendario", icon: Calendar, color: "text-indigo-400", bg: "bg-indigo-500/10",
                  stats: [
                    { k: "Próximos", v: k.calendar.upcoming },
                    { k: "Actividades", v: k.activities.period },
                  ]},
                { label: "Suscripciones", icon: CreditCard, color: "text-green-400", bg: "bg-green-500/10",
                  stats: [
                    { k: "MRR", v: `€${k.subscriptions.mrr.toLocaleString()}` },
                    { k: "Activas", v: k.subscriptions.active },
                  ]},
              ].map(mod => (
                <div key={mod.label} className={cn("p-4 rounded-xl border border-white/[0.04]", mod.bg)}>
                  <div className="flex items-center gap-2 mb-3">
                    <mod.icon className={cn("w-4 h-4", mod.color)} />
                    <span className="text-xs font-semibold text-white">{mod.label}</span>
                  </div>
                  <div className="space-y-2">
                    {mod.stats.map(s => (
                      <div key={s.k} className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500">{s.k}</span>
                        <span className="text-xs font-bold text-white">{typeof s.v === "number" ? s.v.toLocaleString() : s.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DataStateWrapper>
    </SaasLayout>
  );
}