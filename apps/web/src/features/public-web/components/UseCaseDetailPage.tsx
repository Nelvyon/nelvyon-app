import Link from "next/link";

import { getUseCase, useCasesCatalog } from "../content/catalog";
import {
  DeepHero,
  DeepPageShell,
  FeatureGrid,
  MediaBlock,
  RelatedLinks,
  StatCounter,
} from "./DeepPage";
import { Reveal } from "./Reveal";
import { Container, SectionHeading, SectionShell } from "./ui";

export function UseCaseDetailPage({ slug }: { slug: string }) {
  const useCase = getUseCase(slug);
  if (!useCase) return null;

  const related = useCasesCatalog.filter((u) => u.id !== useCase.id).slice(0, 3);

  return (
    <DeepPageShell
      ctaTitle="Aplicar este caso a su operación"
      ctaBody="Perfil tipificado — adaptamos módulos, servicios e integraciones en discovery."
    >
      <DeepHero
        eyebrow="Caso de uso"
        title={useCase.name}
        description={`${useCase.short} Audiencia: ${useCase.audience}.`}
        primaryCta={{ label: "Solicitar diagnóstico", href: "/contacto" }}
        secondaryCta={{ label: "Todos los casos", href: "/casos-de-uso" }}
        image={useCase.image}
        imageAlt={useCase.name}
      />

      <SectionShell>
        <Container>
          <div className="grid gap-8 sm:grid-cols-2">
            {useCase.metrics.map((m, i) => (
              <StatCounter key={m.label} value={m.value} label={m.label} detail={i === 0 ? "Capas del stack NELVYON" : undefined} />
            ))}
          </div>
        </Container>
      </SectionShell>

      {useCase.story.map((block, idx) => (
        <MediaBlock
          key={block.title}
          title={block.title}
          body={block.body}
          image={idx === useCase.story.length - 1 ? useCase.image : undefined}
          imageAlt={useCase.name}
          reverse={idx % 2 === 1}
          mock={idx === 1}
        />
      ))}

      <SectionShell soft>
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Nota metodológica"
              title="Perfil tipificado, no testimonio inventado"
              description="Este caso describe capacidades y enfoques reales de NELVYON. No incluye métricas de clientes con nombre ficticio ni promesas de ROI garantizado."
            />
          </Reveal>
          <div className="mt-10">
            <FeatureGrid
              items={[
                {
                  title: "Honestidad operativa",
                  body: "Documentamos qué está activo en producción y qué requiere configuración adicional.",
                },
                {
                  title: "Adaptación en discovery",
                  body: "Cada organización tiene matices; validamos alcance antes de comprometer entregables.",
                },
                {
                  title: "SaaS + Agencia",
                  body: "El software se licencia; los servicios de ejecución se presupuestan aparte cuando aplican.",
                },
              ]}
            />
          </div>
        </Container>
      </SectionShell>

      <SectionShell>
        <Container className="grid gap-8 lg:grid-cols-2">
          <Reveal>
            <div className="nv-public-panel p-6 md:p-8">
              <h3 className="text-xl font-semibold text-[var(--nv-fg-strong)]">Explore el SaaS</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--nv-muted)]">
                Vea módulos, integraciones y precios del software operativo.
              </p>
              <Link href="/producto" className="nv-public-btn nv-public-btn-primary mt-6 w-full">
                Hub del SaaS
              </Link>
            </div>
          </Reveal>
          <Reveal delayMs={40}>
            <div className="nv-public-panel p-6 md:p-8">
              <h3 className="text-xl font-semibold text-[var(--nv-fg-strong)]">Casos de éxito</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--nv-muted)]">
                Perfiles de proyecto anonimizados con rangos de capacidad — sin testimonios fabricados.
              </p>
              <Link href="/casos-de-exito" className="nv-public-btn nv-public-btn-secondary mt-6 w-full">
                Ver casos de éxito
              </Link>
            </div>
          </Reveal>
        </Container>
      </SectionShell>

      <RelatedLinks
        title="Otros casos de uso"
        items={related.map((u) => ({ label: u.name, href: `/casos-de-uso/${u.slug}`, body: u.short }))}
      />
    </DeepPageShell>
  );
}
