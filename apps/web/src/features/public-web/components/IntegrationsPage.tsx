import { integrationItems, pageContent } from "../content/siteContent";
import { Reveal } from "./Reveal";
import { Container, CtaBand, PageHero } from "./ui";

const connectivityLabel = {
  nativo: "Nativo",
  webhook: "Webhook",
  api: "API",
  infraestructura: "Infraestructura",
} as const;

export function IntegrationsPage() {
  const content = pageContent.integraciones;
  return (
    <>
      <PageHero
        eyebrow={content.eyebrow}
        title={content.title}
        description={content.description}
        primaryCta={{ label: "Solicitar integración", href: "/contacto" }}
        secondaryCta={{ label: "Ver plataforma", href: "/plataforma" }}
        imageSrc="/brand/public/automation-ui.webp"
        imageAlt="Automatización e integraciones en entorno profesional"
      />
      <section className="py-14 md:py-20">
        <Container>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {integrationItems.map((item, i) => (
              <Reveal key={item.id} delayMs={Math.min(i * 25, 150)}>
                <article className="nv-public-panel h-full p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-semibold text-white">{item.name}</h2>
                    <span className="shrink-0 rounded-full border border-[var(--nv-border)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--nv-accent)]">
                      {connectivityLabel[item.connectivity]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                    {item.category}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--nv-muted)]">{item.summary}</p>
                  <p className="mt-4 text-xs leading-relaxed text-slate-500">{item.statusNote}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
      <CtaBand
        title="¿Falta un conector crítico?"
        body="Evaluamos webhooks, APIs y alcance enterprise para su stack."
        primaryCta={{ label: "Contactar", href: "/contacto" }}
      />
    </>
  );
}
