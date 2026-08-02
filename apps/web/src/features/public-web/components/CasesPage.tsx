import Link from "next/link";

import { useCasesCatalog } from "../content/catalog";
import { caseStudies } from "../content/siteContent";
import { BrandCardLink, BrandSection, BrandTitle } from "./BrandBlocks";
import { BrandCtaBand, BrandPageHero } from "./BrandPageHero";

type CasesPageProps = {
  successStoriesMode?: boolean;
};

export function CasesPage({ successStoriesMode = false }: CasesPageProps) {
  return (
    <>
      <BrandPageHero
        eyebrow={successStoriesMode ? "Casos de éxito" : "Casos de uso"}
        title={
          successStoriesMode
            ? "Perfiles de proyecto anonimizados"
            : "Cómo NELVYON resuelve operaciones reales"
        }
        description={
          successStoriesMode
            ? "Rangos de capacidad y objetivos típicos — no testimonios con nombre inventado. Para enfoques metodológicos detallados, explore /casos-de-uso."
            : "Perfiles tipificados de implementación: captación local, retención ecommerce, pipeline SaaS B2B y gobierno enterprise."
        }
        primaryCta={{ label: "Hablar de su caso", href: "/contacto" }}
        secondaryCta={{ label: "Ver sectores", href: "/sectores" }}
        imageSrc="/brand/public/saas-shots/dashboard.webp"
        imageAlt="Dashboard SaaS NELVYON"
      />

      {successStoriesMode ? (
        <BrandSection soft>
          <p className="mb-0" style={{ maxWidth: 720 }}>
            Esta página recoge perfiles anonimizados de capacidad. Para casos de uso con narrativa paso a paso,
            visite{" "}
            <Link href="/casos-de-uso" style={{ color: "#0084FF" }}>
              /casos-de-uso
            </Link>
            .
          </p>
        </BrandSection>
      ) : null}

      <BrandSection>
        <BrandTitle
          eyebrow="Casos de uso"
          title="Explore por perfil operativo"
          description="Cada caso enlaza a la página profunda con narrativa tipificada y enlaces al SaaS. Sin clientes inventados."
          center
        />
        <div className="row gy-4">
          {useCasesCatalog.map((item) => (
            <div key={item.id} className="col-md-6">
              <BrandCardLink
                href={`/casos-de-uso/${item.slug}`}
                title={item.name}
                body={item.short}
                image={item.image}
                meta={item.audience}
              />
            </div>
          ))}
        </div>
      </BrandSection>

      {successStoriesMode ? (
        <BrandSection soft>
          <BrandTitle
            eyebrow="Perfiles anonimizados"
            title="Rangos de capacidad"
            description="Las métricas describen objetivos típicos; no son testimonios de clientes con nombre inventado."
          />
          <div className="row gy-4">
            {caseStudies.map((item) => (
              <div key={item.id} className="col-lg-6">
                <article
                  style={{
                    padding: 28,
                    borderRadius: 16,
                    border: "1px solid #E0E0E0",
                    background: "#fff",
                    height: "100%",
                  }}
                >
                  <span className="sub-title style3">{item.industry}</span>
                  <h3 className="h5">{item.profileLabel}</h3>
                  <p>
                    <strong>Reto: </strong>
                    {item.challenge}
                  </p>
                  <p>
                    <strong>Enfoque: </strong>
                    {item.solution}
                  </p>
                  <ul style={{ paddingLeft: 18, color: "#484848", fontSize: 14 }}>
                    {item.resultMetrics.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                  <p style={{ fontSize: 12, color: "#6b7c93", marginBottom: 0 }}>{item.framingNote}</p>
                </article>
              </div>
            ))}
          </div>
        </BrandSection>
      ) : null}

      <BrandCtaBand
        title="Construyamos el siguiente perfil"
        body="Diagnóstico inicial, alcance claro y activación de SaaS o packs según su operación."
        primaryCta={{ label: "Contactar", href: "/contacto" }}
        secondaryCta={{ label: "Ver precios", href: "/precios" }}
      />
    </>
  );
}
