import { pageContent, siteBrand } from "../content/siteContent";
import { ContactForm } from "./ContactForm";
import { Container, PageHero } from "./ui";

export function ContactPage() {
  const content = pageContent.contacto;
  return (
    <>
      <PageHero
        eyebrow={content.eyebrow}
        title={content.title}
        description={content.description}
        imageSrc="/brand/public/ops-focus.webp"
        imageAlt="Profesional trabajando en entorno tecnológico"
      />
      <section className="py-14 md:py-20">
        <Container className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            {content.sections.map((section) => (
              <article key={section.heading} className="nv-public-panel p-6">
                <h2 className="text-lg font-semibold text-white">{section.heading}</h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--nv-muted)]">{section.body}</p>
                {"bullets" in section && section.bullets?.length ? (
                  <ul className="mt-4 space-y-2">
                    {section.bullets.map((b: string) => (
                      <li key={b} className="flex gap-3 text-sm text-slate-300">
                        <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--nv-accent)]" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
            <div className="nv-public-panel p-6 text-sm text-[var(--nv-muted)]">
              <p>
                Comercial:{" "}
                <a className="text-[var(--nv-accent)] hover:underline" href={`mailto:${siteBrand.contactEmail}`}>
                  {siteBrand.contactEmail}
                </a>
              </p>
              <p className="mt-2">
                Soporte:{" "}
                <a className="text-[var(--nv-accent)] hover:underline" href={`mailto:${siteBrand.supportEmail}`}>
                  {siteBrand.supportEmail}
                </a>
              </p>
            </div>
          </div>
          <ContactForm />
        </Container>
      </section>
    </>
  );
}
