import Image from "next/image";

import { pageContent, siteBrand } from "../content/siteContent";
import { ContactForm } from "./ContactForm";
import { Reveal } from "./Reveal";
import { Container, PageHero, SectionShell } from "./ui";

export function ContactPage() {
  const content = pageContent.contacto;
  return (
    <>
      <PageHero
        eyebrow={content.eyebrow}
        title={content.title}
        description={content.description}
        imageSrc="/brand/public/library/photos/F-01.webp"
        imageAlt="Profesional en entorno tecnológico NELVYON"
      />
      <SectionShell soft>
        <Container className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
          <div className="space-y-5">
            {content.sections.map((section, i) => (
              <Reveal key={section.heading} delayMs={i * 40}>
                <article className="nv-public-icon-card">
                  <h2 className="text-lg font-semibold text-[var(--nv-fg-strong)] md:text-xl">{section.heading}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--nv-muted)] md:text-base">{section.body}</p>
                  {"bullets" in section && section.bullets?.length ? (
                    <ul className="mt-4 space-y-2">
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
            <Reveal delayMs={120}>
              <div className="nv-public-panel overflow-hidden">
                <div className="relative aspect-[16/9]">
                  <Image
                    src="/brand/public/contact-map.webp"
                    alt="Contexto visual de contacto NELVYON"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                  />
                </div>
                <div className="space-y-2 p-6 text-sm text-[var(--nv-muted)]">
                  <p>
                    Comercial:{" "}
                    <a className="font-medium text-[var(--nv-accent)] hover:underline" href={`mailto:${siteBrand.contactEmail}`}>
                      {siteBrand.contactEmail}
                    </a>
                  </p>
                  <p>
                    Soporte:{" "}
                    <a className="font-medium text-[var(--nv-accent)] hover:underline" href={`mailto:${siteBrand.supportEmail}`}>
                      {siteBrand.supportEmail}
                    </a>
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
          <Reveal delayMs={80}>
            <div className="nv-public-panel p-6 md:p-8">
              <h2 className="nv-public-display text-2xl text-[var(--nv-fg-strong)] md:text-3xl">Cuéntenos su operación</h2>
              <p className="mt-3 text-sm text-[var(--nv-muted)] md:text-base">
                Respuesta humana. Sin formularios de relleno ni promesas genéricas.
              </p>
              <div className="mt-8">
                <ContactForm />
              </div>
            </div>
          </Reveal>
        </Container>
      </SectionShell>
    </>
  );
}
