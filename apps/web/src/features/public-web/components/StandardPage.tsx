import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import type { PageContentEntry } from "../content/siteContent";
import { Reveal } from "./Reveal";
import { Container, CtaBand, PageHero, SectionHeading, SectionShell } from "./ui";

export function StandardPage({
  content,
  imageSrc,
  imageAlt,
  primaryCta = { label: "Solicitar demo", href: "/contacto" },
  secondaryCta = { label: "Acceder al SaaS", href: "/login" },
  children,
}: {
  content: PageContentEntry;
  imageSrc?: string;
  imageAlt?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  children?: ReactNode;
}) {
  return (
    <>
      <PageHero
        eyebrow={content.eyebrow}
        title={content.title}
        description={content.description}
        primaryCta={primaryCta}
        secondaryCta={secondaryCta}
        imageSrc={imageSrc}
        imageAlt={imageAlt}
      />
      <SectionShell soft>
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Detalle"
              title="Profundidad de contenido"
              description="Secciones operativas — sin bloques de relleno."
            />
          </Reveal>
          <div className="mt-10 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              {content.sections.map((section, i) => (
                <Reveal key={section.heading} delayMs={i * 30}>
                  <article className="nv-public-icon-card">
                    <div className="mb-4 flex items-center gap-3">
                      <Image
                        src={`/brand/public/product/icon${(i % 9) + 1}.png`}
                        alt=""
                        width={40}
                        height={40}
                      />
                      <h2 className="text-xl font-semibold text-[var(--nv-fg-strong)]">{section.heading}</h2>
                    </div>
                    <p className="text-sm leading-relaxed text-[var(--nv-muted)] md:text-base">{section.body}</p>
                    {section.bullets?.length ? (
                      <ul className="mt-5 space-y-2.5">
                        {section.bullets.map((b) => (
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
            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              {children ?? (
                <div className="nv-public-panel p-6">
                  <h3 className="text-lg font-semibold text-[var(--nv-fg-strong)]">Siguiente paso</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--nv-muted)]">
                    Evaluamos su operación y proponemos alcance concreto — SaaS, agencia o ambos.
                  </p>
                  <Link href="/contacto" className="nv-public-btn nv-public-btn-primary mt-6 w-full">
                    Solicitar demo
                  </Link>
                  <Link href="/precios" className="nv-public-btn nv-public-btn-secondary mt-3 w-full">
                    Ver precios
                  </Link>
                </div>
              )}
            </aside>
          </div>
        </Container>
      </SectionShell>
      <CtaBand
        title="Hablemos de su operación"
        body="Evaluamos alcance, integraciones y plan adecuado sin compromisos genéricos."
        primaryCta={{ label: "Contactar", href: "/contacto" }}
        secondaryCta={{ label: "Ver precios", href: "/precios" }}
      />
    </>
  );
}
