import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SaasLayout from "@/components/SaasLayout";
import { api, type SalesRecord, type DashboardMetricsResponse, type RevenueChartPoint } from "@/lib/api";
import {
  Check, Star, Crown, Zap, ArrowRight, Clock,
  TrendingUp, Users, CreditCard, Sparkles, Gift, Rocket,
  Handshake, DollarSign, TrendingDown, Shield, X,
  ChevronDown, ChevronUp, BarChart3, RefreshCw, Loader2,
  Heart, Lock, Target, Database
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PLANS, type PlanId, calculatePrice } from "@/lib/plans";
import { redirectToCheckout } from "@/lib/payment-service";
import { toast } from "sonner";

const PERIODS = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
];

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

const planOrder: { id: PlanId; icon: React.ElementType; popular: boolean; tagline: string }[] = [
  { id: "starter", icon: Zap, popular: false, tagline: "Para emprendedores y pequeños negocios" },
  { id: "pro", icon: Rocket, popular: true, tagline: "Para agencias y equipos en crecimiento" },
  { id: "enterprise", icon: Crown, popular: false, tagline: "Para empresas que dominan su mercado" },
];

const comparisonFeatures = [
  { feature: "CRM", starter: true, pro: true, enterprise: true },
  { feature: "Analytics", starter: "Básico", pro: "Avanzado", enterprise: "Premium" },
  { feature: "Contactos", starter: "500", pro: "25,000", enterprise: "Ilimitados" },
  { feature: "Usuarios", starter: "2", pro: "15", enterprise: "Ilimitados" },
  { feature: "Helpdesk", starter: false, pro: true, enterprise: true },
  { feature: "Chatbots IA", starter: false, pro: true, enterprise: true },
  { feature: "VoIP & Llamadas", starter: false, pro: true, enterprise: true },
  { feature: "Workflows", starter: false, pro: true, enterprise: true },
  { feature: "Funnels", starter: false, pro: true, enterprise: true },
  { feature: "Social Media", starter: false, pro: true, enterprise: true },
  { feature: "API + Webhooks", starter: false, pro: true, enterprise: true },
  { feature: "Video Ads Studio", starter: false, pro: false, enterprise: true },
  { feature: "Piloto Automático IA", starter: false, pro: false, enterprise: true },
  { feature: "White-Label completo", starter: false, pro: false, enterprise: true },
  { feature: "Soporte", starter: "Email", pro: "Prioritario", enterprise: "Dedicado 24/7" },
];

const testimonials = [
  { name: "Carlos Méndez", role: "CEO, TechFlow Solutions", text: "NELVYON SaaS transformó completamente nuestra gestión de clientes. El CRM es increíblemente intuitivo y los analytics nos dan visibilidad total.", plan: "Enterprise", avatar: "CM" },
  { name: "María López", role: "Directora, Creativa Digital", text: "Pasamos de GoHighLevel a NELVYON y la diferencia en calidad y diseño es abismal. Nuestro equipo es más productivo que nunca.", plan: "Pro", avatar: "ML" },
  { name: "Roberto Silva", role: "Fundador, EcomMaster", text: "La automatización con bots nos ahorra 20+ horas semanales. El helpdesk integrado es exactamente lo que necesitábamos.", plan: "Enterprise", avatar: "RS" },
];

export default function SaasSales() {
  const { ts } = useI18n();
  const { user, loading, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [animated, setAnimated] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  // Real backend data
  const [period, setPeriod] = useState("30d");
  const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null);
  const [revenueChart, setRevenueChart] = useState<RevenueChartPoint[]>([]);
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const loadBackendData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [metricsRes, chartRes, salesRes] = await Promise.allSettled([
        api.getDashboardMetrics(period),
        api.getRevenueChart(period),
        api.getSalesRecords(0, 200),
      ]);
      if (metricsRes.status === "fulfilled") setMetrics(metricsRes.value);
      if (chartRes.status === "fulfilled") setRevenueChart(chartRes.value.data || []);
      if (salesRes.status === "fulfilled") setSalesRecords(salesRes.value.items || []);
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[SaasSales] backend load error:", err);
    } finally {
      setLoadingData(false);
    }
  }, [period]);

  useEffect(() => {
    if (!loading && !user) navigate("/saas");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) loadBackendData();
  }, [user, loadBackendData]);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const k = metrics?.kpis;
  const recentSales = [...salesRecords].sort((a, b) => {
    const da = a.created_at ? new Date(a.created_at).getTime() : 0;
    const db = b.created_at ? new Date(b.created_at).getTime() : 0;
    return db - da;
  }).slice(0, 8);

  const chartData = revenueChart.map(p => ({
    ...p,
    label: new Date(p.date).toLocaleDateString("es", { day: "2-digit", month: "short" }),
  }));

  const handleSubscribe = async (planId: PlanId) => {
    setLoadingPlan(planId);
    try {
      await redirectToCheckout(planId, "annual");
      toast.success("Redirigiendo a Stripe...");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al crear sesión de pago");
    } finally {
      setLoadingPlan(null);
    }
  };

  const renderVal = (val: boolean | string) => {
    if (val === true) return <Check className="w-4 h-4 text-emerald-400 mx-auto" />;
    if (val === false) return <X className="w-3.5 h-3.5 text-zinc-700 mx-auto" />;
    return <span className="text-xs text-zinc-400 font-medium">{val}</span>;
  };

  const statusColor = (s?: string) => {
    switch (s) {
      case "closed": case "paid": return "text-emerald-400 bg-emerald-500/10";
      case "pending": return "text-amber-400 bg-amber-500/10";
      case "cancelled": case "lost": return "text-red-400 bg-red-500/10";
      default: return "text-blue-400 bg-blue-500/10";
    }
  };

  return (
    <SaasLayout title="Ventas & Pricing" subtitle="Dashboard de ventas real + Planes y precios de NELVYON SaaS">
      {/* ═══ REAL SALES DASHBOARD ═══ */}
      {isSuperAdmin && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              Dashboard de Ventas — Datos Reales
            </h2>
            <div className="flex items-center gap-2">
              {PERIODS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all border",
                    period === p.key
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "text-zinc-500 hover:text-zinc-300 border-transparent"
                  )}
                >
                  {p.label}
                </button>
              ))}
              <Button size="sm" variant="outline" onClick={loadBackendData} className="border-white/10 text-zinc-400 h-7 gap-1 ml-1">
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-medium">
              <Database className="w-3 h-3 inline mr-1" />
              Conectado a PostgreSQL — Métricas agregadas en tiempo real
            </span>
          </div>

          {loadingData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-xl p-4 bg-[#0A0E13] border border-white/[0.04]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="h-3 w-16 bg-white/[0.06] rounded" />
                      <div className="h-8 w-8 bg-white/[0.04] rounded-lg" />
                    </div>
                    <div className="h-6 w-24 bg-white/[0.08] rounded mb-1" />
                    <div className="h-2.5 w-14 bg-white/[0.04] rounded" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-xl p-5 bg-[#0A0E13] border border-white/[0.04]">
                    <div className="h-4 w-32 bg-white/[0.06] rounded mb-4" />
                    <div className="flex items-end gap-2 h-[180px]">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <div key={j} className="flex-1 rounded-t bg-white/[0.04]" style={{ height: `${30 + Math.random() * 60}%` }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="animate-pulse rounded-xl bg-[#0A0E13] border border-white/[0.04] overflow-hidden">
                <div className="flex items-center gap-4 px-4 py-3 border-b border-white/[0.04] bg-white/[0.02]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-3 bg-white/[0.06] rounded" style={{ width: `${Math.max(10, 22 - i * 3)}%` }} />
                  ))}
                </div>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-white/[0.03]">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <div key={j} className="h-3 bg-white/[0.04] rounded" style={{ width: j === 0 ? '30%' : `${Math.max(8, 20 - j * 3)}%` }} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              {k && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                  {[
                    { label: "Revenue Total", value: `€${k.sales.total_amount.toLocaleString()}`, icon: DollarSign, color: "text-emerald-400", bg: "from-emerald-500/10 to-green-500/10" },
                    { label: `Revenue ${period}`, value: `€${k.sales.period_amount.toLocaleString()}`, icon: TrendingUp, color: "text-blue-400", bg: "from-blue-500/10 to-cyan-500/10" },
                    { label: "Ventas Cerradas", value: k.sales.closed.toString(), icon: Check, color: "text-violet-400", bg: "from-violet-500/10 to-purple-500/10" },
                    { label: "Ticket Medio", value: `€${k.sales.avg_ticket.toLocaleString()}`, icon: CreditCard, color: "text-amber-400", bg: "from-amber-500/10 to-yellow-500/10" },
                    { label: "Pipeline Abierto", value: `€${k.deals.value_total.toLocaleString()}`, icon: Target, color: "text-rose-400", bg: "from-rose-500/10 to-pink-500/10" },
                  ].map(s => (
                    <div key={s.label} className="p-4 rounded-xl bg-[#0F1419] border border-white/[0.04] hover:border-white/[0.08] transition-all">
                      <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center mb-2", s.bg)}>
                        <s.icon className={cn("w-4 h-4", s.color)} />
                      </div>
                      <p className="text-xl font-bold text-white">{s.value}</p>
                      <p className="text-[10px] text-zinc-600">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Revenue Chart */}
              {chartData.length > 0 && (
                <div className="rounded-xl bg-[#0A0E13] border border-white/[0.04] p-5 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-white">Revenue por Día — {period}</span>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="salesRevGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="label" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="total" stroke="#10B981" fill="url(#salesRevGrad)" strokeWidth={2} name="Revenue" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Recent Sales Table */}
              {recentSales.length > 0 && (
                <div className="rounded-xl bg-[#0A0E13] border border-white/[0.04] overflow-hidden mb-6">
                  <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Últimas Ventas</span>
                    <span className="text-[10px] text-zinc-600">{salesRecords.length} registros totales</span>
                  </div>
                  <div className="divide-y divide-white/[0.03]">
                    {recentSales.map(sale => (
                      <div key={sale.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                            {(sale.client_name || "??").substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white">{sale.client_name}</p>
                            <p className="text-[10px] text-zinc-600">
                              {sale.product || "—"} · {sale.payment_method || "—"}
                              {sale.created_at && ` · ${new Date(sale.created_at).toLocaleDateString("es", { day: "2-digit", month: "short" })}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-white">€{(sale.amount || 0).toLocaleString()}</p>
                          <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-semibold", statusColor(sale.status))}>
                            {(sale.status || "pending").toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {salesRecords.length === 0 && (
                <div className="text-center py-12 rounded-xl bg-[#0A0E13] border border-white/[0.04] mb-6">
                  <DollarSign className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500 mb-1">No hay registros de ventas aún</p>
                  <p className="text-xs text-zinc-600">Los datos aparecerán aquí cuando se registren ventas en la base de datos.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══ PRICING SECTION ═══ */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400 font-medium mb-4">
          <Sparkles className="w-3 h-3" />
          Planes que escalan contigo
        </div>
        <h1 className="text-3xl font-black text-white mb-3">
          Elige el plan perfecto para tu negocio
        </h1>
        <p className="text-sm text-zinc-500 max-w-lg mx-auto">
          Desde emprendedores hasta empresas enterprise. Todos los planes incluyen 14 días de garantía de devolución.
        </p>
      </div>

      {/* GHL Comparison Banner */}
      <div className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/[0.06] to-amber-500/[0.06] border border-emerald-500/15">
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <TrendingDown className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold text-white">NELVYON vs GoHighLevel:</span>
          {[
            { n: "Starter €79", g: "GHL $97", save: "18%" },
            { n: "Pro €249", g: "GHL $297", save: "16%" },
            { n: "Enterprise €449", g: "GHL $497 + White-Label incluido", save: "10%+" },
          ].map(c => (
            <div key={c.n} className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-emerald-400">{c.n}</span>
              <span className="text-[10px] text-red-400 line-through">{c.g}</span>
              <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">-{c.save}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {planOrder.map((p, idx) => {
          const plan = PLANS[p.id];
          const annual = calculatePrice(plan.price, "annual");
          const PlanIcon = p.icon;
          const isLoading = loadingPlan === p.id;

          return (
            <div
              key={p.id}
              className={cn(
                "relative rounded-2xl border overflow-hidden transition-all duration-500 group hover:scale-[1.02] hover:shadow-2xl",
                p.popular
                  ? "bg-gradient-to-b from-violet-500/[0.1] to-[#0A0E13] border-violet-500/25 shadow-lg shadow-violet-500/10 ring-1 ring-violet-500/10"
                  : "bg-[#0A0E13] border-white/[0.06]",
                animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              )}
              style={{ transitionDelay: `${idx * 120}ms` }}
            >
              {p.popular && (
                <>
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
                  <div className="absolute top-4 right-4">
                    <span className="px-2.5 py-1 rounded-full bg-violet-500/20 text-[9px] font-black text-violet-300 border border-violet-500/30 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-violet-400 text-violet-400" /> MÁS POPULAR
                    </span>
                  </div>
                </>
              )}
              {p.id === "enterprise" && (
                <>
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
                  <div className="absolute top-4 right-4">
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-[9px] font-black text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <Crown className="w-3 h-3 text-amber-400" /> WHITE-LABEL
                    </span>
                  </div>
                </>
              )}

              <div className="p-7">
                <div className={cn("inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br mb-5 shadow-lg group-hover:scale-110 transition-transform", plan.gradient)}>
                  <PlanIcon className="w-6 h-6 text-white" />
                </div>

                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <p className="text-xs text-zinc-500 mt-1 mb-5 min-h-[32px]">{p.tagline}</p>

                <div className="mb-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">€{annual.monthlyPrice}</span>
                    <span className="text-sm text-zinc-500">/mes</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-zinc-600 line-through">€{plan.price}/mes</span>
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-0.5 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                      <TrendingDown className="w-3 h-3" /> -25% anual
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-1">Total: €{annual.totalPrice.toLocaleString()}/año</p>
                </div>

                {plan.ghlComparison && (
                  <div className="mb-5 p-2.5 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15">
                    <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <TrendingDown className="w-3 h-3 shrink-0" />
                      {plan.ghlComparison}
                    </p>
                  </div>
                )}

                <Button
                  onClick={() => handleSubscribe(p.id)}
                  disabled={isLoading || !!loadingPlan}
                  className={cn(
                    "w-full h-12 rounded-xl font-bold mb-6 transition-all text-white shadow-lg",
                    p.popular
                      ? "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-violet-500/25"
                      : p.id === "enterprise"
                      ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-amber-500/20"
                      : "bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-400 hover:to-cyan-500 shadow-blue-500/20"
                  )}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Conectando...</span>
                  ) : (
                    <><CreditCard className="w-4 h-4 mr-2" /> Contratar {plan.name} <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>

                <div className="space-y-2">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: plan.color }} />
                      <span className="text-[11px] text-zinc-400 leading-tight">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Partner CTA */}
      <div className="rounded-2xl bg-gradient-to-r from-orange-500/[0.08] to-amber-500/[0.06] border border-orange-500/15 p-8 text-center mb-12">
        <Handshake className="w-10 h-10 text-orange-400 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-white mb-2">¿Quieres revender estos servicios?</h3>
        <p className="text-sm text-zinc-400 max-w-lg mx-auto mb-5">
          Únete al Programa Partners por solo €50/mes. White-label 100%, márgenes del 70-90%, contrato flexible.
        </p>
        <Button
          onClick={() => navigate("/saas/partners")}
          className="bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:opacity-90 shadow-lg shadow-orange-500/20"
        >
          <DollarSign className="w-4 h-4 mr-2" />
          Ver Programa Partners — €50/mes
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Comparison Table Toggle */}
      <div className="mb-12">
        <button
          onClick={() => setShowComparison(!showComparison)}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#0A0E13] border border-white/[0.06] hover:border-white/[0.1] transition-all text-sm font-semibold text-zinc-400 hover:text-white"
        >
          <BarChart3 className="w-4 h-4" />
          {showComparison ? "Ocultar comparativa" : "Ver comparativa detallada"}
          {showComparison ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showComparison && (
          <div className="mt-4 rounded-2xl bg-[#0A0E13] border border-white/[0.06] overflow-hidden animate-in slide-in-from-top-2 duration-300">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-xs font-bold text-zinc-400 px-5 py-3 w-1/4">Función</th>
                    <th className="text-center text-xs font-bold px-5 py-3" style={{ color: PLANS.starter.color }}>⚡ Starter</th>
                    <th className="text-center text-xs font-bold px-5 py-3" style={{ color: PLANS.pro.color }}>🚀 Pro</th>
                    <th className="text-center text-xs font-bold px-5 py-3" style={{ color: PLANS.enterprise.color }}>👑 Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map(row => (
                    <tr key={row.feature} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3 text-xs text-white font-medium">{row.feature}</td>
                      <td className="px-5 py-3 text-center">{renderVal(row.starter)}</td>
                      <td className="px-5 py-3 text-center">{renderVal(row.pro)}</td>
                      <td className="px-5 py-3 text-center">{renderVal(row.enterprise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Testimonials */}
      <div className="mb-12">
        <h2 className="text-lg font-bold text-white text-center mb-6 flex items-center justify-center gap-2">
          <Heart className="w-5 h-5 text-red-400" />
          Lo que dicen nuestros clientes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map(t => (
            <div key={t.name} className="p-5 rounded-2xl bg-[#0A0E13] border border-white/[0.06] hover:border-white/[0.1] transition-all">
              <div className="flex items-center gap-1 mb-3">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs text-zinc-400 mb-4 italic leading-relaxed">&quot;{t.text}&quot;</p>
              <div className="flex items-center gap-3 pt-3 border-t border-white/[0.04]">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{t.name}</p>
                  <p className="text-[10px] text-zinc-600">{t.role}</p>
                </div>
                <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  {t.plan}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Guarantees */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-500/[0.06] via-violet-500/[0.04] to-amber-500/[0.06] border border-emerald-500/10 p-8">
        <h3 className="text-center text-sm font-bold text-white mb-6 flex items-center justify-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          Tu inversión está protegida
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: Gift, label: "14 días de garantía", desc: "Devolución 100%" },
            { icon: Lock, label: "Pago seguro", desc: "Stripe SSL 256-bit" },
            { icon: Clock, label: "Sin permanencia", desc: "Cancela cuando quieras" },
            { icon: Rocket, label: "Setup instantáneo", desc: "Onboarding guiado" },
          ].map(g => (
            <div key={g.label} className="flex flex-col items-center gap-2 text-center">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <g.icon className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-xs font-bold text-white">{g.label}</p>
              <p className="text-[10px] text-zinc-600">{g.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Button
            onClick={() => navigate("/saas/pricing")}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-500/20"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Ver todos los planes y contratar
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </SaasLayout>
  );
}