/**
 * SaasBilling — Production-Ready Billing with Real Usage Meters & Invoices from Backend
 */
import { useState, useEffect, useCallback } from "react";
import SaasLayout from "@/components/SaasLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { PLANS, BILLING_OPTIONS, calculatePrice } from "@/lib/plans";
import { api, type BillingUsageMeter, type BillingInvoice } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard, Calendar, CheckCircle, XCircle, Clock,
  AlertTriangle, RefreshCw, Crown, ArrowRight, Database,
  Receipt, TrendingUp, DollarSign, Download, Zap, Users,
  HardDrive, Activity, BarChart3, Shield, Bell, FileText
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SubscriptionRecord {
  id: number;
  plan_id: string;
  billing_cycle: string;
  status: string;
  amount_paid: number | null;
  currency: string | null;
  started_at: string | null;
  expires_at: string | null;
  created_at: string | null;
}

interface UsageStats {
  totalPaid: number;
  activeMonths: number;
  avgMonthly: number;
  lastPayment: string | null;
}

// Icon mapping for usage meters from backend
const METER_ICONS: Record<string, typeof Users> = {
  contacts: Users,
  api_calls: Activity,
  storage: HardDrive,
  emails: FileText,
  workflows: Zap,
  users: Users,
};

export default function SaasBilling() {
  const { user, isSuperAdmin, currentPlan, subscriptionInfo, refreshSubscription } = useAuth();
  const { colors } = useTheme();
  const navigate = useNavigate();
  const [history, setHistory] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendConnected, setBackendConnected] = useState(false);
  const [usageStats, setUsageStats] = useState<UsageStats>({ totalPaid: 0, activeMonths: 0, avgMonthly: 0, lastPayment: null });
  const [activeTab, setActiveTab] = useState<"overview" | "usage" | "invoices" | "plans">("overview");

  // Real data from backend
  const [usageMeters, setUsageMeters] = useState<BillingUsageMeter[]>([]);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [usageUpdatedAt, setUsageUpdatedAt] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getSubscriptions(0, 200);
      const items = (res.items || []) as unknown as SubscriptionRecord[];
      setHistory(items);
      if (items.length > 0) {
        setBackendConnected(true);
        const totalPaid = items.reduce((s, i) => s + (i.amount_paid || 0), 0);
        const sorted = [...items].sort((a, b) => new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime());
        setUsageStats({
          totalPaid,
          activeMonths: items.filter((i) => i.status === "active").length,
          avgMonthly: items.length > 0 ? totalPaid / items.length : 0,
          lastPayment: sorted[0]?.created_at || null,
        });
      }
    } catch {
      if (import.meta.env.DEV) console.warn("[SaasBilling] fetch error");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsage = useCallback(async () => {
    try {
      setUsageLoading(true);
      const data = await api.getBillingUsage();
      if (data.meters.length > 0) {
        setUsageMeters(data.meters);
        setUsageUpdatedAt(data.updated_at);
        setBackendConnected(true);
      }
    } catch {
      if (import.meta.env.DEV) console.warn("[SaasBilling] usage fetch error");
    } finally {
      setUsageLoading(false);
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    try {
      setInvoicesLoading(true);
      const data = await api.getBillingInvoices();
      if (data.invoices.length > 0) {
        setInvoices(data.invoices);
        setBackendConnected(true);
      }
    } catch {
      if (import.meta.env.DEV) console.warn("[SaasBilling] invoices fetch error");
    } finally {
      setInvoicesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
    fetchUsage();
    fetchInvoices();
  }, [fetchHistory, fetchUsage, fetchInvoices]);

  const refreshAll = useCallback(() => {
    fetchHistory();
    fetchUsage();
    fetchInvoices();
  }, [fetchHistory, fetchUsage, fetchInvoices]);

  const plan = PLANS[currentPlan];

  const statusConfig: Record<string, { bg: string; text: string; icon: typeof CheckCircle; label: string }> = {
    active: { bg: "bg-emerald-500/10", text: "text-emerald-400", icon: CheckCircle, label: "Activa" },
    pending: { bg: "bg-amber-500/10", text: "text-amber-400", icon: Clock, label: "Pendiente" },
    past_due: { bg: "bg-red-500/10", text: "text-red-400", icon: AlertTriangle, label: "Pago Vencido" },
    cancelled: { bg: "bg-slate-500/10", text: "text-slate-400", icon: XCircle, label: "Cancelada" },
    trialing: { bg: "bg-blue-500/10", text: "text-blue-400", icon: Zap, label: "Prueba" },
  };

  const invoiceStatusConfig: Record<string, { color: string; label: string }> = {
    paid: { color: "bg-emerald-500/10 text-emerald-400", label: "Pagada" },
    pending: { color: "bg-amber-500/10 text-amber-400", label: "Pendiente" },
    overdue: { color: "bg-red-500/10 text-red-400", label: "Vencida" },
    draft: { color: "bg-zinc-500/10 text-zinc-400", label: "Borrador" },
  };

  const formatDate = (d: string | null) => {
    if (!d) return "\u2014";
    return new Date(d).toLocaleDateString("es", { year: "numeric", month: "long", day: "numeric" });
  };

  const formatCurrency = (amount: number | null, currency?: string | null) => {
    if (amount == null) return "\u2014";
    const sym = (currency || "eur").toUpperCase() === "EUR" ? "\u20AC" : "$";
    return `${sym}${amount.toFixed(2)}`;
  };

  const getUsagePercent = (current: number, limit: number) => {
    if (limit <= 0) return 0;
    return Math.min(100, Math.round((current / limit) * 100));
  };

  const getUsageColor = (percent: number) => {
    if (percent >= 90) return "bg-red-500";
    if (percent >= 75) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const overageAlerts = usageMeters.filter(m => getUsagePercent(m.current, m.limit) >= 80);

  const tabs = [
    { key: "overview" as const, label: "Resumen", icon: TrendingUp },
    { key: "usage" as const, label: "Uso y Limites", icon: BarChart3, badge: overageAlerts.length > 0 ? overageAlerts.length : 0 },
    { key: "invoices" as const, label: "Facturas", icon: Receipt },
    { key: "plans" as const, label: "Planes", icon: Crown },
  ];

  // Skeleton loader for cards
  const SkeletonCard = () => (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 animate-pulse">
      <div className="h-3 w-24 bg-white/10 rounded mb-3" />
      <div className="h-6 w-16 bg-white/10 rounded mb-2" />
      <div className="h-1.5 w-full bg-white/5 rounded-full" />
    </div>
  );

  return (
    <SaasLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-violet-400" /> Facturación y Uso
            </h1>
            <p className="text-xs text-white/40 mt-1">
              Suscripción, uso de recursos, facturas y planes
              {usageUpdatedAt && (
                <span className="ml-2 text-white/20">
                  · Actualizado {new Date(usageUpdatedAt).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn("text-[10px] border",
              backendConnected
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
            )}>
              <Database className="w-3 h-3 mr-1" />
              {backendConnected ? "Backend Conectado" : "Sin datos"}
            </Badge>
            <Button size="sm" variant="ghost" onClick={refreshAll} className="text-white/40 text-xs">
              <RefreshCw className={cn("w-3.5 h-3.5 mr-1", (loading || usageLoading) && "animate-spin")} /> Actualizar
            </Button>
          </div>
        </div>

        {/* Overage Alerts */}
        {overageAlerts.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Bell className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-amber-300">Alertas de Uso</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {overageAlerts.map(m => {
                    const pct = getUsagePercent(m.current, m.limit);
                    return (
                      <span key={m.id} className={cn("text-[10px] px-2 py-1 rounded-full",
                        pct >= 90 ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"
                      )}>
                        {m.label}: {pct}% ({m.current.toLocaleString()}/{m.limit.toLocaleString()} {m.unit})
                      </span>
                    );
                  })}
                </div>
                {currentPlan !== "enterprise" && (
                  <Button size="sm" variant="ghost" onClick={() => navigate("/saas/pricing")}
                    className="text-amber-400 hover:text-amber-300 text-[11px] mt-2 p-0 h-auto">
                    Mejorar plan para aumentar límites <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white/[0.03] rounded-lg p-1 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap",
                activeTab === t.key ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60")}>
              <t.icon className="w-3.5 h-3.5" /> {t.label}
              {"badge" in t && typeof t.badge === "number" && t.badge > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* ═══ OVERVIEW TAB ═══ */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Current Plan Card */}
            <div className="bg-gradient-to-br from-violet-600/20 via-white/[0.02] to-white/[0.02] border border-violet-500/20 rounded-2xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] text-violet-300 uppercase tracking-wider mb-1">Plan Actual</p>
                  <h2 className="text-2xl font-bold text-white">{plan?.name || currentPlan}</h2>
                  <p className="text-xs text-white/40 mt-2">
                    {subscriptionInfo?.status === "active" ? "Suscripción activa" :
                     subscriptionInfo?.status === "trialing" ? "Período de prueba" :
                     "Plan gratuito"}
                  </p>
                  {subscriptionInfo?.current_period_end && (
                    <p className="text-[10px] text-white/30 mt-1">
                      Próxima renovación: {formatDate(subscriptionInfo.current_period_end)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-white">
                    {"\u20AC"}{plan?.price || 0}<span className="text-sm text-white/40">/mes</span>
                  </p>
                  {currentPlan !== "enterprise" && (
                    <Button size="sm" onClick={() => navigate("/saas/pricing")}
                      className="mt-3 bg-violet-600 hover:bg-violet-500 text-white text-xs">
                      Mejorar Plan <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Total Pagado", value: formatCurrency(usageStats.totalPaid), icon: DollarSign, color: "text-emerald-400" },
                { label: "Pagos Realizados", value: String(history.length), icon: Receipt, color: "text-blue-400" },
                { label: "Promedio Mensual", value: formatCurrency(usageStats.avgMonthly), icon: TrendingUp, color: "text-violet-400" },
                { label: "Último Pago", value: usageStats.lastPayment ? formatDate(usageStats.lastPayment) : "\u2014", icon: Calendar, color: "text-amber-400" },
              ].map(kpi => (
                <div key={kpi.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <kpi.icon className={cn("w-3.5 h-3.5", kpi.color)} />
                    <span className="text-[10px] text-white/40 uppercase">{kpi.label}</span>
                  </div>
                  <p className="text-lg font-bold text-white">{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Quick Usage Overview — from real backend */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-sky-400" /> Uso en Tiempo Real
              </h3>
              {usageLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : usageMeters.length === 0 ? (
                <div className="text-center py-8 text-white/30">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Sin datos de uso disponibles. Crea contenido para ver métricas.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {usageMeters.map(m => {
                    const pct = getUsagePercent(m.current, m.limit);
                    const MeterIcon = METER_ICONS[m.id] || Activity;
                    return (
                      <div key={m.id} className="bg-white/[0.02] rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <MeterIcon className={cn("w-3 h-3", m.color)} />
                            <span className="text-[10px] text-white/40">{m.label}</span>
                          </div>
                          <span className={cn("text-[10px] font-medium",
                            pct >= 90 ? "text-red-400" : pct >= 75 ? "text-amber-400" : "text-emerald-400"
                          )}>{pct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all", getUsageColor(pct))}
                            style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-white/30 mt-1">
                          {m.current.toLocaleString()} / {m.limit.toLocaleString()} {m.unit}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Features included */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> Incluido en tu plan
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {(plan?.features || []).map((f: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-white/60">
                    <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" /> {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ USAGE TAB ═══ */}
        {activeTab === "usage" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/50">Monitorea el consumo de recursos en tiempo real</p>
              <Button size="sm" variant="ghost" onClick={fetchUsage} className="text-white/40 text-xs">
                <RefreshCw className={cn("w-3 h-3 mr-1", usageLoading && "animate-spin")} /> Refrescar
              </Button>
            </div>

            {usageLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : usageMeters.length === 0 ? (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-12 text-center">
                <BarChart3 className="w-10 h-10 mx-auto mb-3 text-white/20" />
                <p className="text-xs text-white/30">Sin datos de uso. Los contadores se actualizan cuando creas contactos, contratos, campañas, etc.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {usageMeters.map(m => {
                  const pct = getUsagePercent(m.current, m.limit);
                  const isWarning = pct >= 75;
                  const isCritical = pct >= 90;
                  const MeterIcon = METER_ICONS[m.id] || Activity;
                  return (
                    <div key={m.id} className={cn(
                      "bg-white/[0.03] border rounded-xl p-5 transition-all",
                      isCritical ? "border-red-500/20" : isWarning ? "border-amber-500/20" : "border-white/[0.06]"
                    )}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <MeterIcon className={cn("w-4 h-4", m.color)} />
                          <span className="text-sm font-medium text-white">{m.label}</span>
                        </div>
                        <Badge className={cn("text-[9px]",
                          isCritical ? "bg-red-500/10 text-red-400" :
                          isWarning ? "bg-amber-500/10 text-amber-400" :
                          "bg-emerald-500/10 text-emerald-400"
                        )}>
                          {pct}%
                        </Badge>
                      </div>

                      <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden mb-3">
                        <div className={cn("h-full rounded-full transition-all duration-500", getUsageColor(pct))}
                          style={{ width: `${pct}%` }} />
                      </div>

                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-white/50">
                          {m.current.toLocaleString()} / {m.limit.toLocaleString()} {m.unit}
                        </span>
                        <span className="text-white/30">
                          {Math.max(0, m.limit - m.current).toLocaleString()} restantes
                        </span>
                      </div>

                      {m.overage_rate != null && m.overage_rate > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/[0.06]">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-white/30">Tarifa excedente:</span>
                            <span className="text-white/50">{"\u20AC"}{m.overage_rate}/{m.unit === "GB" ? "GB extra" : "unidad extra"}</span>
                          </div>
                          {isCritical && (
                            <div className="mt-2 bg-red-500/5 border border-red-500/10 rounded-lg p-2">
                              <p className="text-[10px] text-red-400 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Cerca del límite. Se aplicarán cargos por excedente.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Rate Limits */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-sky-400" /> Rate Limits por Plan
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left text-white/30 uppercase font-medium px-3 py-2">Recurso</th>
                      <th className="text-center text-white/30 uppercase font-medium px-3 py-2">Starter</th>
                      <th className="text-center text-white/30 uppercase font-medium px-3 py-2">Pro</th>
                      <th className="text-center text-white/30 uppercase font-medium px-3 py-2">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { resource: "Contactos", starter: "5,000", pro: "25,000", enterprise: "100,000" },
                      { resource: "API Calls/mes", starter: "25,000", pro: "100,000", enterprise: "500,000" },
                      { resource: "Almacenamiento", starter: "5 GB", pro: "25 GB", enterprise: "100 GB" },
                      { resource: "Usuarios", starter: "5", pro: "25", enterprise: "100" },
                      { resource: "Emails/mes", starter: "10,000", pro: "50,000", enterprise: "200,000" },
                      { resource: "Workflows", starter: "20", pro: "100", enterprise: "500" },
                    ].map(row => (
                      <tr key={row.resource} className="border-b border-white/[0.03]">
                        <td className="px-3 py-2 text-white/60">{row.resource}</td>
                        <td className="px-3 py-2 text-center text-white/40">{row.starter}</td>
                        <td className={cn("px-3 py-2 text-center",
                          currentPlan === "pro" ? "text-violet-400 font-medium" : "text-white/40"
                        )}>{row.pro}</td>
                        <td className={cn("px-3 py-2 text-center",
                          currentPlan === "enterprise" ? "text-emerald-400 font-medium" : "text-white/40"
                        )}>{row.enterprise}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══ INVOICES TAB ═══ */}
        {activeTab === "invoices" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-xs text-white/50">
                {invoicesLoading ? "Cargando..." : `${invoices.length + history.length} registros de facturación`}
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={fetchInvoices} className="text-white/40 text-xs">
                  <RefreshCw className={cn("w-3 h-3 mr-1", invoicesLoading && "animate-spin")} /> Refrescar
                </Button>
                <Button variant="ghost" size="sm" className="text-white/40 text-xs"
                  onClick={() => toast.success("Exportando facturas...")}>
                  <Download className="w-3.5 h-3.5 mr-1" /> Exportar Todo
                </Button>
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
              {invoicesLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left text-white/30 uppercase font-medium px-4 py-3">Factura</th>
                        <th className="text-left text-white/30 uppercase font-medium px-4 py-3">Fecha</th>
                        <th className="text-left text-white/30 uppercase font-medium px-4 py-3">Plan</th>
                        <th className="text-left text-white/30 uppercase font-medium px-4 py-3">Período</th>
                        <th className="text-left text-white/30 uppercase font-medium px-4 py-3">Monto</th>
                        <th className="text-left text-white/30 uppercase font-medium px-4 py-3">Estado</th>
                        <th className="text-left text-white/30 uppercase font-medium px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Real invoices from backend */}
                      {invoices.map(inv => (
                        <tr key={inv.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3">
                            <span className="text-white/70 font-mono">{inv.number}</span>
                          </td>
                          <td className="px-4 py-3 text-white/40">{formatDate(inv.date)}</td>
                          <td className="px-4 py-3 text-white/60">{inv.plan}</td>
                          <td className="px-4 py-3 text-white/40">{inv.period}</td>
                          <td className="px-4 py-3 text-white font-medium">{formatCurrency(inv.amount, inv.currency)}</td>
                          <td className="px-4 py-3">
                            <Badge className={cn("text-[9px]", invoiceStatusConfig[inv.status]?.color)}>
                              {invoiceStatusConfig[inv.status]?.label || inv.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => toast.success("Descargando PDF...")}
                              className="text-sky-400 hover:text-sky-300 transition-colors">
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {/* Backend subscription history entries (fallback if no invoices) */}
                      {invoices.length === 0 && history.map(s => {
                        const sc = statusConfig[s.status] || statusConfig.pending;
                        return (
                          <tr key={s.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3">
                              <span className="text-white/70 font-mono">SUB-{String(s.id).padStart(4, "0")}</span>
                            </td>
                            <td className="px-4 py-3 text-white/40">{formatDate(s.created_at)}</td>
                            <td className="px-4 py-3 text-white/60">{PLANS[s.plan_id as keyof typeof PLANS]?.name || s.plan_id}</td>
                            <td className="px-4 py-3 text-white/40 capitalize">{s.billing_cycle || "\u2014"}</td>
                            <td className="px-4 py-3 text-white font-medium">{formatCurrency(s.amount_paid, s.currency)}</td>
                            <td className="px-4 py-3">
                              <Badge className={cn("text-[9px]", sc.bg, sc.text)}>
                                {sc.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-3"></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {!invoicesLoading && invoices.length === 0 && history.length === 0 && (
                <div className="p-12 text-center text-white/30">
                  <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-xs">Sin facturas. Las facturas se generan automáticamente al realizar pagos.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ PLANS TAB ═══ */}
        {activeTab === "plans" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(PLANS).filter(([k]) => k !== "free").map(([key, p]) => {
              const isCurrent = key === currentPlan;
              return (
                <div key={key} className={cn(
                  "bg-white/[0.03] border rounded-2xl p-6 relative transition-all",
                  isCurrent ? "border-violet-500/40 ring-1 ring-violet-500/20" : "border-white/[0.06] hover:border-white/[0.12]"
                )}>
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-violet-600 rounded-full text-[10px] font-medium text-white">
                      Plan Actual
                    </div>
                  )}
                  <div className="text-center mb-5">
                    <h3 className="text-lg font-bold text-white">{p.name}</h3>
                    <p className="text-2xl font-bold text-white mt-2">
                      {"\u20AC"}{p.price}<span className="text-xs text-white/40">/mes</span>
                    </p>
                  </div>
                  <ul className="space-y-2 mb-5">
                    {(p.features || []).slice(0, 6).map((f: string, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-white/60">
                        <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => !isCurrent && navigate("/saas/pricing")}
                    disabled={isCurrent}
                    className={cn("w-full text-xs",
                      isCurrent
                        ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                        : "bg-violet-600 hover:bg-violet-500 text-white"
                    )}
                  >
                    {isCurrent ? "Plan Actual" : "Seleccionar"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SaasLayout>
  );
}