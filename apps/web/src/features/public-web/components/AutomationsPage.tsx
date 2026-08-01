import Image from "next/image";
import Link from "next/link";

import { saasShotSrc } from "../content/saasShots";
import { pageContent } from "../content/siteContent";
import { libraryPhoto, moduleIcon } from "../content/visualLibrary";
import { Reveal } from "./Reveal";
import { BentoCapabilities, IconFeatureGrid, ShowcaseSplit } from "./sections/marketingSections";
import { Container, CtaBand, PageHero, SectionHeading, SectionShell } from "./ui";

const content = pageContent["automatizaciones-ia"];

export function AutomationsPage() {
  return (
    <>
      <PageHero
        eyebrow={content.eyebrow}
        title={content.title}
        description={content.description}
        primaryCta={{ label: "Solicitar demo", href: "/contacto" }}
        secondaryCta={{ label: "Ver SaaS", href: "/producto" }}
        imageSrc={saasShotSrc("workflows")}
        imageAlt="Workflows SaaS NELVYON · captura real"
      />

      <IconFeatureGrid
        eyebrow="Automatización"
        title="Workflows, agentes y packs con idempotencia"
        description="Densidad de producto real: lo que el motor ejecuta en producción, sin nodos decorativos."
        items={[
          {
            title: "Workflows SaaS",
            body: "Triggers, acciones y ventanas de idempotencia para no duplicar envíos críticos.",
            icon: moduleIcon("workflows"),
            href: "/producto/workflows",
          },
          {
            title: "Packs OS",
            body: "Orquestación de marketing con QA y auto-aprobación condicionada.",
            icon: moduleIcon("agentes"),
            href: "/agencia",
          },
          {
            title: "Private AI / gobierno",
            body: "Canary kill, spend off y rutas fail-closed hasta autorización explícita.",
            icon: moduleIcon("ia"),
            href: "/seguridad",
          },
        ]}
      />

      <ShowcaseSplit
        eyebrow="Motor"
        title="Automatizar sin perder el control"
        body={content.sections[0]?.body ?? content.description}
        imageSrc={saasShotSrc("ai")}
        imageAlt="Panel IA NELVYON · captura real"
        bullets={[
          {
            title: "Diseño visual + clásico",
            body: "Editor y motor alineados a APIs reales — sin nodos decorativos sin backend.",
          },
          {
            title: "Idempotencia",
            body: "Protección temporal para evitar doble ejecución en campañas y triggers.",
          },
          {
            title: "Observabilidad",
            body: "Evidencias, logs y criterios de cierre medibles.",
          },
        ]}
        cta={{ label: "Ver integraciones", href: "/integraciones" }}
      />

      <BentoCapabilities
        eyebrow="Capas IA"
        title="Dónde vive la automatización"
        description="Storytelling de producto: de trigger a entregable aprobado."
        items={[
          {
            title: content.sections[0]?.heading ?? "Triggers",
            body: content.sections[0]?.body ?? "",
            image: saasShotSrc("workflows"),
          },
          {
            title: content.sections[1]?.heading ?? "Acciones",
            body: content.sections[1]?.body ?? "",
          },
          {
            title: content.sections[2]?.heading ?? "Gobierno",
            body: content.sections[2]?.body ?? "",
          },
          {
            title: "CRM + scoring",
            body: "Señales comerciales que alimentan automatizaciones sin inventar métricas.",
            image: saasShotSrc("crm"),
          },
          {
            title: "Comms",
            body: "Email, SMS y WhatsApp cuando la infraestructura está configurada — estados honestos.",
          },
          {
            title: "Enterprise",
            body: "Límites, RBAC y aislamiento tenant como default de seguridad.",
            image: libraryPhoto("F-02"),
          },
        ]}
      />

      <SectionShell soft className="border-t border-[var(--nv-border)]">
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Detalle" title="Alcance documentado" />
          </Reveal>
          <div className="mt-10 space-y-5">
            {content.sections.map((section, i) => (
              <Reveal key={section.heading} delayMs={i * 30}>
                <article className="nv-public-panel p-6 md:p-8">
                  <div className="flex items-start gap-4">
                    <Image
                      src={moduleIcon(i % 2 === 0 ? "workflows" : "ia")}
                      alt=""
                      width={40}
                      height={40}
                      className="mt-1"
                    />
                    <div>
                      <h3 className="text-xl font-semibold text-[var(--nv-fg-strong)]">{section.heading}</h3>
                      <p className="mt-3 text-base leading-relaxed text-[var(--nv-muted)]">{section.body}</p>
                      {"bullets" in section && section.bullets?.length ? (
                        <ul className="mt-4 space-y-2">
                          {section.bullets.map((b: string) => (
                            <li key={b} className="flex gap-3 text-sm text-[var(--nv-muted)]">
                              <Image
                                src="/brand/public/product/check-circle.png"
                                alt=""
                                width={18}
                                height={18}
                                className="mt-0.5"
                              />
                              {b}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
          <Link href="/contacto" className="nv-public-btn nv-public-btn-primary mt-10">
            Diseñar automatización
          </Link>
        </Container>
      </SectionShell>

      <CtaBand
        title="Automatice con criterio enterprise"
        body="Empezamos por el flujo que más impacto tiene en su operación — con evidencia."
        primaryCta={{ label: "Solicitar demo", href: "/contacto" }}
        secondaryCta={{ label: "Seguridad", href: "/seguridad" }}
      />
    </>
  );
}
