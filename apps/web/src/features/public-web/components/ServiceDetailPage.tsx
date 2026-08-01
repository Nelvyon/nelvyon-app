import Image from "next/image";
import Link from "next/link";

import {
  agencyServices,
  getAgencyService,
  getAgencyServiceByHref,
  saasModules,
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

export function ServiceDetailPage({ slugOrHref }: { slugOrHref: string }) {
  const svc =
    getAgencyService(slugOrHref) ??
    getAgencyServiceByHref(slugOrHref.startsWith("/") ? slugOrHref : `/${slugOrHref}`);
  if (!svc) return null;

  const relatedFinal = agencyServices
    .filter((s) => s.id !== svc.id && (svc.relatedServices.includes(s.id) || svc.relatedServices.includes(s.slug)))
    .slice(0, 4);
  const related =
    relatedFinal.length > 0 ? relatedFinal : agencyServices.filter((s) => s.id !== svc.id).slice(0, 4);

  return (
    <DeepPageShell
      ctaTitle={`Presupuesto para ${svc.name}`}
      ctaBody="Los servicios de agencia se cotizan a medida. El SaaS, si aplica, se factura aparte."
    >
      <DeepHero
        eyebrow="Agencia NELVYON"
        title={svc.name}
        description={`${svc.short} Problema: ${svc.problem} Enfoque: ${svc.solution}`}
        primaryCta={{ label: "Pedir presupuesto", href: `/contacto?tipo=agencia&servicio=${svc.id}` }}
        secondaryCta={{ label: "Todos los servicios", href: "/agencia" }}
        image={svc.image}
        imageAlt={svc.name}
      />

      <SectionShell soft>
        <Container className="grid gap-10 lg:grid-cols-2">
          <Reveal>
            <SectionHeading eyebrow="Problema" title="Qué resolvemos" description={svc.problem} />
          </Reveal>
          <Reveal delayMs={40}>
            <SectionHeading eyebrow="Enfoque" title="Cómo lo resolvemos" description={svc.solution} />
          </Reveal>
        </Container>
      </SectionShell>

      <SectionShell>
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Beneficios" title="Por qué equipos eligen este servicio" />
          </Reveal>
          <div className="mt-10">
            <FeatureGrid items={svc.benefits} />
          </div>
        </Container>
      </SectionShell>

      <SectionShell soft>
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Entregables" title="Qué recibe su organización" />
          </Reveal>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {svc.deliverables.map((d) => (
              <li key={d} className="nv-public-icon-card flex items-start gap-3 !p-5">
                <Image src="/brand/public/product/check-circle.png" alt="" width={22} height={22} className="mt-0.5" />
                <span className="text-sm font-medium text-[var(--nv-fg)] md:text-base">{d}</span>
              </li>
            ))}
          </ul>
        </Container>
      </SectionShell>

      <SectionShell>
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Proceso" title="Cómo trabajamos" description="Fases claras, exclusiones explícitas y handoff documentado." />
          </Reveal>
          <div className="mt-10">
            <ProcessTimeline steps={svc.process} />
          </div>
        </Container>
      </SectionShell>

      <MediaBlock
        title="Ejecución con evidencia"
        body="La agencia opera sobre capacidades reales del SaaS cuando aplica. El presupuesto de agencia nunca se mezcla con la licencia SaaS."
        image={svc.image}
        imageAlt={svc.name}
        reverse
      />

      <MidCta
        title="¿Quiere un presupuesto claro?"
        body="Discovery breve → propuesta con hitos, exclusiones y si requiere plan SaaS en línea separada."
        primaryCta={{ label: "Pedir presupuesto", href: `/contacto?tipo=agencia&servicio=${svc.id}` }}
        secondaryCta={{ label: "Precios agencia", href: "/precios#agencia" }}
      />

      <SectionShell soft>
        <Container className="grid gap-10 lg:grid-cols-2">
          <Reveal>
            <SectionHeading eyebrow={`FAQ · ${svc.name}`} title="Preguntas frecuentes" />
            <div className="mt-8">
              <FaqAccordion items={svc.faqs} />
            </div>
          </Reveal>
          <Reveal delayMs={50}>
            <div className="nv-public-panel p-6 md:p-8">
              <h3 className="text-xl font-semibold text-[var(--nv-fg-strong)]">SaaS + Agencia</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--nv-muted)]">
                Si el servicio requiere el motor software, cotizamos la licencia SaaS en línea separada.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--nv-muted)]">
                {saasModules.slice(0, 5).map((m) => (
                  <li key={m.id}>
                    <Link href={`/producto/${m.slug}`} className="font-medium text-[var(--nv-accent-deep)] hover:underline">
                      {m.name}
                    </Link>
                    {" — "}
                    {m.short}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </Container>
      </SectionShell>

      <RelatedLinks
        title="Otros servicios de agencia"
        items={related.map((s) => ({ label: s.name, href: s.href, body: s.short }))}
      />
    </DeepPageShell>
  );
}
