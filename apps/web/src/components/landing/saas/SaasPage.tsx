"use client";

import Link from "next/link";
import {
  BarChart3,
  Bot,
  Check,
  FileText,
  Globe,
  Mail,
  MessageSquare,
  MousePointerClick,
  Plug,
  Share2,
  Sparkles,
  Target,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";

import { NeuralNetwork } from "@/components/ui/NeuralNetwork";
import { SAAS_FAQ } from "../agencyContent";
import { SaasPlatformComparisonTable } from "../SaasPlatformComparisonTable";
import { FaqSection } from "../FaqSection";
import { FadeIn } from "../FadeIn";
import { HeroVideo } from "../HeroVideo";
import { LandingFooter } from "../LandingFooter";
import { MarketingNavbar } from "../MarketingNavbar";
import { ServicesMindMap } from "../ServicesMindMap";
import { BRAND } from "../shared";
import { GhostButton, PrimaryButton } from "../ui";

const PLANS = [
  {
    name: "Starter",
    price: "€97",
    features: ["CRM", "Email", "Social scheduler", "1 workspace", "Soporte email"],
    highlight: false,
  },
  {
    name: "Growth",
    price: "€297",
    features: [
      "Todo Starter",
      "SMS",
      "WhatsApp",
      "Funnel builder",
      "Chatbot IA",
      "3 workspaces",
    ],
    highlight: true,
  },
  {
    name: "Elite",
    price: "€797",
    features: [
      "Todo Growth",
      "White label",
      "Workspaces ilimitados",
      "Gestor dedicado",
      "IA avanzada",
    ],
    highlight: false,
  },
] as const;

const FEATURES = [
  { icon: Mail, title: "Email Marketing automatizado", desc: "Secuencias, plantillas y envíos programados desde un panel." },
  { icon: Target, title: "Publicidad en Meta, Google, TikTok", desc: "Campañas centralizadas con seguimiento unificado." },
  { icon: Share2, title: "CRM y gestión de contactos", desc: "Pipeline, etiquetas y historial de cada cliente." },
  { icon: Bot, title: "Chatbot IA 24/7", desc: "Responde consultas frecuentes mientras tu equipo descansa." },
  { icon: Globe, title: "SEO y posicionamiento web", desc: "Auditorías, contenido y seguimiento de rankings." },
  { icon: Sparkles, title: "Creación de webs profesionales", desc: "Landings y sitios listos para convertir visitantes." },
  { icon: MessageSquare, title: "Gestión de redes sociales", desc: "Calendario, publicación y métricas en un solo lugar." },
  { icon: BarChart3, title: "Informes y analytics en tiempo real", desc: "Dashboards actualizados con los datos de tu negocio." },
  { icon: Workflow, title: "Automatizaciones sin código", desc: "Flujos visuales que conectan canales y acciones." },
  { icon: FileText, title: "Presupuestos y facturas automáticas", desc: "Documentos profesionales generados al instante." },
  { icon: Zap, title: "SMS y WhatsApp marketing", desc: "Mensajes masivos y conversaciones desde el CRM." },
  { icon: Sparkles, title: "Generación de contenido con IA", desc: "Copy, ideas y borradores para campañas y redes." },
] as const;

const STEPS = [
  { icon: MousePointerClick, title: "Elige tu plan", desc: "Starter, Growth o Elite según el tamaño de tu negocio." },
  { icon: Plug, title: "Conectamos tu negocio", desc: "Integramos canales, datos y herramientas en menos de 24 horas." },
  { icon: Bot, title: "Nelvyon trabaja solo", desc: "Automatizaciones, campañas e informes funcionan en segundo plano." },
] as const;

function SaasFeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
}) {
  return (
    <div className="group h-full rounded-2xl border border-white/10 bg-[#111827] p-6 transition hover:border-[#0066FF]/60 hover:shadow-[0_12px_32px_rgba(0,102,255,0.15)]">
      <Icon className="h-10 w-10 text-[#00CFFF]" />
      <h3 className="mt-4 text-lg font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/65">{desc}</p>
    </div>
  );
}

export function SaasPage() {
  return (
    <div
      className="min-h-screen overflow-x-hidden text-white"
      style={{
        backgroundColor: BRAND.bg,
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      <MarketingNavbar active="/saas" />
      <main style={{ backgroundColor: BRAND.bg }}>
        {/* A — Hero */}
        <section
          className="relative -mt-20 overflow-hidden pt-28 pb-16 md:pt-32 md:pb-24"
          style={{
            background: `radial-gradient(ellipse 80% 70% at 50% 45%, #020818 0%, ${BRAND.bg} 72%)`,
          }}
        >
          <NeuralNetwork />
          <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-4 md:grid-cols-2 md:px-6">
            <FadeIn>
              <span
                className="inline-flex rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wider"
                style={{ borderColor: BRAND.cardBorder, color: BRAND.cyan }}
              >
                SaaS — Plataforma todo en uno
              </span>
              <h1 className="nelvyon-title-glow mt-6 text-4xl font-extrabold tracking-tight text-white md:text-5xl lg:text-[3.25rem]">
                La plataforma que gestiona todo tu marketing. Sola.
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-white/70">
                Un panel. 25 herramientas. Cero gestión manual.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <PrimaryButton className="nelvyon-glow-btn hover:scale-[1.03]" href="#planes">
                  Ver planes
                </PrimaryButton>
                <GhostButton className="hover:scale-[1.03]" href="/contacto">
                  Solicitar demo
                </GhostButton>
              </div>
            </FadeIn>
            <FadeIn delay={0.12}>
              <HeroVideo />
            </FadeIn>
          </div>
        </section>

        {/* B — Tabla SaaS vs competencia */}
        <SaasPlatformComparisonTable />

        {/* C — 12 features */}
        <section className="py-20 md:py-28" style={{ backgroundColor: BRAND.bgSection }}>
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <FadeIn>
              <h2 className="text-center text-3xl font-extrabold text-white md:text-4xl">Funcionalidades del panel</h2>
              <p className="mt-3 text-center text-white/60">Módulos listos para usar desde el primer día</p>
            </FadeIn>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <FadeIn delay={(i % 6) * 0.04} key={f.title}>
                  <SaasFeatureCard desc={f.desc} icon={f.icon} title={f.title} />
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* D — Mind map (dark wrapper) */}
        <ServicesMindMap />

        {/* E — Planes */}
        <section className="py-20 md:py-28" id="planes" style={{ backgroundColor: BRAND.bg }}>
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <FadeIn>
              <h2 className="text-center text-3xl font-extrabold text-white md:text-4xl">Planes y precios</h2>
              <p className="mt-3 text-center text-white/60">Escala cuando tu negocio crezca.</p>
            </FadeIn>
            <div className="mt-12 grid items-center gap-8 lg:grid-cols-3">
              {PLANS.map((plan, i) => (
                <FadeIn delay={i * 0.08} key={plan.name}>
                  <motion.div
                    className={`relative flex h-full flex-col rounded-2xl border p-8 ${
                      plan.highlight
                        ? "border-[#0066FF] shadow-[0_16px_48px_rgba(0,102,255,0.25)] lg:scale-105"
                        : "border-[#1e293b]"
                    }`}
                    style={{ backgroundColor: BRAND.bgSection }}
                    whileHover={{ y: -4 }}
                  >
                    {plan.highlight ? (
                      <span
                        className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold text-white"
                        style={{ backgroundColor: BRAND.blue }}
                      >
                        MÁS POPULAR
                      </span>
                    ) : null}
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    <p className="mt-4 tabular-nums">
                      <span className="text-[48px] font-extrabold leading-none text-white">{plan.price}</span>
                      <span className="text-[#94A3B8]">/mes</span>
                    </p>
                    <ul className="mt-8 flex-1 space-y-3">
                      {plan.features.map((f) => (
                        <li className="flex gap-2 text-sm text-white/75" key={f}>
                          <Check className="h-5 w-5 shrink-0 text-[#00CFFF]" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link
                      className="nelvyon-cta-btn nelvyon-btn-shimmer mt-8 block rounded-xl py-3 text-center text-sm font-semibold text-white transition hover:scale-[1.02]"
                      href="/register"
                    >
                      Empezar
                    </Link>
                  </motion.div>
                </FadeIn>
              ))}
            </div>
            <p className="mt-8 text-center text-sm text-white/50">Sin permanencia. Cancela cuando quieras.</p>
          </div>
        </section>

        {/* F — Video */}
        <section
          className="py-20 md:py-28"
          style={{
            background: `linear-gradient(180deg, ${BRAND.heroGradEnd} 0%, ${BRAND.bg} 100%)`,
          }}
        >
          <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
            <FadeIn>
              <h2 className="text-3xl font-extrabold text-white md:text-4xl">Mira cómo funciona en 2 minutos</h2>
              <p className="mt-4 text-white/70">Un recorrido por el panel y las automatizaciones principales.</p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="mx-auto mt-10 max-w-2xl">
                <HeroVideo />
              </div>
            </FadeIn>
          </div>
        </section>

        {/* G — Pasos */}
        <section className="py-20 md:py-28" style={{ backgroundColor: BRAND.bgSection }}>
          <div className="mx-auto max-w-5xl px-4 md:px-6">
            <FadeIn>
              <h2 className="text-center text-3xl font-extrabold text-white md:text-4xl">Cómo funciona</h2>
              <p className="mt-3 text-center text-white/60">Sin instalaciones. Sin equipo. Sin complicaciones.</p>
            </FadeIn>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <FadeIn delay={i * 0.1} key={step.title}>
                  <div className="h-full rounded-2xl border border-white/10 bg-[#111827] p-8 text-center">
                    <p className="text-5xl font-extrabold tabular-nums text-[#00CFFF]">{i + 1}</p>
                    <step.icon className="mx-auto mt-4 h-8 w-8 text-[#0066FF]" />
                    <h3 className="mt-4 text-lg font-bold text-white">{step.title}</h3>
                    <p className="mt-2 text-sm text-white/65">{step.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* H — FAQ */}
        <FaqSection background="#111827" dark items={SAAS_FAQ} />

        {/* I — CTA */}
        <section
          className="py-20 md:py-28"
          style={{
            background: `linear-gradient(135deg, ${BRAND.heroGradEnd} 0%, ${BRAND.blue}55 50%, ${BRAND.bg} 100%)`,
          }}
        >
          <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
            <FadeIn>
              <h2 className="nelvyon-title-glow text-3xl font-extrabold text-white md:text-4xl lg:text-5xl">
                Empieza hoy. Tu competencia no espera.
              </h2>
              <div className="mt-10">
                <PrimaryButton className="nelvyon-glow-btn px-10 py-4 text-base hover:scale-[1.03]" href="/register">
                  Solicitar acceso →
                </PrimaryButton>
              </div>
              <p className="mt-4 text-sm text-blue-100/80">Sin tarjeta de crédito. Sin compromiso.</p>
            </FadeIn>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
