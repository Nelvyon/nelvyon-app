import type { ReactNode } from "react";
import Link from "next/link";

import type { PageContentEntry } from "../content/siteContent";
import { AiorAsideNext, AiorCheckList, AiorSection, AiorTitle } from "./AiorBlocks";
import { AiorCtaBand, AiorPageHero } from "./AiorPageHero";

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
      <AiorPageHero
        eyebrow={content.eyebrow}
        title={content.title}
        description={content.description}
        primaryCta={primaryCta}
        secondaryCta={secondaryCta}
        imageSrc={imageSrc}
        imageAlt={imageAlt}
      />
      <AiorSection soft>
        <AiorTitle
          eyebrow="Detalle"
          title="Profundidad de contenido"
          description="Secciones operativas — sin bloques de relleno."
        />
        <div className="row gy-4">
          <div className="col-lg-8">
            {content.sections.map((section) => (
              <article
                key={section.heading}
                style={{
                  padding: 28,
                  borderRadius: 16,
                  border: "1px solid #E0E0E0",
                  background: "#fff",
                  marginBottom: 16,
                }}
              >
                <h2 className="h5">{section.heading}</h2>
                <p>{section.body}</p>
                {section.bullets?.length ? <AiorCheckList items={section.bullets} /> : null}
              </article>
            ))}
          </div>
          <div className="col-lg-4">
            {children ?? (
              <AiorAsideNext
                body="Evaluamos su operación y proponemos alcance concreto — SaaS, agencia o ambos."
                primaryCta={{ label: "Solicitar demo", href: "/contacto" }}
                secondaryCta={{ label: "Ver precios", href: "/precios" }}
              />
            )}
            <p className="mt-3" style={{ fontSize: 13, color: "#6b7c93" }}>
              También puede{" "}
              <Link href="/recursos" style={{ color: "#0084FF" }}>
                explorar recursos
              </Link>
              .
            </p>
          </div>
        </div>
      </AiorSection>
      <AiorCtaBand
        title="Hablemos de su operación"
        body="Evaluamos alcance, integraciones y plan adecuado sin compromisos genéricos."
        primaryCta={{ label: "Contactar", href: "/contacto" }}
        secondaryCta={{ label: "Ver precios", href: "/precios" }}
      />
    </>
  );
}
