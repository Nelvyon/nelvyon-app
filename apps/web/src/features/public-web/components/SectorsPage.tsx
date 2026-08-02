import { sectorsCatalog } from "../content/catalog";
import { libraryPhoto } from "../content/visualLibrary";
import { AiorCardLink, AiorSection, AiorTitle } from "./AiorBlocks";
import { AiorCtaBand, AiorPageHero } from "./AiorPageHero";

export function SectorsPage() {
  return (
    <>
      <AiorPageHero
        eyebrow="Sectores"
        title="NELVYON adaptado a su industria"
        description="Negocios locales, ecommerce, SaaS B2B, servicios profesionales, salud y enterprise — cada sector tiene retos, módulos y servicios recomendados documentados."
        primaryCta={{ label: "Solicitar demo", href: "/contacto" }}
        secondaryCta={{ label: "Casos de uso", href: "/casos-de-uso" }}
        imageSrc={libraryPhoto("F-02")}
        imageAlt="Sectores NELVYON"
      />

      <AiorSection>
        <AiorTitle
          eyebrow="Explore por sector"
          title="Seleccione su perfil"
          description="Cada tarjeta enlaza a la página profunda con retos, resultados, módulos SaaS y servicios de agencia."
          center
        />
        <div className="row gy-4">
          {sectorsCatalog.map((sector) => (
            <div key={sector.id} className="col-md-6 col-xl-4">
              <AiorCardLink
                href={`/sectores/${sector.slug}`}
                title={sector.name}
                body={sector.short}
                image={sector.image}
                meta={sector.outcomes[0]}
              />
            </div>
          ))}
        </div>
      </AiorSection>

      <AiorCtaBand
        title="¿Su sector requiere un diseño específico?"
        body="Definimos flujos, integraciones y packs según su modelo de negocio."
        primaryCta={{ label: "Solicitar demo", href: "/contacto" }}
        secondaryCta={{ label: "Ver SaaS", href: "/producto" }}
      />
    </>
  );
}
