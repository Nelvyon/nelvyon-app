import Link from "next/link";

import { integrationsCatalog } from "../content/catalog";
import {
  DeepHero,
  DeepPageShell,
  FaqAccordion,
  FeatureGrid,
  MediaBlock,
} from "./DeepPage";
import { Reveal } from "./Reveal";
import { Container, SectionHeading, SectionShell } from "./ui";

const CONNECTIVITY_LABEL: Record<string, string> = {
  nativo: "Nativo",
  api: "API",
  webhook: "Webhook",
  oauth: "OAuth",
};

const categories = [...new Set(integrationsCatalog.map((i) => i.category))];

export function IntegrationsPage() {
  return (
    <DeepPageShell
      ctaTitle="¿Falta un conector crítico?"
      ctaBody="Evaluamos webhooks, APIs OAuth y alcance enterprise para su stack."
    >
      <DeepHero
        eyebrow="Integraciones"
        title="Conecte NELVYON con su ecosistema real"
        description="Stripe, AWS SES, Google, Meta, WhatsApp, Microsoft, Outlook, Slack, Twilio y webhooks. Cada integración documenta su modo de conectividad y estado de activación — sin fingir conexiones que no existen."
        primaryCta={{ label: "Solicitar integración", href: "/contacto" }}
        secondaryCta={{ label: "Ver SaaS", href: "/producto" }}
        image="/brand/public/saas-shots/workflows.webp"
        imageAlt="Integraciones NELVYON"
      />

      <SectionShell soft>
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Principio"
              title="Estados honestos"
              description="Si una integración requiere configuración (SES, Twilio, OAuth de proyecto), la UI y esta documentación lo indican."
            />
          </Reveal>
          <div className="mt-10">
            <FeatureGrid
              items={[
                {
                  title: "Nativo",
                  body: "Integrado en el producto (Stripe billing, SES campañas).",
                },
                {
                  title: "OAuth / API",
                  body: "Activación por proyecto o credenciales del cliente.",
                },
                {
                  title: "Webhooks",
                  body: "Eventos salientes para Slack, Zapier y sistemas propios.",
                },
              ]}
            />
          </div>
        </Container>
      </SectionShell>

      {categories.map((category) => {
        const items = integrationsCatalog.filter((i) => i.category === category);
        return (
          <SectionShell key={category} className={categories.indexOf(category) % 2 === 1 ? "bg-[var(--nv-bg-soft)]" : ""}>
            <Container>
              <Reveal>
                <SectionHeading eyebrow={category} title={`Integraciones · ${category}`} />
              </Reveal>
              <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((item, i) => (
                  <Reveal key={item.id} delayMs={i * 30}>
                    <article className="nv-public-panel h-full p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--nv-bg-soft)] text-sm font-bold text-[var(--nv-fg)]">
                            {item.initial}
                          </span>
                          <h3 className="text-lg font-semibold text-[var(--nv-fg-strong)]">{item.name}</h3>
                        </div>
                        <span className="shrink-0 rounded-full border border-[var(--nv-border)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--nv-accent-deep)]">
                          {CONNECTIVITY_LABEL[item.connectivity] ?? item.connectivity}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-[var(--nv-muted)]">{item.short}</p>
                      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--nv-muted-2)]">
                        {item.status.replace("_", " ")} · {item.statusNote}
                      </p>
                      <ul className="mt-4 space-y-1.5">
                        {item.capabilities.map((cap) => (
                          <li key={cap} className="flex gap-2 text-xs text-[var(--nv-muted)]">
                            <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--nv-accent)]" />
                            {cap}
                          </li>
                        ))}
                      </ul>
                    </article>
                  </Reveal>
                ))}
              </div>
            </Container>
          </SectionShell>
        );
      })}

      <MediaBlock
        title="Extienda con webhooks y automatización externa"
        body="Los eventos salientes del tenant permiten conectar Zapier, sistemas propios o alertas Slack sin duplicar lógica en el SaaS."
        bullets={[
          "Eventos de leads y workflow configurables",
          "Alertas operativas a Slack",
          "Extensión vía API donde el alcance lo permita",
        ]}
        reverse
        mock
      />

      <SectionShell>
        <Container className="grid gap-10 lg:grid-cols-2">
          <Reveal>
            <SectionHeading eyebrow="FAQ Integraciones" title="Preguntas frecuentes" />
            <div className="mt-8">
              <FaqAccordion
                items={[
                  {
                    question: "¿Todas las integraciones están activas en mi cuenta?",
                    answer: "No necesariamente. Stripe y SES son nativos pero requieren configuración de entorno. Google/Meta/WhatsApp se activan por proyecto.",
                  },
                  {
                    question: "¿Pueden desarrollar un conector custom?",
                    answer: "Sí, en alcance enterprise. Evaluamos API, webhooks y requisitos de compliance en discovery.",
                  },
                  {
                    question: "¿WhatsApp funciona out-of-the-box?",
                    answer: "Requiere Twilio/WhatsApp Business configurado. La UI indica el estado real.",
                  },
                  {
                    question: "¿Dónde veo el mapa completo del SaaS?",
                    answer: "En /producto encontrará módulos e integraciones vinculadas al software operativo.",
                  },
                ]}
              />
            </div>
          </Reveal>
          <Reveal delayMs={50}>
            <div className="nv-public-panel p-6 md:p-8">
              <h3 className="text-xl font-semibold text-[var(--nv-fg-strong)]">Siguiente paso</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--nv-muted)]">
                Cuéntenos qué sistemas debe conectar su operación y le proponemos alcance técnico concreto.
              </p>
              <Link href="/contacto" className="nv-public-btn nv-public-btn-primary mt-6 w-full">
                Contactar
              </Link>
              <Link href="/enterprise" className="nv-public-btn nv-public-btn-secondary mt-3 w-full">
                Enterprise
              </Link>
            </div>
          </Reveal>
        </Container>
      </SectionShell>
    </DeepPageShell>
  );
}
