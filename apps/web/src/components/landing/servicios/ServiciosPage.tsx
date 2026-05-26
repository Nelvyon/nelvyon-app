"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { FadeIn } from "../FadeIn";
import { LandingFooter } from "../LandingFooter";
import { MarketingNavbar } from "../MarketingNavbar";
import { BRAND } from "../shared";
import { PrimaryButton, SectionHeading } from "../ui";

const SERVICES = [
  {
    slug: "seo",
    name: "SEO Premium",
    desc: "Auditoría técnica, investigación de palabras clave, contenido optimizado y link building ético. Informes mensuales con posiciones, tráfico orgánico y oportunidades de mejora.",
    results: ["+180% tráfico orgánico medio", "Top 3 en keywords objetivo", "Autoridad de dominio +25"],
    from: "497",
    steps: ["Auditoría inicial", "Estrategia de contenido", "Ejecución y enlaces", "Reporting mensual"],
  },
  {
    slug: "google-ads",
    name: "Google Ads",
    desc: "Campañas de búsqueda, display y Performance Max con optimización continua. Creatividades, extensiones y landing pages alineadas con tu conversión.",
    results: ["ROAS medio 4.2x", "CPL -35% vs agencia anterior", "Escalado en 30 días"],
    from: "397",
    steps: ["Setup y tracking", "Estructura de campañas", "Test A/B creatividades", "Optimización semanal"],
  },
  {
    slug: "meta-ads",
    name: "Meta Ads",
    desc: "Facebook e Instagram: prospecting, retargeting y lookalikes. Vídeo, carrusel y UGC con tecnología IA para iterar rápido.",
    results: ["+250% leads desde social", "CPA estable en escala", "Creatividades nuevas cada semana"],
    from: "397",
    steps: ["Pixel y eventos", "Audiencias", "Creatividades", "Escala con datos"],
  },
  {
    slug: "email",
    name: "Email Marketing",
    desc: "Newsletters, bienvenidas, carritos abandonados y secuencias de nurturing. Diseño responsive y entregabilidad monitorizada.",
    results: ["42% apertura media", "18% CTR en promociones", "Ingresos recurrentes +22%"],
    from: "197",
    steps: ["Estrategia de flujos", "Copy y diseño", "Automatización", "Análisis de cohortes"],
  },
  {
    slug: "automatizacion",
    name: "Automatización",
    desc: "Conecta formularios, CRM, email, SMS y WhatsApp en flujos que nutren y cierran sin intervención manual.",
    results: ["15h/semana ahorradas", "0 leads sin seguimiento", "Conversión +28%"],
    from: "297",
    steps: ["Mapa de customer journey", "Triggers y condiciones", "Pruebas QA", "Monitorización"],
  },
  {
    slug: "webs",
    name: "Webs y landings",
    desc: "Diseño UX, desarrollo rápido y optimización Core Web Vitals. Landings para campañas y webs corporativas completas.",
    results: ["LCP < 2.5s", "+45% conversión en formularios", "Mobile-first"],
    from: "697",
    steps: ["Wireframe y copy", "Diseño visual", "Desarrollo", "CRO continuo"],
  },
] as const;

function FlowDiagram({ steps }: { steps: readonly string[] }) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      {steps.map((step, i) => (
        <div className="flex items-center gap-2" key={step}>
          <span
            className="rounded-lg border px-3 py-1.5 text-xs font-medium text-white"
            style={{ backgroundColor: BRAND.card, borderColor: BRAND.cardBorder }}
          >
            {i + 1}. {step}
          </span>
          {i < steps.length - 1 ? (
            <ArrowRight className="h-4 w-4 shrink-0" style={{ color: BRAND.blue }} />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function ServiciosPage() {
  return (
    <div style={{ backgroundColor: BRAND.bg, color: BRAND.textMuted, fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      <MarketingNavbar active="/servicios" />
      <main>
        <section className="py-20 md:py-28" style={{ background: `linear-gradient(180deg, ${BRAND.bg} 0%, ${BRAND.heroGradEnd} 100%)` }}>
          <div className="mx-auto max-w-4xl px-4 text-center md:px-6">
            <FadeIn>
              <h1 className="text-4xl font-bold text-white md:text-5xl">Servicios de marketing digital</h1>
              <p className="mt-6 text-lg" style={{ color: BRAND.textMuted }}>
                Estrategia, ejecución y resultados medibles. Cada servicio incluye reporting claro y un equipo
                que conoce tu negocio.
              </p>
              <PrimaryButton className="mt-8" href="/contacto">
                Pedir presupuesto →
              </PrimaryButton>
            </FadeIn>
          </div>
        </section>

        <section className="py-16 md:py-24" style={{ backgroundColor: BRAND.bgSoft }}>
          <div className="mx-auto max-w-7xl space-y-16 px-4 md:px-6">
            {SERVICES.map((s, idx) => (
              <FadeIn delay={(idx % 3) * 0.05} key={s.slug}>
                <article
                  className="rounded-3xl border p-8 md:p-10 transition hover:border-[#0066FF]/35"
                  style={{ backgroundColor: BRAND.card, borderColor: BRAND.cardBorder }}
                >
                  <div className="grid gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                      <p className="text-4xl font-bold opacity-20" style={{ color: BRAND.blue }}>
                        {String(idx + 1).padStart(2, "0")}
                      </p>
                      <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">{s.name}</h2>
                      <p className="mt-4 leading-relaxed">{s.desc}</p>
                      <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider" style={{ color: BRAND.cyan }}>
                        ¿Cómo funciona?
                      </h3>
                      <FlowDiagram steps={s.steps} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Resultados típicos</p>
                      <ul className="mt-4 space-y-2">
                        {s.results.map((r) => (
                          <li className="flex gap-2 text-sm" key={r}>
                            <span style={{ color: BRAND.blue }}>✓</span>
                            {r}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-8 text-2xl font-bold text-white">
                        Desde <span style={{ color: BRAND.blue }}>€{s.from}</span>
                        <span className="text-base font-normal text-zinc-500">/mes</span>
                      </p>
                      <Link
                        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-white"
                        href="/contacto"
                      >
                        Solicitar este servicio <ArrowRight className="h-4 w-4" style={{ color: BRAND.blue }} />
                      </Link>
                    </div>
                  </div>
                </article>
              </FadeIn>
            ))}
          </div>
        </section>

        <section className="py-20 text-center" style={{ backgroundColor: BRAND.bg }}>
          <FadeIn>
            <SectionHeading light center title="¿No sabes por dónde empezar?" subtitle="Te recomendamos el mix ideal en una llamada de 30 minutos." />
            <PrimaryButton className="mt-8" href="/contacto">
              Agendar llamada gratuita
            </PrimaryButton>
          </FadeIn>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
