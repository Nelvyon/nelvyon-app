import Link from "next/link";

import { getModule, saasModules, type ProductMockVariant } from "../content/catalog";
import { SLUG_TO_SHOT, shotForMock } from "../content/saasShots";
import {
  CaptureSlider,
  ComparisonTable,
  DeepHero,
  DeepPageShell,
  FaqAccordion,
  FeatureGrid,
  FeatureTabs,
  MediaBlock,
  MidCta,
  ProcessTimeline,
  RelatedLinks,
} from "./DeepPage";
import { Reveal } from "./Reveal";
import { Container, SectionHeading, SectionShell } from "./ui";

export function ModuleDetailPage({ slug }: { slug: string }) {
  const mod = getModule(slug);
  if (!mod) return null;

  const related = saasModules.filter((m) => mod.related.includes(m.id) || mod.related.includes(m.slug));
  const primaryShot = SLUG_TO_SHOT[mod.slug] ?? shotForMock(mod.mockVariant);
  const sliderShots = [
    ...(primaryShot ? [{ id: primaryShot, label: mod.name, mockVariant: mod.mockVariant }] : []),
    ...related.slice(0, 2).flatMap((m) => {
      const id = SLUG_TO_SHOT[m.slug] ?? shotForMock(m.mockVariant);
      return id ? [{ id, label: m.name, mockVariant: m.mockVariant as ProductMockVariant }] : [];
    }),
  ];

  return (
    <DeepPageShell ctaTitle={`Demo del módulo ${mod.name}`} ctaBody="Recorremos el flujo real en un tenant de evaluación.">
      <DeepHero
        eyebrow={mod.hero.eyebrow || "Módulo SaaS"}
        title={mod.hero.title}
        description={mod.hero.body}
        primaryCta={{ label: "Solicitar demo", href: "/contacto" }}
        secondaryCta={{ label: "Todos los módulos", href: "/producto" }}
        mock
        mockVariant={mod.mockVariant}
        status={mod.status}
      />

      <SectionShell soft>
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="En el producto"
              title={`${mod.name} forma parte del SaaS NELVYON`}
              description={
                mod.productPath
                  ? `Ruta operativa: ${mod.productPath}. Estado: ${mod.status.replace("_", " ")}.`
                  : `Estado: ${mod.status.replace("_", " ")}.`
              }
            />
          </Reveal>
          <div className="mt-10">
            <FeatureGrid items={mod.benefits} />
          </div>
        </Container>
      </SectionShell>

      <SectionShell>
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Capturas"
              title="Cómo se ve en el panel"
              description="Capturas reales del SaaS autenticado (tenant demo Aether Labs). Sin datos personales reales."
            />
          </Reveal>
          <div className="mt-10">
            {sliderShots.length ? (
              <CaptureSlider
                shots={sliderShots}
                device={mod.slug === "analytics" || mod.slug === "crm" ? "monitor" : "macbook"}
              />
            ) : (
              <CaptureSlider variants={[mod.mockVariant]} labels={[mod.name]} device="macbook" />
            )}
          </div>
        </Container>
      </SectionShell>

      <SectionShell soft>
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Funcionalidades" title="Capacidades en detalle" />
          </Reveal>
          <div className="mt-10">
            <FeatureTabs
              tabs={mod.features.map((f, i) => ({
                id: `f-${i}`,
                label: f.title,
                title: f.title,
                body: f.body,
              }))}
            />
          </div>
        </Container>
      </SectionShell>

      <MediaBlock
        title="Operación con evidencia"
        body={`${mod.name} no es una pantalla decorativa: está pensado para el día a día del equipo.`}
        bullets={mod.features.map((f) => f.title)}
        image={mod.hero.image}
        imageAlt={mod.hero.imageAlt}
      />

      <SectionShell>
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Casos de uso" title="Cómo se usa en operaciones reales" />
          </Reveal>
          <div className="mt-10">
            <FeatureGrid items={mod.useCases} />
          </div>
        </Container>
      </SectionShell>

      {mod.comparisonPoints?.length ? (
        <SectionShell soft>
          <Container>
            <Reveal>
              <SectionHeading eyebrow="Comparativa" title="Stack fragmentado vs NELVYON" />
            </Reveal>
            <div className="mt-10">
              <ComparisonTable
                columns={["Herramientas sueltas", "NELVYON"]}
                rows={[
                  {
                    feature: "Contexto",
                    values: ["Datos en silos", mod.comparisonPoints[0] || "Contexto unificado"],
                  },
                  {
                    feature: "Operación",
                    values: ["Pegamentos frágiles", mod.comparisonPoints[1] || "Mismo tenant y permisos"],
                  },
                  {
                    feature: "Gobierno",
                    values: ["Difícil de auditar", "RBAC, estados y trazabilidad"],
                  },
                ]}
              />
            </div>
          </Container>
        </SectionShell>
      ) : null}

      <SectionShell>
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Adopción" title="Cómo se activa" />
          </Reveal>
          <div className="mt-10">
            <ProcessTimeline
              steps={[
                { title: "Demo", body: "Recorrido del módulo en tenant de evaluación." },
                { title: "Alcance", body: "Plan SaaS y permisos necesarios." },
                { title: "Onboarding", body: "Importación y configuración inicial." },
                { title: "Operación", body: "Equipo trabajando con datos reales." },
              ]}
            />
          </div>
        </Container>
      </SectionShell>

      <MidCta
        title={`¿Quiere ver ${mod.name} en su contexto?`}
        body="Demo guiada sin compromiso. Si necesita ejecución creativa, la agencia se presupuesta aparte."
        primaryCta={{ label: "Solicitar demo", href: "/contacto" }}
        secondaryCta={{ label: "Precios SaaS", href: "/precios#saas" }}
      />

      <SectionShell soft>
        <Container className="grid gap-10 lg:grid-cols-2">
          <Reveal>
            <SectionHeading eyebrow={`FAQ · ${mod.name}`} title="Preguntas específicas" />
            <div className="mt-8">
              <FaqAccordion items={mod.faqs} />
            </div>
          </Reveal>
          <Reveal delayMs={50}>
            <div className="nv-public-panel p-6 md:p-8">
              <h3 className="text-xl font-semibold text-[var(--nv-fg-strong)]">Siguiente paso</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--nv-muted)]">
                Active el módulo en un plan SaaS o combínelo con servicios de agencia (presupuesto aparte).
              </p>
              <Link href="/precios#saas" className="nv-public-btn nv-public-btn-primary mt-6 w-full">
                Ver precios SaaS
              </Link>
              <Link href="/contacto" className="nv-public-btn nv-public-btn-secondary mt-3 w-full">
                Hablar con ventas
              </Link>
            </div>
          </Reveal>
        </Container>
      </SectionShell>

      <RelatedLinks
        title="Módulos relacionados"
        items={related.map((m) => ({ label: m.name, href: `/producto/${m.slug}`, body: m.short }))}
      />
    </DeepPageShell>
  );
}
