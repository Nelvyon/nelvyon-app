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
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";

import { NeuralNetwork } from "@/components/ui/NeuralNetwork";
import { SAAS_FAQ } from "../agencyContent";
import { ComparisonTable } from "../ComparisonTable";
import { SAAS_COMPARE_ROWS } from "../comparisonData";
import { FaqSection } from "../FaqSection";
import { FadeIn } from "../FadeIn";
import { HeroVideo } from "../HeroVideo";
import { LandingFooter } from "../LandingFooter";
import { MarketingNavbar } from "../MarketingNavbar";
import { ServicesMindMap } from "../ServicesMindMap";
import { BRAND } from "../shared";
import { GhostButton, PrimaryButton, SectionHeading } from "../ui";
import { WhiteTiltCard } from "../effects/WhiteTiltCard";

const PLANS = [
  {
    name: "Starter",
    price: "€97",
    features: ["1 web", "Email marketing", "Chatbot básico", "SEO básico", "1 canal ads"],
    highlight: false,
  },
  {
    name: "Growth",
    price: "€297",
    features: [
      "3 webs",
      "Todo Starter",
      "Meta / Google / TikTok Ads",
      "CRM completo",
      "WhatsApp",
      "Informes avanzados",
    ],
    highlight: true,
  },
  {
    name: "Elite",
    price: "€797",
    features: [
      "Webs ilimitadas",
      "Todo Growth",
      "IA generativa",
      "Automatizaciones avanzadas",
      "Manager dedicado IA",
      "Prioridad absoluta",
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

const COMPARE_ROWS = [
  { feature: "Precio/mes", nelvyon: "Desde €97", hubspot: "€800+", ghl: "€97+", ac: "€29+", hoot: "€99+" },
  { feature: "Todo en uno", nelvyon: true, hubspot: false, ghl: true, ac: false, hoot: false },
  { feature: "IA integrada", nelvyon: true, hubspot: false, ghl: false, ac: false, hoot: false },
  { feature: "Sin equipo necesario", nelvyon: true, hubspot: false, ghl: false, ac: false, hoot: false },
  { feature: "Webs incluidas", nelvyon: true, hubspot: false, ghl: true, ac: false, hoot: false },
  { feature: "Chatbot 24/7", nelvyon: true, hubspot: false, ghl: true, ac: false, hoot: false },
  { feature: "Soporte español", nelvyon: true, hubspot: true, ghl: false, ac: false, hoot: false },
] as const;

const STEPS = [
  { icon: MousePointerClick, title: "Elige tu plan", desc: "Starter, Growth o Elite según el tamaño de tu negocio." },
  { icon: Plug, title: "Conectamos tu negocio", desc: "Integramos canales, datos y herramientas en menos de 24 horas." },
  { icon: Bot, title: "Nelvyon trabaja solo", desc: "Automatizaciones, campañas e informes funcionan en segundo plano." },
] as const;

function CompareCell({ value }: { value: boolean | string }) {
  if (typeof value === "string") return <span>{value}</span>;
  return value ? (
    <Check className="inline h-5 w-5 text-emerald-500" />
  ) : (
    <X className="inline h-5 w-5 text-red-400" />
  );
}

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
    <WhiteTiltCard className="h-full">
      <div className="group h-full rounded-2xl border border-[#E5E7EB] bg-white p-6 transition hover:border-[#0066FF] hover:shadow-[0_12px_32px_rgba(0,102,255,0.12)]">
        <Icon className="h-10 w-10" style={{ color: BRAND.blue }} />
        <h3 className="mt-4 text-lg font-bold text-[#111827]">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[#374151]">{desc}</p>
      </div>
    </WhiteTiltCard>
  );
}

export function SaasPage() {
  return (
    <div
      className="min-h-screen overflow-x-hidden bg-white"
      style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
    >
      <MarketingNavbar active="/saas" />
      <main>
        {/* A — Hero */}
        <section
          className="relative -mt-20 overflow-hidden pt-28 pb-16 md:pt-32 md:pb-24"
          style={{
            background: `radial-gradient(ellipse 80% 70% at 50% 45%, #020818 0%, ${BRAND.bg} 72%)`,
            color: BRAND.textMuted,
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
              <p className="mt-6 text-lg leading-relaxed" style={{ color: BRAND.textMuted }}>
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

        {/* B — Tabla SaaS */}
        <ComparisonTable
          className="bg-white"
          footerNote="Todo incluido en tu suscripción. Sin sorpresas."
          headers={{
            service: "Función",
            replaces: "Reemplaza",
            cost: "Coste separado",
            nelvyon: "Nelvyon ✓",
          }}
          rows={SAAS_COMPARE_ROWS}
          title="¿Qué incluye NELVYON SaaS?"
          totalCost="€10.000+/mes"
        />

        {/* C — 12 features */}
        <section className="bg-white py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <FadeIn>
              <SectionHeading
                center
                subtitle="Módulos listos para usar desde el primer día"
                title="Funcionalidades del panel"
                variant="light"
              />
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

        {/* D — Mind map */}
        <div className="bg-[#F9FAFB]">
          <ServicesMindMap />
        </div>

        {/* E — Planes */}
        <section className="bg-white py-20 md:py-28" id="planes">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <FadeIn>
              <SectionHeading center subtitle="Escala cuando tu negocio crezca." title="Planes y precios" variant="light" />
            </FadeIn>
            <div className="mt-12 grid gap-8 lg:grid-cols-3">
              {PLANS.map((plan, i) => (
                <FadeIn delay={i * 0.08} key={plan.name}>
                  <motion.div
                    className={`relative flex h-full flex-col rounded-2xl border bg-white/95 p-8 backdrop-blur-md ${
                      plan.highlight ? "border-[#0066FF] shadow-[0_16px_48px_rgba(0,102,255,0.2)]" : "border-[#E5E7EB]"
                    }`}
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
                    <h3 className="text-xl font-bold text-[#111827]">{plan.name}</h3>
                    <p className="mt-4 tabular-nums">
                      <span className="text-4xl font-extrabold text-[#111827]">{plan.price}</span>
                      <span className="text-[#374151]">/mes</span>
                    </p>
                    <ul className="mt-8 flex-1 space-y-3">
                      {plan.features.map((f) => (
                        <li className="flex gap-2 text-sm text-[#374151]" key={f}>
                          <Check className="h-5 w-5 shrink-0" style={{ color: BRAND.blue }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link
                      className="nelvyon-glow-btn mt-8 block rounded-full py-3 text-center text-sm font-semibold text-white transition hover:scale-[1.03]"
                      href="/register"
                      style={{ backgroundColor: plan.highlight ? BRAND.blue : "rgba(0,102,255,0.85)" }}
                    >
                      Empezar
                    </Link>
                  </motion.div>
                </FadeIn>
              ))}
            </div>
            <p className="mt-8 text-center text-sm text-[#374151]">Sin permanencia. Cancela cuando quieras.</p>
          </div>
        </section>

        {/* Comparativa competencia */}
        <section className="bg-[#F9FAFB] py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <FadeIn>
              <SectionHeading center title="NELVYON vs la competencia" variant="light" />
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="mt-10 overflow-x-auto rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                      <th className="px-4 py-3 text-[#374151]">—</th>
                      <th className="bg-[#0066FF]/10 px-4 py-3 font-bold text-[#0066FF]">NELVYON</th>
                      <th className="px-4 py-3 text-[#374151]">HubSpot</th>
                      <th className="px-4 py-3 text-[#374151]">GoHighLevel</th>
                      <th className="px-4 py-3 text-[#374151]">ActiveCampaign</th>
                      <th className="px-4 py-3 text-[#374151]">Hootsuite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARE_ROWS.map((row) => (
                      <tr className="border-b border-[#E5E7EB]" key={row.feature}>
                        <td className="px-4 py-3 font-medium text-[#111827]">{row.feature}</td>
                        <td className="bg-[#0066FF]/5 px-4 py-3 font-semibold text-[#111827]">
                          <CompareCell value={row.nelvyon} />
                        </td>
                        <td className="px-4 py-3 text-[#374151]">
                          <CompareCell value={row.hubspot} />
                        </td>
                        <td className="px-4 py-3 text-[#374151]">
                          <CompareCell value={row.ghl} />
                        </td>
                        <td className="px-4 py-3 text-[#374151]">
                          <CompareCell value={row.ac} />
                        </td>
                        <td className="px-4 py-3 text-[#374151]">
                          <CompareCell value={row.hoot} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* F — Video */}
        <section
          className="py-20 md:py-28"
          style={{
            background: `linear-gradient(180deg, ${BRAND.heroGradEnd} 0%, ${BRAND.bg} 100%)`,
            color: BRAND.textMuted,
          }}
        >
          <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
            <FadeIn>
              <h2 className="text-3xl font-extrabold text-white md:text-4xl">Mira cómo funciona en 2 minutos</h2>
              <p className="mt-4 text-[#E0E0E0]">Un recorrido por el panel y las automatizaciones principales.</p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="mx-auto mt-10 max-w-2xl">
                <HeroVideo />
              </div>
            </FadeIn>
          </div>
        </section>

        {/* G — Pasos */}
        <section className="bg-white py-20 md:py-28">
          <div className="mx-auto max-w-5xl px-4 md:px-6">
            <FadeIn>
              <SectionHeading
                center
                subtitle="Sin instalaciones. Sin equipo. Sin complicaciones."
                title="Cómo funciona"
                variant="light"
              />
            </FadeIn>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <FadeIn delay={i * 0.1} key={step.title}>
                  <WhiteTiltCard className="h-full text-center">
                    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
                      <p className="text-5xl font-extrabold tabular-nums" style={{ color: BRAND.blue }}>
                        {i + 1}
                      </p>
                      <step.icon className="mx-auto mt-4 h-8 w-8" style={{ color: BRAND.blue }} />
                      <h3 className="mt-4 text-lg font-bold text-[#111827]">{step.title}</h3>
                      <p className="mt-2 text-sm text-[#374151]">{step.desc}</p>
                    </div>
                  </WhiteTiltCard>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* H — FAQ */}
        <FaqSection background="#F9FAFB" dark={false} items={SAAS_FAQ} />

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
