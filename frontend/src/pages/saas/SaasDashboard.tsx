import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SaasLayout from "@/components/SaasLayout";
import {
  Users, BarChart3, DollarSign, Zap,
  ArrowUpRight, Activity, Target,
  Loader2, CheckCircle2, XCircle, Clock,
  Globe, MessageSquare, Phone, Calendar, CreditCard, Layers,
  Share2, Megaphone, RefreshCw, Mail, BookOpen, Database,
  Sparkles, Handshake, Workflow, ClipboardList, Headphones,
  TrendingUp, FileText, LayoutGrid, ArrowRight, Rocket
} from "lucide-react";
import { toast } from "sonner";
import { api, getApiErrorMessage, type DashboardMetricsResponse, type RecentItem, type RevenueChartPoint } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";

const PERIODS = [
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" },
  { key: "90d", label: "90 días" },
  { key: "1y", label: "1 año" },
];

/** Pocos registros CRM/marketing: mostrar CTA de seed demo como complemento al onboarding. */
function isWorkspaceSparse(kpis: DashboardMetricsResponse["kpis"] | undefined): boolean {
  if (!kpis) return false;
  const n = kpis.contacts.total + kpis.deals.total + kpis.campaigns.total;
  return n < 5;
}

function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.max(1, Math.ceil(value / 30));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(start);
    }, 30);
    return () => clearInterval(timer);
  }, [value]);
  return <>{prefix}{display.toLocaleString()}{suffix}</>;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-[#1A1D23] border border-white/[0.08] rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-xs font-semibold text-white mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-[11px] text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: p.color }} />
          {p.name}: <span className="text-white font-medium">€{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</span>
        </p>
      ))}
    </div>
  );
};

const typeIcons: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  contact: { icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
  deal: { icon: Target, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  campaign: { icon: Megaphone, color: "text-amber-400", bg: "bg-amber-500/10" },
  sale: { icon: DollarSign, color: "text-green-400", bg: "bg-green-500/10" },
  activity: { icon: Activity, color: "text-violet-400", bg: "bg-violet-500/10" },
};

export default function SaasDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState("30d");
  const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null);
  const [revenueChart, setRevenueChart] = useState<RevenueChartPoint[]>([]);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [animated, setAnimated] = useState(false);
  const [onboardingProgress, setOnboardingProgress] = useState<Awaited<
    ReturnType<typeof api.getOnboardingProgress>
  > | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(true);
  const [seedLoading, setSeedLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/saas");
  }, [user, loading, navigate]);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [metricsRes, chartRes, recentRes] = await Promise.allSettled([
        api.getDashboardMetrics(period),
        api.getRevenueChart(period),
        api.getRecentItems(15),
      ]);

      if (metricsRes.status === "fulfilled") setMetrics(metricsRes.value);
      if (chartRes.status === "fulfilled") setRevenueChart(chartRes.value.data || []);
      if (recentRes.status === "fulfilled") setRecentItems(recentRes.value.items || []);
      if (metricsRes.status === "rejected") {
        toast.error(getApiErrorMessage(metricsRes.reason, "No se pudieron cargar las métricas del dashboard."));
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[SaasDashboard] Error:", err);
      toast.error(getApiErrorMessage(err, "Error cargando el dashboard."));
    } finally {
      setLoadingData(false);
    }
  }, [period]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadOnboardingProgress = useCallback(async () => {
    setOnboardingLoading(true);
    try {
      const p = await api.getOnboardingProgress();
      setOnboardingProgress(p);
    } catch {
      setOnboardingProgress(null);
      if (import.meta.env.DEV) console.warn("[SaasDashboard] onboarding progress no disponible");
    } finally {
      setOnboardingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && user) loadOnboardingProgress();
  }, [loading, user, loadOnboardingProgress]);

  const handleSeedDemo = useCallback(async () => {
    setSeedLoading(true);
    try {
      const res = await api.seedOnboardingDemo(["contacts", "deals", "campaigns"]);
      toast.success("Datos de ejemplo cargados", {
        description: res.seeded
          ? Object.entries(res.seeded).map(([k, v]) => `${k}: ${v}`).join(" · ")
          : undefined,
      });
      await loadData();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? String((e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? "")
          : "";
      toast.error("No se pudieron cargar los datos de ejemplo", {
        description: msg || "Revisa la conexión o inténtalo más tarde.",
      });
    } finally {
      setSeedLoading(false);
    }
  }, [loadData]);

  const k = metrics?.kpis;
  const showOnboardingCta = Boolean(onboardingProgress && !onboardingProgress.is_complete);
  const showSparseSeed =
    !loadingData &&
    Boolean(metrics) &&
    isWorkspaceSparse(k);
  const showCompleteButEmpty =
    Boolean(onboardingProgress?.is_complete) && showSparseSeed;

  const kpiCards = k ? [
    { label: "Contactos", value: k.contacts.total, period: k.contacts.period, icon: Users, color: "text-blue-400", bg: "from-blue-500/10 to-cyan-500/10" },
    { label: "Deals Abiertos", value: k.deals.open, period: k.deals.period, icon: Target, color: "text-emerald-400", bg: "from-emerald-500/10 to-green-500/10", prefix: "" },
    { label: "Pipeline Total", value: k.deals.value_total, period: k.deals.value_period, icon: DollarSign, color: "text-violet-400", bg: "from-violet-500/10 to-purple-500/10", prefix: "€" },
    { label: "Revenue", value: k.sales.total_amount, period: k.sales.period_amount, icon: TrendingUp, color: "text-green-400", bg: "from-green-500/10 to-emerald-500/10", prefix: "€" },
    { label: "Campañas", value: k.campaigns.total, period: k.campaigns.sent, icon: Megaphone, color: "text-amber-400", bg: "from-amber-500/10 to-yellow-500/10", periodLabel: "enviados" },
    { label: "Conversaciones", value: k.conversations.total, period: k.conversations.unread, icon: MessageSquare, color: "text-blue-400", bg: "from-blue-500/10 to-indigo-500/10", periodLabel: "sin leer" },
  ] : [];

  const secondaryKpis = k ? [
    { label: "Win Rate", value: `${k.deals.win_rate}%`, icon: CheckCircle2, color: "text-emerald-400" },
    { label: "Open Rate", value: `${k.campaigns.open_rate}%`, icon: Mail, color: "text-blue-400" },
    { label: "Tickets Abiertos", value: k.helpdesk.open, icon: Headphones, color: "text-amber-400" },
    { label: "Funnels", value: k.funnels.total, icon: LayoutGrid, color: "text-violet-400" },
    { label: "Conversión", value: `${k.funnels.conversion_rate}%`, icon: Zap, color: "text-rose-400" },
    { label: "MRR", value: `€${k.subscriptions.mrr.toLocaleString()}`, icon: CreditCard, color: "text-emerald-400" },
    { label: "Eventos", value: k.calendar.upcoming, icon: Calendar, color: "text-cyan-400" },
    { label: "Actividades", value: k.activities.period, icon: Activity, color: "text-fuchsia-400" },
  ] : [];

  const serviceModules = [
    { icon: Users, label: "CRM", path: "/saas/crm", color: "text-blue-400", bg: "from-blue-500/10 to-cyan-500/10" },
    { icon: Layers, label: "Pipelines", path: "/saas/pipelines", color: "text-violet-400", bg: "from-violet-500/10 to-purple-500/10" },
    { icon: Mail, label: "Email Mktg", path: "/saas/email-marketing", color: "text-rose-400", bg: "from-rose-500/10 to-pink-500/10" },
    { icon: Megaphone, label: "Campaigns", path: "/saas/campaigns", color: "text-amber-400", bg: "from-amber-500/10 to-orange-500/10" },
    { icon: Target, label: "Funnels", path: "/saas/funnels", color: "text-teal-400", bg: "from-teal-500/10 to-cyan-500/10" },
    { icon: Share2, label: "Social", path: "/saas/social", color: "text-fuchsia-400", bg: "from-fuchsia-500/10 to-pink-500/10" },
    { icon: MessageSquare, label: "Chat", path: "/saas/conversations", color: "text-blue-400", bg: "from-blue-500/10 to-indigo-500/10" },
    { icon: Phone, label: "VoIP", path: "/saas/calls", color: "text-emerald-400", bg: "from-emerald-500/10 to-green-500/10" },
    { icon: Calendar, label: "Calendar", path: "/saas/calendar", color: "text-violet-400", bg: "from-violet-500/10 to-purple-500/10" },
    { icon: Globe, label: "Websites", path: "/saas/websites", color: "text-cyan-400", bg: "from-cyan-500/10 to-blue-500/10" },
    { icon: ClipboardList, label: "Forms", path: "/saas/forms", color: "text-fuchsia-400", bg: "from-fuchsia-500/10 to-pink-500/10" },
    { icon: BookOpen, label: "Blog CMS", path: "/saas/blog", color: "text-orange-400", bg: "from-orange-500/10 to-amber-500/10" },
    { icon: CreditCard, label: "Pagos", path: "/saas/payments", color: "text-emerald-400", bg: "from-emerald-500/10 to-teal-500/10" },
    { icon: BarChart3, label: "Reportes", path: "/saas/reports", color: "text-indigo-400", bg: "from-indigo-500/10 to-violet-500/10" },
    { icon: Workflow, label: "Workflows", path: "/saas/workflows", color: "text-sky-400", bg: "from-sky-500/10 to-blue-500/10" },
    { icon: Handshake, label: "Partners", path: "/saas/partners", color: "text-amber-400", bg: "from-amber-500/10 to-orange-500/10" },
  ];

  // Format chart dates for display
  const chartData = revenueChart.map(p => ({
    ...p,
    label: new Date(p.date).toLocaleDateString("es", { day: "2-digit", month: "short" }),
  }));

  return (
    <SaasLayout title="Dashboard" subtitle="Métricas en tiempo real del workspace actual">
      {/* Header with period selector */}
      <div className="rounded-xl bg-gradient-to-r from-violet-500/[0.06] via-blue-500/[0.04] to-emerald-500/[0.06] border border-violet-500/10 p-4 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-white">NELVYON SaaS</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-medium">
              {metrics?.source === "postgresql_live" ? "POSTGRESQL EN VIVO" : "DATOS EN VIVO"}
            </span>
          </div>
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
            <Button size="sm" onClick={loadData} variant="outline" className="border-white/10 text-zinc-400 h-7 ml-1">
              <RefreshCw className="w-3 h-3" />
            </Button>
            <button
              type="button"
              onClick={() => navigate("/saas/global-dashboard")}
              className="text-[10px] text-violet-400 hover:text-violet-300 border border-violet-500/20 rounded-lg px-2 py-1 ml-1"
            >
              Resumen ejecutivo →
            </button>
          </div>
        </div>
      </div>

      {!onboardingLoading && onboardingProgress && (showOnboardingCta || showCompleteButEmpty) && (
        <div className="mb-5 space-y-3">
          {showOnboardingCta && (
            <div className="rounded-xl border border-amber-500/25 bg-gradient-to-r from-amber-500/[0.08] via-violet-500/[0.06] to-emerald-500/[0.06] p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
                  <Rocket className="w-5 h-5 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">Continúa la configuración</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {onboardingProgress.completed_count}/{onboardingProgress.total_count} pasos ·{" "}
                    {onboardingProgress.progress_percent}% — así sacarás más partido a NELVYON.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  className="bg-amber-500/90 hover:bg-amber-500 text-black font-semibold"
                  onClick={() => navigate("/saas/onboarding")}
                >
                  Continuar configuración
                </Button>
                {showSparseSeed && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/15 text-zinc-200"
                    onClick={handleSeedDemo}
                    disabled={seedLoading}
                  >
                    {seedLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Database className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Cargar datos de ejemplo
                  </Button>
                )}
              </div>
            </div>
          )}

          {showCompleteButEmpty && !showOnboardingCta && (
            <div className="rounded-xl border border-violet-500/20 bg-[#0A0E13] p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-violet-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">Tu workspace aún tiene pocos datos</p>
                  <p className="text-xs text-zinc-500">
                    Carga un juego de ejemplo para ver contactos, deals y campañas en vivo.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="bg-violet-500/15 border border-violet-500/30 text-violet-200 hover:bg-violet-500/25"
                onClick={handleSeedDemo}
                disabled={seedLoading}
              >
                {seedLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Cargar datos de ejemplo
              </Button>
            </div>
          )}
        </div>
      )}

      {loadingData ? (
        <div className="space-y-5">
          {/* Skeleton KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl p-4 bg-[#0F1419] border border-white/[0.06]">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-2.5 bg-white/[0.06] rounded w-20" />
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04]" />
                </div>
                <div className="h-6 bg-white/[0.08] rounded w-24 mb-2" />
                <div className="h-2 bg-white/[0.04] rounded w-16" />
              </div>
            ))}
          </div>
          {/* Skeleton Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl p-5 bg-[#0F1419] border border-white/[0.06]">
                <div className="h-3.5 bg-white/[0.06] rounded w-32 mb-4" />
                <div className="flex items-end gap-2 h-[180px]">
                  {Array.from({ length: 10 }).map((_, j) => (
                    <div key={j} className="flex-1 rounded-t bg-white/[0.04]" style={{ height: `${25 + Math.random() * 65}%` }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          {/* Skeleton Activity */}
          <div className="animate-pulse rounded-xl p-5 bg-[#0F1419] border border-white/[0.06]">
            <div className="h-3.5 bg-white/[0.06] rounded w-40 mb-4" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3 border-b border-white/[0.03]">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04]" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-white/[0.06] rounded w-2/5" />
                  <div className="h-2 bg-white/[0.04] rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Main KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {kpiCards.map((m, i) => (
              <div key={m.label}
                className={cn("p-4 rounded-xl bg-[#0A0E13] border border-white/[0.04] hover:border-white/[0.08] transition-all duration-500",
                  animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                )} style={{ transitionDelay: `${i * 60}ms` }}>
                <div className="flex items-center justify-between mb-3">
                  <div className={cn("w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center", m.bg)}>
                    <m.icon className={cn("w-4 h-4", m.color)} />
                  </div>
                  <div className="flex items-center gap-1">
                    <Database className="w-2.5 h-2.5 text-emerald-500/60" />
                    <span className="text-[8px] text-emerald-500/60 font-medium">LIVE</span>
                  </div>
                </div>
                <p className="text-2xl font-bold text-white">
                  <AnimatedNumber value={Math.round(m.value)} prefix={m.prefix || ""} />
                </p>
                <p className="text-[10px] text-zinc-500 mb-1">{m.label}</p>
                {m.period > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                    <span className="text-[9px] text-emerald-400 font-medium">
                      +{m.period.toLocaleString()} {m.periodLabel || `en ${period}`}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Secondary KPIs Row */}
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
            {secondaryKpis.map(s => (
              <div key={s.label} className="p-3 rounded-xl bg-[#0A0E13] border border-white/[0.04] text-center hover:border-white/[0.08] transition-all">
                <s.icon className={cn("w-4 h-4 mx-auto mb-1.5", s.color)} />
                <p className="text-sm font-bold text-white">{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</p>
                <p className="text-[8px] text-zinc-600 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Revenue Chart */}
            <div className="lg:col-span-7 rounded-xl bg-[#0A0E13] border border-white/[0.04] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-violet-400" />
                  <span className="text-xs font-semibold text-white">Revenue por Día</span>
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Database className="w-2 h-2 inline mr-0.5" />PostgreSQL
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-400">
                  €{chartData.reduce((a, b) => a + b.total, 0).toLocaleString()}
                </span>
              </div>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="dealGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="label" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="sales" stroke="#8B5CF6" fill="url(#revGrad)" strokeWidth={2} name="Ventas" />
                    <Area type="monotone" dataKey="deals" stroke="#10B981" fill="url(#dealGrad)" strokeWidth={2} name="Deals" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[220px] text-zinc-600 text-xs">
                  <FileText className="w-5 h-5 mr-2" />
                  Sin datos de revenue en este período. Registra ventas para ver el gráfico.
                </div>
              )}
              {/* MRR / ARR Summary */}
              {k && (
                <div className="mt-4 pt-3 border-t border-white/[0.04] grid grid-cols-4 gap-2">
                  {[
                    { label: "MRR", value: `€${k.subscriptions.mrr.toLocaleString()}` },
                    { label: "ARR", value: `€${k.subscriptions.arr.toLocaleString()}` },
                    { label: "Ticket Medio", value: `€${k.sales.avg_ticket.toLocaleString()}` },
                    { label: "Deal Medio", value: `€${k.deals.avg_deal.toLocaleString()}` },
                  ].map(r => (
                    <div key={r.label} className="text-center">
                      <p className="text-xs font-bold text-white">{r.value}</p>
                      <p className="text-[8px] text-zinc-600">{r.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Activity Timeline */}
            <div className="lg:col-span-5 rounded-xl bg-[#0A0E13] border border-white/[0.04] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <span className="text-xs font-semibold text-white">Actividad Reciente</span>
                </div>
                <span className="text-[9px] text-zinc-600">{recentItems.length} items</span>
              </div>
              {recentItems.length === 0 ? (
                <div className="text-center py-10">
                  <Activity className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-xs text-zinc-500">No hay actividad reciente. Crea contactos, deals o campañas para ver el feed.</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                  {recentItems.map((item, i) => {
                    const ti = typeIcons[item.type] || typeIcons.activity;
                    const Icon = ti.icon;
                    return (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.04] transition-all">
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", ti.bg)}>
                          <Icon className={cn("w-3.5 h-3.5", ti.color)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-medium text-white truncate">{item.title}</p>
                          <p className="text-[9px] text-zinc-600 truncate">
                            {item.subtitle}
                            {item.created_at && ` · ${new Date(item.created_at).toLocaleDateString("es", { day: "2-digit", month: "short" })}`}
                          </p>
                        </div>
                        {item.status && (
                          <span className={cn("text-[8px] px-1.5 py-0.5 rounded font-bold shrink-0",
                            item.status === "won" || item.status === "closed" || item.status === "paid" || item.status === "active"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : item.status === "lost" || item.status === "cancelled"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-amber-500/10 text-amber-400"
                          )}>
                            {item.status}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick Access Modules */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white">Módulos Disponibles</span>
                <span className="text-[9px] text-zinc-500">{serviceModules.length} servicios</span>
              </div>
              <button onClick={() => navigate("/saas/analytics")} className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 transition-colors">
                Ver Analytics completo <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {serviceModules.map(svc => (
                <button key={svc.label}
                  onClick={() => navigate(svc.path)}
                  className="p-3 rounded-xl bg-[#0A0E13] border border-white/[0.04] hover:border-white/[0.08] transition-all group text-center">
                  <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center mx-auto mb-1.5 group-hover:scale-110 transition-transform", svc.bg)}>
                    <svc.icon className={cn("w-3.5 h-3.5", svc.color)} />
                  </div>
                  <p className="text-[9px] font-semibold text-white group-hover:text-violet-300 transition-colors">{svc.label}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </SaasLayout>
  );
}