import React, { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SaasLayout from "@/components/SaasLayout";
import { Button } from "@/components/ui/button";
import { client } from "@/lib/api";
import { Input } from "@/components/ui/input";
import {
  Check, Crown, Zap, Rocket, Handshake, Loader2,
  TrendingDown, Sparkles, Shield, ArrowRight, Tag,
  X, Star, ChevronDown, ChevronUp, Globe, Users,
  BarChart3, Bot, Phone, Mail, Layers, MessageSquare,
  Lock, Award, Heart, Clock, CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  PLANS, BILLING_OPTIONS, CORE_PLAN_IDS,
  type PlanId, type BillingCycle,
  calculatePrice, applyPromo,
} from "@/lib/plans";
import { redirectToCheckout, getActiveSubscription, type ActiveSubscription } from "@/lib/payment-service";

const PLAN_ICONS: Record<PlanId, React.ElementType> = {
  starter: Zap,
  pro: Rocket,
  enterprise: Crown,
  partner: Handshake,
};

const PLAN_ORDER: PlanId[] = [...CORE_PLAN_IDS];

/* ─── Feature Comparison Matrix ─── */
const COMPARISON_FEATURES = [
  { category: "CRM & Contactos", features: [
    { name: "Contactos", starter: "2,500", pro: "25,000", enterprise: "∞" },
    { name: "Usuarios por workspace", starter: "3", pro: "20", enterprise: "∞" },
    { name: "Pipelines", starter: false, pro: true, enterprise: true },
    { name: "Deals & Oportunidades", starter: false, pro: true, enterprise: true },
  ]},
  { category: "Marketing & Ventas", features: [
    { name: "Email Marketing", starter: true, pro: true, enterprise: true },
    { name: "Campañas activas", starter: "10", pro: "200", enterprise: "∞" },
    { name: "Funnels & Landing Pages", starter: false, pro: true, enterprise: true },
    { name: "Social Media Manager", starter: false, pro: true, enterprise: true },
    { name: "Video Ads Studio", starter: false, pro: false, enterprise: true },
  ]},
  { category: "Comunicación", features: [
    { name: "Chat & Conversaciones", starter: true, pro: true, enterprise: true },
    { name: "VoIP & Llamadas", starter: false, pro: true, enterprise: true },
    { name: "Helpdesk", starter: true, pro: true, enterprise: true },
    { name: "Bots & Chatbots IA", starter: false, pro: true, enterprise: true },
  ]},
  { category: "Automatización & IA", features: [
    { name: "Workflows activos", starter: "10", pro: "100", enterprise: "∞" },
    { name: "Piloto Automático (IA)", starter: false, pro: false, enterprise: true },
    { name: "Agentes IA Marketplace", starter: false, pro: false, enterprise: true },
    { name: "Ciberseguridad SENTINEL", starter: false, pro: false, enterprise: true },
  ]},
  { category: "White-Label & Partners", features: [
    { name: "White-Label completo", starter: false, pro: false, enterprise: true },
    { name: "Tu marca & dominio", starter: false, pro: false, enterprise: true },
    { name: "Programa Partners", starter: false, pro: false, enterprise: true },
    { name: "Reventa con márgenes 70-90%", starter: false, pro: false, enterprise: true },
  ]},
  { category: "Soporte", features: [
    { name: "Soporte Email", starter: true, pro: true, enterprise: true },
    { name: "Soporte Prioritario", starter: false, pro: true, enterprise: true },
    { name: "Soporte 24/7 Dedicado", starter: false, pro: false, enterprise: true },
    { name: "Account Manager", starter: false, pro: false, enterprise: true },
    { name: "SLA Garantizado", starter: false, pro: false, enterprise: true },
  ]},
];

/* ─── FAQ ─── */
const FAQ_ITEMS = [
  {
    q: "¿Puedo cambiar de plan en cualquier momento?",
    a: "Sí, puedes upgradar o downgradar tu plan en cualquier momento. Si upgradas, solo pagas la diferencia proporcional. Si downgradas, el cambio se aplica al siguiente ciclo de facturación.",
  },
  {
    q: "¿Qué métodos de pago aceptáis?",
    a: "Aceptamos todas las tarjetas de crédito/débito (Visa, Mastercard, Amex), SEPA Direct Debit, y transferencia bancaria para planes Enterprise. Todos los pagos se procesan de forma segura a través de Stripe.",
  },
  {
    q: "¿Hay compromiso de permanencia?",
    a: "No hay permanencia obligatoria. Puedes cancelar cuando quieras. Los planes anuales y bienales ofrecen descuentos significativos, pero si cancelas, mantienes el acceso hasta el final del periodo pagado.",
  },
  {
    q: "¿Qué incluye el White-Label del plan Enterprise?",
    a: "Incluye personalización completa: tu logo, colores, dominio personalizado (app.tumarca.com), emails con tu marca, y la posibilidad de revender la plataforma a tus clientes con márgenes del 70-90%.",
  },
  {
    q: "¿Cómo funciona el Programa Partners?",
    a: "Por €50/mes accedes al programa. Recibes trabajos de tus clientes, los procesas a través de NELVYON, y entregas el resultado. Cobras a tu cliente lo que quieras. Los trabajos cuestan entre €120-€800 según el tipo.",
  },
  {
    q: "¿Ofrecéis garantía de devolución?",
    a: "Sí, ofrecemos 14 días de garantía de devolución completa en todos los planes. Si no estás satisfecho, te devolvemos el 100% sin preguntas.",
  },
  {
    q: "¿Es más barato que GoHighLevel?",
    a: "Sí. Nuestro Starter (€79) vs GHL Starter ($97), Pro (€249) vs GHL Unlimited ($297), Enterprise (€449) vs GHL SaaS Pro ($497). Además, incluimos White-Label en Enterprise sin coste extra.",
  },
];

/* ─── Testimonials ─── */
const TESTIMONIALS = [
  { name: "Carlos M.", role: "CEO, AgenciaDigital360", text: "Migramos de GoHighLevel a NELVYON y ahorramos un 30% mensual. La plataforma es más potente y el soporte es increíble.", plan: "Enterprise", avatar: "CM" },
  { name: "Laura S.", role: "Directora Marketing, TechStartup", text: "El plan Pro tiene todo lo que necesitamos. Los workflows y chatbots IA han triplicado nuestras conversiones.", plan: "Pro", avatar: "LS" },
  { name: "Miguel A.", role: "Partner Freelance", text: "Como Partner, cobro a mis clientes 3x lo que me cuesta el trabajo. NELVYON hace todo el trabajo pesado.", plan: "Partner", avatar: "MA" },
];

export default function SaasPricing() {
  const { ts } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>("annual");
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [animated, setAnimated] = useState(false);
  const [activeSub, setActiveSub] = useState<ActiveSubscription | null>(null);

  const loadPricingData = useCallback(async () => {
    try {
      const res = await client.entities.subscriptions.query({ sort: "-created_at", limit: 5 });
      const items = (res.data?.items as Array<Record<string, unknown>>) || [];
      if (items.length > 0 && items[0].plan_id) {
        setActiveSub({
          planId: String(items[0].plan_id) as any,
          cycle: (String(items[0].billing_cycle) || "annual") as BillingCycle,
          startDate: String(items[0].created_at || new Date().toISOString()),
        });
      }
    } catch (err) { if (import.meta.env.DEV) console.warn("[SaasPricing] Error:", err); /* fallback */ }
  }, []);

  useEffect(() => {
    if (user) loadPricingData();
  }, [user, loadPricingData]);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (user) {
      getActiveSubscription().then(setActiveSub).catch(() => {});
    }
  }, [user]);

  const handleApplyPromo = () => {
    if (!promoCode.trim()) return;
    setPromoApplied(true);
    toast.success(`Código "${promoCode}" aplicado correctamente`);
  };

  const handleSubscribe = async (planId: PlanId) => {
    if (!user) {
      toast.error("Inicia sesión para suscribirte");
      navigate("/");
      return;
    }

    if (activeSub?.has_subscription && activeSub.plan_id === planId) {
      toast.info("Ya tienes este plan activo");
      return;
    }

    setLoadingPlan(planId);
    try {
      await redirectToCheckout(planId, selectedCycle, promoCode || undefined);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al crear sesión de pago";
      toast.error(msg);
    } finally {
      setLoadingPlan(null);
    }
  };

  const renderFeatureValue = (val: boolean | string) => {
    if (typeof val === "string") return <span className="text-xs font-bold text-white">{val}</span>;
    if (val) return <Check className="w-4 h-4 text-emerald-400 mx-auto" />;
    return <X className="w-4 h-4 text-zinc-700 mx-auto" />;
  };

  return (
    <SaasLayout title="Planes & Precios" subtitle="Elige el plan perfecto para tu negocio — Siempre más barato que GoHighLevel">
      {/* Active Subscription Banner */}
      {activeSub?.has_subscription && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/[0.08] to-violet-500/[0.08] border border-emerald-500/20">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Plan {activeSub.plan_id?.charAt(0).toUpperCase()}{activeSub.plan_id?.slice(1)} Activo</p>
                <p className="text-[10px] text-zinc-400">
                  {activeSub.billing_cycle} · Desde {activeSub.started_at ? new Date(activeSub.started_at).toLocaleDateString("es") : "—"}
                  {(activeSub.current_period_end || activeSub.expires_at) &&
                    ` · Próxima renovación ${new Date((activeSub.current_period_end || activeSub.expires_at) as string).toLocaleDateString("es")}`}
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
              ✓ ACTIVO
            </span>
          </div>
        </div>
      )}

      {/* Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { icon: Users, label: "Clientes activos", value: "2,400+", color: "text-blue-400", bg: "from-blue-500/10 to-cyan-500/10" },
          { icon: Globe, label: "Países", value: "45+", color: "text-violet-400", bg: "from-violet-500/10 to-purple-500/10" },
          { icon: TrendingDown, label: "Más barato que GHL", value: "10-39%", color: "text-emerald-400", bg: "from-emerald-500/10 to-green-500/10" },
          { icon: Award, label: "Uptime garantizado", value: "99.99%", color: "text-amber-400", bg: "from-amber-500/10 to-yellow-500/10" },
        ].map((stat, i) => (
          <div key={stat.label} className={cn(
            "p-4 rounded-xl bg-[#0A0E13] border border-white/[0.04] text-center transition-all duration-500",
            animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )} style={{ transitionDelay: `${i * 80}ms` }}>
            <stat.icon className={cn("w-5 h-5 mx-auto mb-2", stat.color)} />
            <p className="text-lg font-black text-white">{stat.value}</p>
            <p className="text-[10px] text-zinc-600">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Billing Cycle Selector */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex gap-1 p-1.5 rounded-2xl bg-[#0A0E13] border border-white/[0.06] shadow-xl shadow-black/20">
          {BILLING_OPTIONS.map(opt => {
            const isSelected = selectedCycle === opt.cycle;
            return (
              <button
                key={opt.cycle}
                onClick={() => setSelectedCycle(opt.cycle)}
                className={cn(
                  "relative px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300",
                  isSelected
                    ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25 scale-[1.02]"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
                )}
              >
                {opt.label}
                {opt.badge && (
                  <span className={cn(
                    "absolute -top-2.5 -right-1 px-1.5 py-0.5 rounded-full text-[7px] font-black shadow-lg",
                    opt.cycle === "annual" ? "bg-emerald-500 text-white shadow-emerald-500/30" :
                    opt.cycle === "biennial" ? "bg-amber-500 text-black shadow-amber-500/30" :
                    "bg-violet-500 text-white shadow-violet-500/30"
                  )}>
                    {opt.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Savings Highlight */}
      {selectedCycle !== "monthly" && (
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/[0.08] border border-emerald-500/15">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-emerald-300 font-medium">
              Ahorra hasta un {BILLING_OPTIONS.find(o => o.cycle === selectedCycle)?.discountPercent}% con facturación {BILLING_OPTIONS.find(o => o.cycle === selectedCycle)?.label.toLowerCase()}
            </span>
          </div>
        </div>
      )}

      {/* Promo Code */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center gap-2 max-w-md w-full">
          <Tag className="w-4 h-4 text-amber-400 shrink-0" />
          <Input
            value={promoCode}
            onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoApplied(false); }}
            placeholder="Código promocional"
            className="bg-[#0A0E13] border-white/[0.06] text-white text-sm font-mono h-9"
          />
          <Button
            onClick={handleApplyPromo}
            disabled={!promoCode.trim()}
            size="sm"
            className="h-9 px-4 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/20 text-xs font-bold"
          >
            Aplicar
          </Button>
          {promoApplied && (
            <span className="text-[10px] text-emerald-400 whitespace-nowrap flex items-center gap-1">
              <Check className="w-3 h-3" />Aplicado
            </span>
          )}
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {PLAN_ORDER.map((planId, idx) => {
          const plan = PLANS[planId];
          const Icon = PLAN_ICONS[planId];
          const pricing = promoApplied && promoCode
            ? applyPromo(plan.price, selectedCycle, promoCode)
            : { finalMonthlyPrice: calculatePrice(plan.price, selectedCycle).monthlyPrice, finalTotalPrice: calculatePrice(plan.price, selectedCycle).totalPrice, totalSavings: calculatePrice(plan.price, selectedCycle).savings, promoApplied: null };
          const isPopular = planId === "pro";
          const isEnterprise = planId === "enterprise";
          const isLoading = loadingPlan === planId;
          const isCurrentPlan = activeSub?.has_subscription && activeSub.plan_id === planId;

          return (
            <div
              key={planId}
              className={cn(
                "relative rounded-2xl border overflow-hidden transition-all duration-500 group",
                "hover:scale-[1.02] hover:shadow-2xl",
                isPopular ? "bg-gradient-to-b from-violet-500/[0.1] to-[#0A0E13] border-violet-500/25 shadow-lg shadow-violet-500/10 ring-1 ring-violet-500/10" :
                isEnterprise ? "bg-gradient-to-b from-amber-500/[0.08] to-[#0A0E13] border-amber-500/20 shadow-lg shadow-amber-500/5" :
                "bg-[#0A0E13] border-white/[0.06]",
                animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              )}
              style={{ transitionDelay: `${idx * 100 + 200}ms` }}
            >
              {/* Top accent bar */}
              {isPopular && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
              )}
              {isEnterprise && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
              )}

              {/* Popular ribbon */}
              {isPopular && (
                <div className="absolute top-4 right-4">
                  <span className="px-2.5 py-1 rounded-full bg-violet-500/20 text-[9px] font-black text-violet-300 border border-violet-500/30 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-violet-400 text-violet-400" /> MÁS POPULAR
                  </span>
                </div>
              )}
              {isEnterprise && (
                <div className="absolute top-4 right-4">
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-[9px] font-black text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-400" /> WHITE-LABEL
                  </span>
                </div>
              )}

              <div className="p-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                  <div className={cn(
                    "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
                    plan.gradient
                  )}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{plan.name}</h3>
                    <p className="text-[10px] text-zinc-500">
                      {planId === "starter" && "Para empezar"}
                      {planId === "pro" && "Para crecer"}
                      {planId === "enterprise" && "Para dominar"}
                      {planId === "partner" && "Para revender"}
                    </p>
                  </div>
                </div>

                {/* Pricing */}
                <div className="mb-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white tracking-tight">€{pricing.finalMonthlyPrice}</span>
                    <span className="text-zinc-500 text-sm">/mes</span>
                  </div>
                  {pricing.totalSavings > 0 && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[11px] text-zinc-600 line-through">€{plan.price}/mes</span>
                      <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-0.5 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                        <TrendingDown className="w-3 h-3" />
                        Ahorras €{pricing.totalSavings.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {pricing.promoApplied && (
                    <div className="mt-1.5 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span className="text-[10px] text-amber-400 font-bold">
                        +{pricing.promoApplied.extraDiscount}% extra con {pricing.promoApplied.code}
                      </span>
                    </div>
                  )}
                  <p className="text-[10px] text-zinc-600 mt-1.5">
                    Total: €{pricing.finalTotalPrice.toLocaleString()} / {BILLING_OPTIONS.find(o => o.cycle === selectedCycle)?.labelShort}
                  </p>
                </div>

                {/* GHL Comparison */}
                {plan.ghlComparison && (
                  <div className="mb-4 p-2.5 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15">
                    <p className="text-[10px] text-emerald-400 flex items-center gap-1.5">
                      <TrendingDown className="w-3 h-3 shrink-0" />
                      {plan.ghlComparison}
                    </p>
                  </div>
                )}

                {/* Features */}
                <div className="space-y-2 mb-6">
                  {plan.features.map(feat => (
                    <div key={feat} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: plan.color }} />
                      <span className="text-[11px] text-zinc-400 leading-tight">{feat}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <Button
                  onClick={() => handleSubscribe(planId)}
                  disabled={isLoading || !!loadingPlan || isCurrentPlan}
                  className={cn(
                    "w-full h-12 font-bold rounded-xl transition-all text-white shadow-lg",
                    isCurrentPlan
                      ? "bg-emerald-600/50 cursor-default"
                      : isPopular ? "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-violet-500/25 hover:shadow-violet-500/40" :
                    isEnterprise ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-amber-500/20" :
                    planId === "partner" ? "bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 shadow-orange-500/20" :
                    "bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-400 hover:to-cyan-500 shadow-blue-500/20"
                  )}
                >
                  {isCurrentPlan ? (
                    <><Check className="w-4 h-4 mr-2" /> Plan Actual</>
                  ) : isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Conectando con Stripe...</>
                  ) : (
                    <><CreditCard className="w-4 h-4 mr-2" /> Contratar {plan.name} <ArrowRight className="w-4 h-4 ml-1" /></>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison Toggle */}
      <div className="mb-8">
        <button
          onClick={() => setShowComparison(!showComparison)}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#0A0E13] border border-white/[0.06] hover:border-white/[0.1] transition-all text-sm font-semibold text-zinc-400 hover:text-white"
        >
          <BarChart3 className="w-4 h-4" />
          {showComparison ? "Ocultar comparativa detallada" : "Ver comparativa detallada de funciones"}
          {showComparison ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showComparison && (
          <div className="mt-4 rounded-2xl bg-[#0A0E13] border border-white/[0.06] overflow-hidden animate-in slide-in-from-top-2 duration-300">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left p-4 text-xs font-bold text-zinc-400 w-1/3">Función</th>
                    {PLAN_ORDER.map(pid => (
                      <th key={pid} className="p-4 text-center">
                        <span className="text-xs font-bold" style={{ color: PLANS[pid].color }}>{PLANS[pid].icon} {PLANS[pid].name}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_FEATURES.map(cat => (
                    <React.Fragment key={cat.category}>
                      <tr className="bg-white/[0.02]">
                        <td colSpan={4} className="px-4 py-2 text-[10px] font-bold text-violet-400 uppercase tracking-wider">{cat.category}</td>
                      </tr>
                      {cat.features.map(feat => (
                        <tr key={feat.name} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3 text-xs text-zinc-400">{feat.name}</td>
                          <td className="px-4 py-3 text-center">{renderFeatureValue(feat.starter)}</td>
                          <td className="px-4 py-3 text-center">{renderFeatureValue(feat.pro)}</td>
                          <td className="px-4 py-3 text-center">{renderFeatureValue(feat.enterprise)}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Testimonials */}
      <div className="mb-10">
        <h3 className="text-center text-lg font-bold text-white mb-6 flex items-center justify-center gap-2">
          <Heart className="w-5 h-5 text-red-400" />
          Lo que dicen nuestros clientes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="p-5 rounded-2xl bg-[#0A0E13] border border-white/[0.06] hover:border-white/[0.1] transition-all">
              <div className="flex items-center gap-1 mb-3">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4 italic">"{t.text}"</p>
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

      {/* FAQ Section */}
      <div className="mb-10">
        <h3 className="text-center text-lg font-bold text-white mb-6 flex items-center justify-center gap-2">
          <MessageSquare className="w-5 h-5 text-violet-400" />
          Preguntas Frecuentes
        </h3>
        <div className="max-w-3xl mx-auto space-y-2">
          {FAQ_ITEMS.map((faq, i) => (
            <div key={i} className="rounded-xl bg-[#0A0E13] border border-white/[0.06] overflow-hidden transition-all">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <span className="text-sm font-medium text-white pr-4">{faq.q}</span>
                {openFaq === i ? <ChevronUp className="w-4 h-4 text-violet-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-600 shrink-0" />}
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 animate-in slide-in-from-top-1 duration-200">
                  <p className="text-xs text-zinc-400 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Security & Trust */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-500/[0.06] via-violet-500/[0.04] to-amber-500/[0.06] border border-emerald-500/10 p-8">
        <h3 className="text-center text-sm font-bold text-white mb-5 flex items-center justify-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          Tu inversión está protegida
        </h3>
        <div className="flex items-center justify-center gap-8 flex-wrap">
          {[
            { icon: Lock, text: "Pago seguro con Stripe", sub: "Cifrado SSL 256-bit" },
            { icon: Clock, text: "14 días de garantía", sub: "Devolución completa" },
            { icon: Clock, text: "Sin permanencia", sub: "Cancela cuando quieras" },
            { icon: TrendingDown, text: "Más barato que GHL", sub: "Hasta 39% menos" },
            { icon: Shield, text: "SOC2 + ISO 27001", sub: "Seguridad certificada" },
            { icon: Award, text: "GDPR Compliant", sub: "Protección de datos" },
          ].map(item => (
            <div key={item.text} className="flex flex-col items-center gap-1.5 text-center">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-[11px] text-white font-semibold">{item.text}</span>
              <span className="text-[9px] text-zinc-600">{item.sub}</span>
            </div>
          ))}
        </div>
      </div>
    </SaasLayout>
  );
}