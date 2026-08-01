import { pageContent, sectorItems } from "../content/siteContent";
import { Reveal } from "./Reveal";
import { Container, CtaBand, PageHero } from "./ui";

export function SectorsPage() {
  const content = pageContent.sectores;
  return (
    <>
      <PageHero
        eyebrow={content.eyebrow}
        title={content.title}
        description={content.description}
        primaryCta={{ label: "Solicitar demo", href: "/contacto" }}
        secondaryCta={{ label: "Ver soluciones", href: "/soluciones" }}
        imageSrc="/brand/public/office-banner.webp"
        imageAlt="Entorno corporativo moderno"
      />
      <section className="py-14 md:py-20">
        <Container>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {sectorItems.map((item, i) => (
              <Reveal key={item.id} delayMs={i * 35}>
                <article className="nv-public-panel h-full p-6">
                  <h2 className="text-lg font-semibold text-white">{item.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--nv-muted)]">{item.summary}</p>
                  <ul className="mt-5 space-y-2">
                    {item.outcomes.map((o) => (
                      <li key={o} className="flex gap-3 text-sm text-slate-300">
                        <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--nv-accent)]" />
                        <span>{o}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
      <CtaBand
        title="¿Su sector requiere un diseño específico?"
        body="Definimos flujos, integraciones y packs según su modelo de negocio."
        primaryCta={{ label: "Contactar", href: "/contacto" }}
      />
    </>
  );
}
