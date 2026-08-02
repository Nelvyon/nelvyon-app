import { faqItems, pageContent } from "../content/siteContent";
import { BrandSection, BrandTitle } from "./BrandBlocks";
import { BrandCtaBand, BrandPageHero } from "./BrandPageHero";
import { BrandFaq } from "./BrandFaq";

export function FaqPage() {
  const content = pageContent.faq;
  return (
    <>
      <BrandPageHero
        eyebrow={content.eyebrow}
        title={content.title}
        description={content.description}
        primaryCta={{ label: "Contactar", href: "/contacto" }}
        secondaryCta={{ label: "Ver recursos", href: "/recursos" }}
      />
      <BrandSection>
        <BrandTitle eyebrow="FAQ" title="Respuestas directas" center />
        <BrandFaq items={[...faqItems]} />
      </BrandSection>
      <BrandCtaBand
        title="¿No encuentra su respuesta?"
        body="Escríbanos y le orientamos sobre SaaS, packs o enterprise."
        primaryCta={{ label: "Ir a contacto", href: "/contacto" }}
        secondaryCta={{ label: "Ver precios", href: "/precios" }}
      />
    </>
  );
}
