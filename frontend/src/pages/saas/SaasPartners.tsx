import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SaasLayout from "@/components/SaasLayout";
import { api, type PartnerRecord } from "@/lib/api";
import {
  Handshake, Crown, Star, Zap, Shield, Check, ArrowRight,
  Users, DollarSign, Globe, Rocket, TrendingUp, Award,
  FileText, Building2, Briefcase, Target, BarChart3,
  Phone, Mail, MessageSquare, Layers, Share2, Calendar,
  CreditCard, BookOpen, Palette, Workflow, HeadphonesIcon,
  ChevronDown, ChevronUp, Sparkles, Lock, BadgePercent,
  CheckCircle2, RefreshCw, Loader2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ─── Partner Tiers ─── */
type PartnerTier = "reseller" | "agency" | "enterprise";

interface PartnerPlan {
  tier: PartnerTier;
  name: string;
  subtitle: string;
  icon: LucideIcon;
  gradient: string;
  border: string;
  monthlyFee: string;
  clientPrice: string;
  margin: string;
  maxClients: string;
  popular?: boolean;
  features: string[];
  contractTerms: string[];
}

const partnerPlans: PartnerPlan[] = [
  {
    tier: "reseller", name: "Partner Base", subtitle: "€50/mes + pago por trabajo",
    icon: BadgePercent, gradient: "from-orange-500 to-amber-600", border: "border-orange-500/20",
    monthlyFee: "€50", clientPrice: "€120-€800/trabajo", margin: "Tú fijas el precio", maxClients: "Ilimitados", popular: true,
    features: [
      "Acceso al programa Partners", "Dashboard de Partner dedicado", "Pago solo por trabajo realizado",
      "Trabajos: Web, Marketing, CRM, SEO, Video...", "Contratos auto-generados por agente IA",
      "Entrega automática al cliente", "Tú cobras a tu cliente lo que quieras", "Soporte Partner incluido",
      "Templates de trabajo incluidos", "Panel de seguimiento de trabajos",
      "Sin compromiso mínimo de clientes", "Facturación transparente por trabajo",
    ],
    contractTerms: [
      "Cuota base: €50/mes", "Cada trabajo se cobra aparte (€120-€800)",
      "Sin compromiso mínimo de permanencia", "Cancelación con 15 días de aviso",
      "Sin penalización por cancelación", "Tú fijas el precio final al cliente",
    ],
  },
  {
    tier: "agency", name: "Agency Partner", subtitle: "Para agencias con volumen",
    icon: Briefcase, gradient: "from-violet-500 to-purple-600", border: "border-violet-500/20",
    monthlyFee: "€199", clientPrice: "€120-€800/trabajo (-20%)", margin: "20% descuento en trabajos", maxClients: "Ilimitados",
    features: [
      "Todo lo del Partner Base +", "20% descuento en todos los trabajos", "Prioridad en cola de ejecución",
      "White-label en entregas", "Account manager dedicado", "Soporte prioritario 24/7",
      "Reportes mensuales de rendimiento", "Materiales de venta incluidos", "Onboarding personalizado",
      "API access para integraciones", "Dashboard avanzado de revenue", "Formación continua del equipo",
    ],
    contractTerms: [
      "Cuota base: €199/mes", "Trabajos con 20% descuento", "Compromiso mínimo: 3 meses",
      "Cancelación con 30 días de aviso", "Account manager dedicado", "SLA de 99.9% uptime",
    ],
  },
  {
    tier: "enterprise", name: "Enterprise Partner", subtitle: "Socio estratégico con exclusividad",
    icon: Crown, gradient: "from-amber-500 to-orange-600", border: "border-amber-500/20",
    monthlyFee: "€497", clientPrice: "€120-€800/trabajo (-40%)", margin: "40% descuento + exclusividad", maxClients: "Ilimitados",
    features: [
      "Todo lo del Agency Partner +", "40% descuento en todos los trabajos", "Exclusividad territorial (opcional)",
      "White-label total (app móvil incluida)", "Revenue share en referidos: 15-30%",
      "Dominio personalizado por cliente", "Integraciones custom", "Consultoría estratégica mensual",
      "Acceso beta a nuevas funciones", "Co-branding en materiales", "Soporte dedicado con Slack privado",
      "Contrato enterprise personalizado", "Dashboard de revenue en tiempo real",
    ],
    contractTerms: [
      "Cuota base: €497/mes", "Trabajos con 40% descuento", "Compromiso mínimo: 6 meses",
      "Exclusividad territorial negociable", "Revenue share en referidos: 15-30%",
      "SLA de 99.99% uptime garantizado", "Renegociación semestral de condiciones",
    ],
  },
];

const deliverableServices = [
  { name: "Web Básica (Landing)", icon: Globe, color: "text-cyan-400", description: "Landing page profesional con formulario de contacto", clientPrice: "€300-€500", yourCost: "€150", margin: "50-70%" },
  { name: "Web Profesional (5-10 pág)", icon: Globe, color: "text-blue-400", description: "Sitio web completo con múltiples páginas y CMS", clientPrice: "€800-€1.500", yourCost: "€450", margin: "44-70%" },
  { name: "E-commerce Completo", icon: CreditCard, color: "text-emerald-400", description: "Tienda online con catálogo, carrito y pagos", clientPrice: "€1.500-€3.000", yourCost: "€800", margin: "47-73%" },
  { name: "Funnel de Ventas", icon: Layers, color: "text-violet-400", description: "Embudo de venta con landing, email sequence y thank you", clientPrice: "€500-€1.000", yourCost: "€250", margin: "50-75%" },
  { name: "Campaña Email Marketing", icon: Mail, color: "text-pink-400", description: "Diseño y configuración de campaña de email completa", clientPrice: "€250-€500", yourCost: "€120", margin: "52-76%" },
  { name: "Setup Social Media", icon: Share2, color: "text-amber-400", description: "Configuración completa de redes sociales + 30 posts", clientPrice: "€400-€800", yourCost: "€200", margin: "50-75%" },
  { name: "Setup CRM Completo", icon: Users, color: "text-blue-400", description: "Configuración de CRM, pipelines, automatizaciones", clientPrice: "€600-€1.200", yourCost: "€300", margin: "50-75%" },
  { name: "Chatbot Personalizado", icon: MessageSquare, color: "text-violet-400", description: "Bot conversacional con IA para atención al cliente", clientPrice: "€700-€1.500", yourCost: "€350", margin: "50-77%" },
];

const tierColor: Record<string, string> = {
  reseller: "text-orange-400 bg-orange-500/10",
  agency: "text-violet-400 bg-violet-500/10",
  enterprise: "text-amber-400 bg-amber-500/10",
};

export default function SaasPartners() {
  const { ts } = useI18n();
  const { user, loading, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [expandedPlan, setExpandedPlan] = useState<PartnerTier | null>(null);
  const [showAllServices, setShowAllServices] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "plans" | "services" | "calculator">("dashboard");
  const [clientCount, setClientCount] = useState(10);
  const [avgPrice, setAvgPrice] = useState(297);
  const [partnerApplicationSent, setPartnerApplicationSent] = useState(false);

  // ── Backend data ──
  const [partnerRecords, setPartnerRecords] = useState<PartnerRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const loadPartnerData = useCallback(async () => {
    setLoadingData(true);
    try {
      const res = await api.getPartnerRecords(0, 200);
      setPartnerRecords(res.items || []);
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[SaasPartners] backend load error:", err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate("/saas");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) loadPartnerData();
  }, [user, loadPartnerData]);

  const handleApplyPartner = async (tier: PartnerTier) => {
    try {
      await api.createPartnerRecord({
        partner_name: user?.name || user?.email || "Nuevo Partner",
        company: "",
        email: user?.email || "",
        tier,
        status: "pending",
        referrals_count: 0,
        conversions_count: 0,
        revenue_generated: 0,
        commission_rate: tier === "enterprise" ? 0.9 : tier === "agency" ? 0.85 : 0.8,
        commission_earned: 0,
      });
      setPartnerApplicationSent(true);
      toast.success(`✅ Solicitud de Partner ${tier} enviada correctamente`);
      loadPartnerData();
    } catch (err) {
      toast.error("Error al enviar solicitud. Inténtalo de nuevo.");
    }
  };

  // ── Derived stats ──
  const totalPartners = partnerRecords.length;
  const activePartners = partnerRecords.filter(p => p.status === "active").length;
  const totalReferrals = partnerRecords.reduce((s, p) => s + (p.referrals_count || 0), 0);
  const totalRevenueGenerated = partnerRecords.reduce((s, p) => s + (p.revenue_generated || 0), 0);
  const totalCommissions = partnerRecords.reduce((s, p) => s + (p.commission_earned || 0), 0);

  const visibleServices = showAllServices ? deliverableServices : deliverableServices.slice(0, 6);
  const avgJobCost = 280;
  const monthlyRevenue = clientCount * avgPrice;
  const monthlyCost = clientCount * avgJobCost + 50;
  const monthlyProfit = monthlyRevenue - monthlyCost;
  const annualProfit = monthlyProfit * 12;

  return (
    <SaasLayout title="Programa Partners" subtitle="Revende servicios con tu marca — Datos reales desde PostgreSQL">

      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-500/[0.08] via-violet-500/[0.05] to-emerald-500/[0.08] border border-amber-500/10 p-6 md:p-8 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-xl shadow-amber-500/20 shrink-0">
            <Handshake className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Programa de Partners & Resellers</h1>
            <p className="text-sm text-slate-400 leading-relaxed max-w-2xl mb-4">
              Revende todos los servicios de NELVYON SaaS con tu propia marca. Dashboard con datos reales de partners.
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                { label: "White-Label 100%", icon: Shield, color: "text-emerald-400" },
                { label: "Márgenes 70-90%", icon: TrendingUp, color: "text-amber-400" },
                { label: "Contrato Flexible", icon: FileText, color: "text-blue-400" },
                { label: "Tú Fijas Precios", icon: DollarSign, color: "text-violet-400" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5 bg-[#0A0F1C] rounded-lg px-3 py-1.5 border border-amber-500/[0.08]">
                  <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                  <span className="text-[11px] text-slate-300 font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
        {([
          { key: "dashboard" as const, label: "Dashboard Partners", icon: BarChart3 },
          { key: "plans" as const, label: "Planes Partner", icon: Handshake },
          { key: "services" as const, label: "Servicios Revendibles", icon: Layers },
          { key: "calculator" as const, label: "Calculadora", icon: DollarSign },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border",
              activeTab === tab.key
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : "text-slate-500 hover:text-slate-300 border-transparent hover:border-slate-800"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── TAB: Dashboard (REAL DATA) ─── */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-medium">Conectado a PostgreSQL — partner_records</span>
            </div>
            <Button size="sm" variant="outline" onClick={loadPartnerData} className="border-white/10 text-zinc-400 h-8 gap-1">
              <RefreshCw className="w-3 h-3" /> Actualizar
            </Button>
          </div>

          {loadingData ? (
            <div className="flex items-center justify-center py-16 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: "Partners Totales", value: totalPartners, icon: Users, color: "text-blue-400", bg: "from-blue-500/10 to-cyan-500/10" },
                  { label: "Activos", value: activePartners, icon: CheckCircle2, color: "text-emerald-400", bg: "from-emerald-500/10 to-green-500/10" },
                  { label: "Referidos", value: totalReferrals, icon: Share2, color: "text-violet-400", bg: "from-violet-500/10 to-purple-500/10" },
                  { label: "Revenue Generado", value: `€${totalRevenueGenerated.toLocaleString()}`, icon: DollarSign, color: "text-amber-400", bg: "from-amber-500/10 to-yellow-500/10" },
                  { label: "Comisiones", value: `€${totalCommissions.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-400", bg: "from-emerald-500/10 to-teal-500/10" },
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

              {/* Partner Records Table */}
              {partnerRecords.length > 0 ? (
                <div className="rounded-xl bg-[#0A0E13] border border-white/[0.04] overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Registros de Partners</span>
                    <span className="text-[10px] text-zinc-600">{partnerRecords.length} registros</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/[0.04]">
                          <th className="text-left text-[10px] font-medium text-zinc-500 px-4 py-2">Partner</th>
                          <th className="text-left text-[10px] font-medium text-zinc-500 px-4 py-2">Tier</th>
                          <th className="text-left text-[10px] font-medium text-zinc-500 px-4 py-2">Estado</th>
                          <th className="text-right text-[10px] font-medium text-zinc-500 px-4 py-2">Referidos</th>
                          <th className="text-right text-[10px] font-medium text-zinc-500 px-4 py-2">Revenue</th>
                          <th className="text-right text-[10px] font-medium text-zinc-500 px-4 py-2">Comisión</th>
                        </tr>
                      </thead>
                      <tbody>
                        {partnerRecords.map(p => (
                          <tr key={p.id} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-xs font-semibold text-white">{p.partner_name}</p>
                                <p className="text-[10px] text-zinc-600">{p.email || p.company || "—"}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn("text-[9px] px-2 py-0.5 rounded font-bold", tierColor[p.tier || "reseller"] || "text-zinc-400 bg-zinc-500/10")}>
                                {(p.tier || "reseller").toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn("text-[9px] px-2 py-0.5 rounded font-bold",
                                p.status === "active" ? "text-emerald-400 bg-emerald-500/10" :
                                p.status === "pending" ? "text-amber-400 bg-amber-500/10" :
                                "text-zinc-400 bg-zinc-500/10"
                              )}>
                                {(p.status || "pending").toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-xs text-white">{p.referrals_count || 0}</td>
                            <td className="px-4 py-3 text-right text-xs text-emerald-400 font-bold">€{(p.revenue_generated || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-xs text-amber-400 font-bold">€{(p.commission_earned || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
                  <Handshake className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500 mb-1">No hay partners registrados aún</p>
                  <p className="text-xs text-zinc-600 mb-4">Los datos aparecerán aquí cuando se registren partners en la base de datos.</p>
                  <Button size="sm" onClick={() => setActiveTab("plans")} className="bg-amber-600 text-white hover:bg-amber-500">
                    Ver Planes Partner <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── TAB: Plans ─── */}
      {activeTab === "plans" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {partnerPlans.map((plan) => {
            const PlanIcon = plan.icon;
            const isExpanded = expandedPlan === plan.tier;
            return (
              <div
                key={plan.tier}
                className={cn(
                  "relative rounded-2xl border transition-all duration-300 overflow-hidden",
                  plan.popular
                    ? "bg-gradient-to-b from-violet-500/[0.08] to-transparent border-violet-500/20 shadow-lg shadow-violet-500/10"
                    : `bg-[#0F1419] ${plan.border}`
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-xs font-bold text-white flex items-center gap-1 z-10">
                    <Star className="w-3 h-3" /> Más Popular
                  </div>
                )}

                <div className="p-7">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${plan.gradient} mb-5`}>
                    <PlanIcon className="w-6 h-6 text-white" />
                  </div>

                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 mb-5">{plan.subtitle}</p>

                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-bold text-white">{plan.monthlyFee}</span>
                    <span className="text-sm text-slate-500">/mes</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-5">
                    <div className="p-2.5 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/10">
                      <p className="text-[9px] text-slate-600">Cobra a clientes</p>
                      <p className="text-sm font-bold text-emerald-400">{plan.clientPrice}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-amber-500/[0.06] border border-amber-500/10">
                      <p className="text-[9px] text-slate-600">Tu margen</p>
                      <p className="text-sm font-bold text-amber-400">{plan.margin}</p>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleApplyPartner(plan.tier)}
                    disabled={partnerApplicationSent}
                    className={cn(
                      "w-full h-11 rounded-xl font-semibold mb-5 transition-all",
                      plan.popular
                        ? "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-500/20"
                        : "bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08]"
                    )}
                  >
                    {partnerApplicationSent ? <><CheckCircle2 className="w-4 h-4 mr-1" /> Enviada</> : <>Solicitar <ArrowRight className="w-4 h-4 ml-2" /></>}
                  </Button>

                  <div className="space-y-2">
                    {plan.features.slice(0, isExpanded ? undefined : 8).map((f) => (
                      <div key={f} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="text-[11px] text-slate-400">{f}</span>
                      </div>
                    ))}
                  </div>

                  {plan.features.length > 8 && (
                    <button
                      onClick={() => setExpandedPlan(isExpanded ? null : plan.tier)}
                      className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 mt-2 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {isExpanded ? "Ver menos" : `+${plan.features.length - 8} más`}
                    </button>
                  )}

                  <div className="mt-5 pt-4 border-t border-white/[0.04]">
                    <div className="flex items-center gap-1.5 mb-2">
                      <FileText className="w-3 h-3 text-amber-400" />
                      <span className="text-[10px] font-bold text-white">Términos</span>
                    </div>
                    <div className="space-y-1.5">
                      {plan.contractTerms.map((term) => (
                        <div key={term} className="flex items-start gap-1.5">
                          <Shield className="w-3 h-3 text-slate-600 shrink-0 mt-0.5" />
                          <span className="text-[10px] text-slate-500">{term}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── TAB: Services ─── */}
      {activeTab === "services" && (
        <>
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white mb-2">Servicios que puedes revender</h2>
            <p className="text-xs text-slate-500">Todos los servicios incluyen white-label. Tú fijas el precio final.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            {visibleServices.map((svc) => (
              <div key={svc.name} className="group rounded-xl bg-[#0F1419] border border-white/[0.06] hover:border-emerald-500/20 p-5 transition-all">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center group-hover:bg-emerald-500/10 transition-colors">
                    <svc.icon className={cn("w-5 h-5", svc.color)} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-white">{svc.name}</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">{svc.description}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.04] text-center">
                    <p className="text-[8px] text-slate-600">Cobra al cliente</p>
                    <p className="text-xs font-bold text-white">{svc.clientPrice}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.04] text-center">
                    <p className="text-[8px] text-slate-600">Tu coste</p>
                    <p className="text-xs font-bold text-emerald-400">{svc.yourCost}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/10 text-center">
                    <p className="text-[8px] text-slate-600">Margen</p>
                    <p className="text-xs font-bold text-amber-400">{svc.margin}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!showAllServices && deliverableServices.length > 6 && (
            <div className="text-center mb-8">
              <Button variant="outline" onClick={() => setShowAllServices(true)} className="border-white/10 text-slate-400">
                Ver los {deliverableServices.length - 6} servicios restantes <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* ─── TAB: Calculator ─── */}
      {activeTab === "calculator" && (
        <div className="max-w-2xl mx-auto">
          <div className="rounded-2xl bg-[#0F1419] border border-amber-500/10 p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <DollarSign className="w-6 h-6 text-amber-400" />
              <h2 className="text-lg font-bold text-white">Calculadora de Beneficios</h2>
            </div>

            <div className="space-y-6 mb-8">
              <div>
                <label className="text-xs text-slate-400 mb-2 block">Número de clientes: <span className="text-white font-bold">{clientCount}</span></label>
                <input type="range" min={1} max={100} value={clientCount} onChange={(e) => setClientCount(Number(e.target.value))}
                  className="w-full h-2 bg-white/[0.06] rounded-full appearance-none cursor-pointer accent-amber-500" />
                <div className="flex justify-between text-[9px] text-slate-600 mt-1">
                  <span>1</span><span>25</span><span>50</span><span>75</span><span>100</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-2 block">Precio medio por cliente: <span className="text-white font-bold">€{avgPrice}/mes</span></label>
                <input type="range" min={97} max={1497} step={50} value={avgPrice} onChange={(e) => setAvgPrice(Number(e.target.value))}
                  className="w-full h-2 bg-white/[0.06] rounded-full appearance-none cursor-pointer accent-violet-500" />
                <div className="flex justify-between text-[9px] text-slate-600 mt-1">
                  <span>€97</span><span>€497</span><span>€997</span><span>€1.497</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-5 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/10 text-center">
                <p className="text-[10px] text-slate-500 mb-1">Revenue Mensual</p>
                <p className="text-2xl font-bold text-emerald-400">€{monthlyRevenue.toLocaleString()}</p>
              </div>
              <div className="p-5 rounded-xl bg-red-500/[0.04] border border-red-500/10 text-center">
                <p className="text-[10px] text-slate-500 mb-1">Coste Mensual</p>
                <p className="text-2xl font-bold text-red-400">€{monthlyCost.toLocaleString()}</p>
              </div>
              <div className="p-5 rounded-xl bg-amber-500/[0.06] border border-amber-500/10 text-center">
                <p className="text-[10px] text-slate-500 mb-1">Beneficio Mensual</p>
                <p className="text-2xl font-bold text-amber-400">€{monthlyProfit.toLocaleString()}</p>
              </div>
              <div className="p-5 rounded-xl bg-violet-500/[0.06] border border-violet-500/10 text-center">
                <p className="text-[10px] text-slate-500 mb-1">Beneficio Anual</p>
                <p className="text-2xl font-bold text-violet-400">€{annualProfit.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Guarantees */}
      <div className="mt-10 rounded-xl bg-gradient-to-r from-violet-500/[0.04] via-blue-500/[0.03] to-emerald-500/[0.04] border border-white/[0.04] p-4">
        <div className="flex flex-wrap items-center justify-center gap-4 text-[9px] text-zinc-600">
          <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Contrato Legal</span>
          <span className="flex items-center gap-1"><Award className="w-3 h-3" /> GDPR Compliant</span>
          <span className="flex items-center gap-1"><Rocket className="w-3 h-3" /> 99.99% Uptime</span>
          <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> White-Label 100%</span>
          <span className="flex items-center gap-1"><Crown className="w-3 h-3 text-amber-400" /> PARTNER PROGRAM</span>
        </div>
      </div>
    </SaasLayout>
  );
}