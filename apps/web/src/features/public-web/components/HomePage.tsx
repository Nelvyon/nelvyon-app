import Image from "next/image";
import Link from "next/link";

import { homeContent, siteBrand } from "../content/siteContent";
import { Reveal } from "./Reveal";
import { Container, CtaBand, FeatureCards, MediaSplit, SectionHeading } from "./ui";

export function PublicHomePage() {
  const { hero, pillars, platformLayers, capabilities, sectorsPreview, proofStats, faqPreview, cta } =
    homeContent;

  return (
    <>
      <section className="relative overflow-hidden">
        <div aria-hidden className="nv-public-grid-bg pointer-events-none absolute inset-0" />
        <Container className="relative grid min-h-[78vh] items-center gap-10 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-24">
          <Reveal>
            <p className="nv-public-eyebrow">{hero.eyebrow}</p>
            <h1 className="nv-public-display mt-5 text-4xl text-white md:text-5xl lg:text-[3.55rem]">
              <span className="block">{hero.titleLines[0]}</span>
              <span className="mt-2 block text-slate-200">{hero.titleLines[1]}</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-[var(--nv-muted)] md:text-lg">
              {hero.subtitle}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href={hero.primaryCta.href} className="nv-public-btn nv-public-btn-primary">
                {hero.primaryCta.label}
              </Link>
              <Link href={hero.secondaryCta.href} className="nv-public-btn nv-public-btn-secondary">
                {hero.secondaryCta.label}
              </Link>
            </div>
            <p className="mt-6 text-sm text-slate-500">{siteBrand.name} · {siteBrand.tagline}</p>
          </Reveal>
          <Reveal delayMs={90} className="relative">
            <div className="nv-public-panel relative aspect-[4/3] overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.45)]">
              <Image
                src="/brand/public/hero-team.webp"
                alt="Equipo profesional colaborando en un entorno de trabajo tecnológico"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 45vw"
                priority
              />
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="border-y border-[var(--nv-border)] bg-[#010613] py-10">
        <Container>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {proofStats.map((stat, i) => (
              <Reveal key={stat.label} delayMs={i * 40}>
                <div>
                  <p className="nv-public-display text-3xl text-white md:text-4xl">{stat.value}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-200">{stat.label}</p>
                  <p className="mt-1 text-sm text-[var(--nv-muted)]">{stat.detail}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16 md:py-24">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Por qué NELVYON"
              title="Un sistema para ejecutar, no solo para presentar."
              description="Arquitectura de producto real: agencia IA, SaaS B2B y portal cliente con la misma exigencia de calidad."
            />
          </Reveal>
          <div className="mt-10">
            <FeatureCards items={pillars} />
          </div>
        </Container>
      </section>

      <MediaSplit
        eyebrow="Arquitectura"
        title="Tres capas. Una operación."
        body="SaaS para el día a día, OS de packs para la ejecución de marketing y portal para aprobar entregables con trazabilidad."
        imageSrc="/brand/public/platform-ui.webp"
        imageAlt="Vista de plataforma tecnológica NELVYON"
        bullets={platformLayers.map((l) => `${l.title}: ${l.body}`)}
      />

      <section className="border-t border-[var(--nv-border)] py-16 md:py-24">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Capacidades"
              title="Lo que su equipo opera cada día."
              description="Módulos pensados para producción: CRM, campañas, workflows, packs y billing."
              align="center"
            />
          </Reveal>
          <div className="mt-10">
            <FeatureCards items={capabilities} />
          </div>
        </Container>
      </section>

      <MediaSplit
        eyebrow="Agencia"
        title="Ejecución profesional con gobierno humano."
        body="Los agentes producen a escala; la calidad, la marca y las decisiones estratégicas permanecen bajo control."
        imageSrc="/brand/public/agency-collab.webp"
        imageAlt="Profesionales revisando materiales de marca en oficina moderna"
        reverse
        bullets={[
          "Packs de crecimiento con kickoff y QA",
          "Portal cliente para revisión y aprobación",
          "Sin mockups presentados como producto",
        ]}
      />

      <section className="border-t border-[var(--nv-border)] py-16 md:py-24">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Sectores"
              title="Diseñado para operaciones exigentes."
              description="Desde negocio local hasta enterprise: el mismo criterio de trazabilidad y medición."
            />
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {sectorsPreview.map((item, i) => (
              <Reveal key={item.title} delayMs={i * 40}>
                <article className="nv-public-panel p-6">
                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--nv-muted)]">{item.body}</p>
                  <Link href="/sectores" className="mt-4 inline-flex text-sm font-medium text-[var(--nv-accent)] hover:underline">
                    Ver sectores
                  </Link>
                </article>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-[var(--nv-border)] py-16 md:py-24">
        <Container className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <SectionHeading
              eyebrow="FAQ"
              title="Preguntas frecuentes"
              description="Respuestas directas sobre plataforma, packs y precios."
            />
            <Link href="/faq" className="nv-public-btn nv-public-btn-secondary mt-8">
              Ver todas las preguntas
            </Link>
          </Reveal>
          <div className="space-y-3">
            {faqPreview.map((item, i) => (
              <Reveal key={item.question} delayMs={i * 30}>
                <details className="nv-public-panel group p-5 open:border-[rgba(0,132,255,0.35)]">
                  <summary className="cursor-pointer list-none text-base font-semibold text-white marker:content-none [&::-webkit-details-marker]:hidden">
                    {item.question}
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--nv-muted)]">{item.answer}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <CtaBand {...cta} />
    </>
  );
}
