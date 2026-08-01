import Link from "next/link";

import { pageContent, resourceItems } from "../content/siteContent";
import { Reveal } from "./Reveal";
import { Container, CtaBand, PageHero } from "./ui";

export function ResourcesPage() {
  const content = pageContent.recursos;
  return (
    <>
      <PageHero
        eyebrow={content.eyebrow}
        title={content.title}
        description={content.description}
        primaryCta={{ label: "Ir al blog", href: "/blog" }}
        secondaryCta={{ label: "FAQ", href: "/faq" }}
        imageSrc="/brand/public/blog-infra.webp"
        imageAlt="Infraestructura y operaciones tecnologicas"
      />
      <section className="py-14 md:py-20">
        <Container>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {resourceItems.map((item, i) => (
              <Reveal key={item.id} delayMs={i * 35}>
                <Link
                  href={item.href}
                  className="nv-public-panel block h-full p-6 transition-colors hover:border-[rgba(0,132,255,0.4)]"
                >
                  <h2 className="text-lg font-semibold text-white">{item.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--nv-muted)]">{item.summary}</p>
                  <span className="mt-5 inline-flex text-sm font-medium text-[var(--nv-accent)]">Abrir</span>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
      <CtaBand
        title="Prefiere hablar con una persona?"
        body="El equipo le orienta sobre seguridad, legal, plataforma o activacion."
        primaryCta={{ label: "Contacto", href: "/contacto" }}
      />
    </>
  );
}
