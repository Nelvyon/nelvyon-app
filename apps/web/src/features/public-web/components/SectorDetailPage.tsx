import Image from "next/image";
import Link from "next/link";

import {
  agencyServices,
  getSector,
  saasModules,
  sectorsCatalog,
} from "../content/catalog";
import {
  DeepHero,
  DeepPageShell,
  FaqAccordion,
  FeatureGrid,
  MediaBlock,
  MidCta,
  ProcessTimeline,
  RelatedLinks,
} from "./DeepPage";
import { Reveal } from "./Reveal";
import { Container, SectionHeading, SectionShell } from "./ui";

export function SectorDetailPage({ slug }: { slug: string }) {
  const sector = getSector(slug);
  if (!sector) return null;

  const relatedSectors = sectorsCatalog.filter((s) => s.id !== sector.id).slice(0, 3);
  const linkedModules = saasModules.filter((m) => sector.modules.includes(m.id));
  const linkedServices = agencyServices.filter((s) => sector.services.includes(s.id));

  return (
    <DeepPageShell
      ctaTitle={`NELVYON para ${sector.name}`}
      ctaBody="Definimos módulos SaaS, servicios de agencia e integraciones según su sector."
    >
      <DeepHero
        eyebrow="Sector"
        title={sector.name}
        description={sector.short}
        primaryCta={{ label: "Solicitar demo", href: "/contacto" }}
        secondaryCta={{ label: "Todos los sectores", href: "/sectores" }}
        image={sector.image}
        imageAlt={sector.name}
      />

      <SectionShell soft>
        <Container className="grid gap-10 lg:grid-cols-2">
          <Reveal>
            <SectionHeading eyebrow="Retos" title="Qué suele frenar el crecimiento" />
            <ul className="mt-8 space-y-3">
              {sector.challenges.map((c) => (
                <li key={c} className="flex gap-3 text-sm text-[var(--nv-muted)] md:text-base">
                  <Image src="/brand/public/product/check-circle.png" alt="" width={22} height={22} className="mt-0.5 shrink-0" />
                  {c}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delayMs={40}>
            <SectionHeading eyebrow="Resultados" title="Qué buscamos lograr" />
            <ul className="mt-8 space-y-3">
              {sector.outcomes.map((o) => (
                <li key={o} className="flex gap-3 text-sm text-[var(--nv-muted)] md:text-base">
                  <Image src="/brand/public/product/check-circle.png" alt="" width={22} height={22} className="mt-0.5 shrink-0" />
                  {o}
                </li>
              ))}
            </ul>
          </Reveal>
        </Container>
      </SectionShell>

      <MediaBlock
        title="Stack recomendado para su sector"
        body="Combinamos módulos SaaS y servicios de agencia según el perfil. El software se licencia; la agencia se presupuesta aparte."
        bullets={[
          ...linkedModules.map((m) => `SaaS · ${m.name}: ${m.short}`),
          ...linkedServices.map((s) => `Agencia · ${s.name}: ${s.short}`),
        ]}
        image={sector.image}
        imageAlt={sector.name}
        reverse
      />

      {linkedModules.length > 0 ? (
        <SectionShell>
          <Container>
            <Reveal>
              <SectionHeading eyebrow="Módulos SaaS" title="Software operativo" />
            </Reveal>
            <div className="mt-10">
              <FeatureGrid items={linkedModules.map((m) => ({ title: m.name, body: m.short }))} />
            </div>
            <Link href="/producto" className="nv-public-btn nv-public-btn-secondary mt-8">
              Ver todos los módulos SaaS
            </Link>
          </Container>
        </SectionShell>
      ) : null}

      {linkedServices.length > 0 ? (
        <SectionShell soft>
          <Container>
            <Reveal>
              <SectionHeading eyebrow="Servicios de agencia" title="Ejecución a medida" />
            </Reveal>
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {linkedServices.map((s, i) => (
                <Reveal key={s.id} delayMs={i * 30}>
                  <Link href={s.href} className="nv-public-icon-card block h-full">
                    <h3 className="text-lg font-semibold text-[var(--nv-fg-strong)]">{s.name}</h3>
                    <p className="mt-2 text-sm text-[var(--nv-muted)]">{s.short}</p>
                    <span className="mt-4 inline-flex text-sm font-semibold text-[var(--nv-accent-deep)]">Ver servicio →</span>
                  </Link>
                </Reveal>
              ))}
            </div>
            <Link href="/precios#agencia" className="nv-public-btn nv-public-btn-secondary mt-8">
              Presupuesto de agencia
            </Link>
          </Container>
        </SectionShell>
      ) : null}

      <SectionShell>
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Adopción" title={`Cómo activamos NELVYON en ${sector.name}`} />
          </Reveal>
          <div className="mt-10">
            <ProcessTimeline
              steps={[
                { title: "Diagnóstico", body: "Retos del sector y stack actual." },
                { title: "Diseño", body: "Módulos SaaS + servicios de agencia." },
                { title: "Piloto", body: "Un flujo crítico con métricas." },
                { title: "Escala", body: "Rollout y optimización continua." },
              ]}
            />
          </div>
        </Container>
      </SectionShell>

      <MidCta
        title={`Solución para ${sector.name}`}
        body="Demo del SaaS y/o presupuesto de agencia — con alcance concreto para su vertical."
        primaryCta={{ label: "Solicitar demo", href: "/contacto" }}
        secondaryCta={{ label: "Ver precios", href: "/precios" }}
      />

      <SectionShell soft>
        <Container className="grid gap-10 lg:grid-cols-2">
          <Reveal>
            <SectionHeading eyebrow={`FAQ · ${sector.name}`} title="Preguntas frecuentes" />
            <div className="mt-8">
              <FaqAccordion items={sector.faqs} />
            </div>
          </Reveal>
          <Reveal delayMs={50}>
            <div className="nv-public-panel p-6 md:p-8">
              <h3 className="text-xl font-semibold text-[var(--nv-fg-strong)]">Casos de uso relacionados</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--nv-muted)]">
                Explore perfiles tipificados de implementación en su sector.
              </p>
              <Link href="/casos-de-uso" className="nv-public-btn nv-public-btn-primary mt-6 w-full">
                Ver casos de uso
              </Link>
              <Link href="/contacto" className="nv-public-btn nv-public-btn-secondary mt-3 w-full">
                Hablar con ventas
              </Link>
            </div>
          </Reveal>
        </Container>
      </SectionShell>

      <RelatedLinks
        title="Otros sectores"
        items={relatedSectors.map((s) => ({ label: s.name, href: `/sectores/${s.slug}`, body: s.short }))}
      />
    </DeepPageShell>
  );
}
