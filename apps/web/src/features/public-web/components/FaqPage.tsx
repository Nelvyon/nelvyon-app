import { faqItems, pageContent } from "../content/siteContent";
import { Reveal } from "./Reveal";
import { Container, CtaBand, PageHero } from "./ui";

export function FaqPage() {
  const content = pageContent.faq;
  return (
    <>
      <PageHero
        eyebrow={content.eyebrow}
        title={content.title}
        description={content.description}
        primaryCta={{ label: "Contactar", href: "/contacto" }}
        secondaryCta={{ label: "Ver recursos", href: "/recursos" }}
      />
      <section className="py-14 md:py-20">
        <Container className="max-w-3xl">
          <div className="space-y-3">
            {faqItems.map((item, i) => (
              <Reveal key={item.question} delayMs={Math.min(i * 20, 120)}>
                <details className="nv-public-panel p-5">
                  <summary className="cursor-pointer list-none text-base font-semibold text-white [&::-webkit-details-marker]:hidden">
                    {item.question}
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--nv-muted)]">{item.answer}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
      <CtaBand
        title="¿No encuentra su respuesta?"
        body="Escríbanos y le orientamos sobre plataforma, packs o enterprise."
        primaryCta={{ label: "Ir a contacto", href: "/contacto" }}
      />
    </>
  );
}
