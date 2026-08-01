import type { ReactNode } from "react";

import type { PageContentEntry } from "../content/siteContent";
import { Container, ContentSections, CtaBand, PageHero } from "./ui";

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
      <section className="py-14 md:py-20">
        <Container className="grid gap-10 lg:grid-cols-[1fr_0.85fr]">
          <ContentSections sections={content.sections} />
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">{children}</aside>
        </Container>
      </section>
      <CtaBand
        title="Hablemos de su operación"
        body="Evaluamos alcance, integraciones y plan adecuado sin compromisos genéricos."
        primaryCta={{ label: "Contactar", href: "/contacto" }}
        secondaryCta={{ label: "Ver precios", href: "/precios" }}
      />
    </>
  );
}
