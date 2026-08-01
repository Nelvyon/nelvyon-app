import Image from "next/image";
import Link from "next/link";

import { saasShotSrc } from "../content/saasShots";
import { pageContent } from "../content/siteContent";
import { enterpriseIcons, libraryPhoto, moduleIcon } from "../content/visualLibrary";
import { Reveal } from "./Reveal";
import {
  BentoCapabilities,
  IconFeatureGrid,
  IntegrationsBand,
  ShowcaseSplit,
} from "./sections/marketingSections";
import { Container, CtaBand, PageHero, SectionHeading, SectionShell } from "./ui";

const content = pageContent.plataforma;

export function PlatformPage() {
  return (
    <>
      <PageHero
        eyebrow={content.eyebrow}
        title={content.title}
        description={content.description}
        primaryCta={{ label: "Solicitar demo", href: "/contacto" }}
        secondaryCta={{ label: "Ver precios", href: "/precios" }}
        productMock
      />

      <IconFeatureGrid
        eyebrow="Capas de producto"
        title="SaaS, OS y portal en una sola operación"
        description={content.sections[0]?.body ?? ""}
        items={[
          {
            title: "SaaS B2B multi-tenant",
            body: "CRM, campañas, inbox, pipeline, workflows y billing con autenticación JWT y RBAC.",
            icon: moduleIcon("crm"),
            href: "/producto",
          },
          {
            title: "OS de packs IA",
            body: "Kickoff, orquestación y QA de entregables de marketing con auto-aprobación condicionada.",
            icon: moduleIcon("ia"),
            href: "/automatizaciones-ia",
          },
          {
            title: "Portal cliente",
            body: "Revisión y aprobación de entregables con trazabilidad — mocks presentados como producto.",
            icon: moduleIcon("portal"),
            href: "/agencia",
          },
        ]}
      />

      <ShowcaseSplit
        eyebrow="Producto"
        title="Una superficie operativa, no una landing de promesas"
        body={content.sections[1]?.body ?? content.description}
        imageSrc={saasShotSrc("analytics")}
        imageAlt="Analítica SaaS NELVYON · captura real"
        bullets={[
          {
            title: "Capa SaaS",
            body: "CRM, campañas, workflows y billing en un entorno multi-tenant con roles.",
          },
          {
            title: "Capa OS",
            body: "Packs de marketing con kickoff, QA y portal de aprobación.",
          },
          {
            title: "Continuidad",
            body: "Rutas críticas con estado real de base de datos y cookies httpOnly.",
          },
        ]}
        cta={{ label: "Acceder al SaaS", href: "/login" }}
      />

      <BentoCapabilities
        eyebrow="Módulos"
        title="Profundidad de plataforma"
        description="Misma densidad de producto premium, con contenido NELVYON verificable."
        items={[
          {
            title: content.sections[0]?.heading ?? "Arquitectura",
            body: content.sections[0]?.body ?? "",
            image: saasShotSrc("dashboard"),
          },
          {
            title: content.sections[1]?.heading ?? "Seguridad",
            body: content.sections[1]?.body ?? "",
          },
          {
            title: content.sections[2]?.heading ?? "Operación",
            body: content.sections[2]?.body ?? "",
          },
          {
            title: "Observabilidad",
            body: "Métricas, evidencias E2E y gates de calidad como criterio de producto, no de marketing vacío.",
            image: saasShotSrc("workflows"),
          },
          {
            title: "Integraciones",
            body: "Stripe, SES, Twilio, webhooks y — conectividad real con estados honestos.",
          },
          {
            title: "Enterprise path",
            body: "Plan Elite, SLA e integraciones avanzadas cuando la operación lo exige.",
            image: libraryPhoto("F-02"),
          },
        ]}
      />

      <IntegrationsBand
        title="Conecte el stack que ya sostiene su negocio"
        body="La plataforma no sustituye su mundo: lo orquesta. Vea el mapa de conectividad real."
        cta={{ label: "Integraciones", href: "/integraciones" }}
        visualSrc={enterpriseIcons.sync}
      />

      <SectionShell soft className="border-t border-[var(--nv-border)]">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Detalle"
              title="Qué incluye la plataforma"
              description="Secciones canónicas de producto — relleno genérico."
            />
          </Reveal>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {content.sections.map((section, i) => (
              <Reveal key={section.heading} delayMs={i * 40}>
                <article className="nv-public-icon-card">
                  <div className="mb-5 flex items-center gap-3">
                    <Image
                      src={moduleIcon(["crm", "workflows", "analytics"][i % 3]!)}
                      alt=""
                      width={40}
                      height={40}
                    />
                    <h3 className="text-xl font-semibold text-[var(--nv-fg-strong)]">{section.heading}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-[var(--nv-muted)] md:text-base">{section.body}</p>
                  {"bullets" in section && section.bullets?.length ? (
                    <ul className="mt-5 space-y-2.5">
                      {section.bullets.map((b: string) => (
                        <li key={b} className="flex gap-3 text-sm text-[var(--nv-muted)]">
                          <Image
                            src="/brand/public/product/check-circle.png"
                            alt=""
                            width={18}
                            height={18}
                            className="mt-0.5 h-[18px] w-[18px] shrink-0"
                          />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              </Reveal>
            ))}
          </div>
          <div className="mt-10">
            <Link href="/contacto" className="nv-public-btn nv-public-btn-primary">
              Hablar con el equipo
            </Link>
          </div>
        </Container>
      </SectionShell>

      <CtaBand
        title="¿Listo para ver la plataforma en su contexto?"
        body="Evaluamos alcance, integraciones y plan sin demos genéricas."
        primaryCta={{ label: "Solicitar demo", href: "/contacto" }}
        secondaryCta={{ label: "Precios", href: "/precios" }}
      />
    </>
  );
}
