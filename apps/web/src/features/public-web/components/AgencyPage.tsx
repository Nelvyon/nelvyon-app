import Image from "next/image";
import Link from "next/link";

import { agencyServices } from "../content/catalog";
import { agencyIcon, libraryPhoto } from "../content/visualLibrary";
import {
  DeepHero,
  DeepPageShell,
  FaqAccordion,
  MediaBlock,
} from "./DeepPage";
import { Reveal } from "./Reveal";
import { Container, SectionHeading, SectionShell } from "./ui";
import { ShowcaseSplit } from "./sections/marketingSections";

export function AgencyPage() {
  return (
    <DeepPageShell
      ctaTitle="Propuesta de agencia a medida"
      ctaBody="Presupuesto personalizado. El SaaS NELVYON, si aplica, se factura aparte."
    >
      <DeepHero
        eyebrow="Agencia NELVYON"
        title="Servicios de marketing ejecutados con IA y gobierno humano"
        description="La agencia produce entregables reales — SEO, ads, branding, contenido, web, email y automatización — sobre capacidades verificables del SaaS cuando aplica. Precio de agencia: presupuesto a medida. Precio SaaS: planes separados en /precios."
        primaryCta={{ label: "Pedir propuesta", href: "/contacto?tipo=agencia" }}
        secondaryCta={{ label: "Precios de agencia", href: "/precios#agencia" }}
        image={libraryPhoto("F-01")}
        imageAlt="Equipo de agencia colaborando en oficina moderna"
      />

      <SectionShell soft className="border-b border-[var(--nv-border)]">
        <Container>
          <Reveal>
            <div className="nv-public-panel border-[rgba(0,132,255,0.25)] bg-[var(--nv-accent-soft)] p-6 md:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--nv-accent-deep)]">
                Separación clara de precios
              </p>
              <p className="mt-3 text-base leading-relaxed text-[var(--nv-fg)]">
                Los servicios de agencia se cotizan en{" "}
                <Link href="/precios#agencia" className="font-semibold text-[var(--nv-accent-deep)] hover:underline">
                  presupuesto personalizado
                </Link>
                . El SaaS NELVYON (CRM, campañas, workflows, billing) tiene planes mensuales independientes en{" "}
                <Link href="/precios#saas" className="font-semibold text-[var(--nv-accent-deep)] hover:underline">
                  /precios#saas
                </Link>
                . No mezclamos licencia y ejecución en una sola línea opaca.
              </p>
            </div>
          </Reveal>
        </Container>
      </SectionShell>

      <SectionShell>
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Catálogo completo"
              title="Todos los servicios de agencia"
              description="Cada tarjeta enlaza a la página profunda del servicio con entregables, proceso y FAQ."
              align="center"
            />
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {agencyServices.map((svc, i) => (
              <Reveal key={svc.id} delayMs={i * 35}>
                <Link href={svc.href} className="nv-zubaz-iconbox group !flex-col overflow-hidden !p-0">
                  <div className="relative aspect-[16/10] w-full overflow-hidden">
                    <Image
                      src={svc.image || libraryPhoto("F-01")}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <div className="p-5">
                    <Image
                      src={agencyIcon(svc.slug)}
                      alt=""
                      width={40}
                      height={40}
                      className="mb-3 h-10 w-10 object-contain"
                    />
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--nv-accent-deep)]">Agencia</p>
                    <h3 className="mt-2 text-lg font-semibold text-[var(--nv-fg-strong)]">{svc.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--nv-muted)]">{svc.short}</p>
                    <span className="mt-4 inline-flex text-sm font-semibold text-[var(--nv-accent-deep)]">Ver servicio →</span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </SectionShell>

      <ShowcaseSplit
        eyebrow="Método"
        title="De brief a entregable con trazabilidad"
        body="Kickoff estructurado, producción asistida por IA con revisión humana, QA y portal de aprobación cliente."
        imageSrc={libraryPhoto("F-01")}
        imageAlt="Colaboración de equipo en producción de agencia"
        bullets={[
          { title: "Kickoff", body: "Alcance, objetivos y criterios de aceptación antes de ejecutar." },
          { title: "Producción IA + humano", body: "Agentes especializados con evidencia y revisión de calidad." },
          { title: "Portal cliente", body: "Aprobación trazable — no hilos de email caóticos." },
        ]}
        cta={{ label: "Contactar agencia", href: "/contacto?tipo=agencia" }}
      />

      <MediaBlock
        title="Agencia + SaaS, no una u otra"
        body="La agencia diseña y ejecuta; el SaaS opera el día a día. Cuando un servicio requiere el motor software (email, CRM, workflows), lo documentamos en la propuesta con licencia aparte."
        bullets={[
          "Misma barra de calidad que el producto interno",
          "Sin teatro de IA — canary y spend en kill hasta autorización",
          "Estados honestos si falta configuración (SES, Twilio, etc.)",
        ]}
        image={libraryPhoto("F-01")}
        imageAlt="Equipo NELVYON — agencia y producto alineados"
        reverse
      />

      <SectionShell soft>
        <Container className="grid gap-10 lg:grid-cols-2">
          <Reveal>
            <SectionHeading eyebrow="FAQ Agencia" title="Preguntas frecuentes" />
            <div className="mt-8">
              <FaqAccordion
                items={[
                  {
                    question: "¿Cuánto cuesta un servicio de agencia?",
                    answer: "Presupuesto a medida según alcance. Véalo en /precios#agencia o solicite propuesta en /contacto.",
                  },
                  {
                    question: "¿Necesito el SaaS para contratar agencia?",
                    answer: "Depende del servicio. Email marketing y automatización suelen ejecutarse sobre el motor SaaS; branding o ads pueden ser independientes.",
                  },
                  {
                    question: "¿Qué diferencia hay con los packs OS?",
                    answer: "Los packs OS son entregables de marketing orquestados por IA con QA. Los servicios de agencia cubren ejecución continua o proyectos específicos.",
                  },
                  {
                    question: "¿Garantizan resultados?",
                    answer: "No vendemos rankings ni ROAS inventados. Trabajamos hipótesis medibles con reporting honesto.",
                  },
                ]}
              />
            </div>
          </Reveal>
          <Reveal delayMs={50}>
            <div className="nv-public-panel p-6 md:p-8">
              <h3 className="text-xl font-semibold text-[var(--nv-fg-strong)]">¿Busca el software?</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--nv-muted)]">
                CRM, campañas, workflows y billing viven en el SaaS NELVYON — producto separado de la agencia.
              </p>
              <Link href="/producto" className="nv-public-btn nv-public-btn-primary mt-6 w-full">
                Explorar SaaS
              </Link>
              <Link href="/automatizaciones-ia" className="nv-public-btn nv-public-btn-secondary mt-3 w-full">
                Automatizaciones IA
              </Link>
            </div>
          </Reveal>
        </Container>
      </SectionShell>
    </DeepPageShell>
  );
}
