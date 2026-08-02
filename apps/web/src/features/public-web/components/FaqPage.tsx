import { faqItems, pageContent } from "../content/siteContent";
import { AiorSection, AiorTitle } from "./AiorBlocks";
import { AiorCtaBand, AiorPageHero } from "./AiorPageHero";
import { AiorFaq } from "./AiorFaq";

export function FaqPage() {
  const content = pageContent.faq;
  return (
    <>
      <AiorPageHero
        eyebrow={content.eyebrow}
        title={content.title}
        description={content.description}
        primaryCta={{ label: "Contactar", href: "/contacto" }}
        secondaryCta={{ label: "Ver recursos", href: "/recursos" }}
      />
      <AiorSection>
        <AiorTitle eyebrow="FAQ" title="Respuestas directas" center />
        <AiorFaq items={[...faqItems]} />
      </AiorSection>
      <AiorCtaBand
        title="¿No encuentra su respuesta?"
        body="Escríbanos y le orientamos sobre SaaS, packs o enterprise."
        primaryCta={{ label: "Ir a contacto", href: "/contacto" }}
        secondaryCta={{ label: "Ver precios", href: "/precios" }}
      />
    </>
  );
}
