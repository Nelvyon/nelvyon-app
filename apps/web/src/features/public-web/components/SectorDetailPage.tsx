import {
  agencyServices,
  getSector,
  saasModules,
  sectorsCatalog,
} from "../content/catalog";
import {
  AiorCheckList,
  AiorFeatureGrid,
  AiorRelated,
  AiorSection,
  AiorTitle,
} from "./AiorBlocks";
import { AiorCtaBand, AiorPageHero } from "./AiorPageHero";
import { AiorFaq } from "./AiorFaq";

export function SectorDetailPage({ slug }: { slug: string }) {
  const sector = getSector(slug);
  if (!sector) return null;

  const relatedSectors = sectorsCatalog.filter((s) => s.id !== sector.id).slice(0, 3);
  const linkedModules = saasModules.filter((m) => sector.modules.includes(m.id));
  const linkedServices = agencyServices.filter((s) => sector.services.includes(s.id));

  return (
    <>
      <AiorPageHero
        eyebrow="Sector"
        title={sector.name}
        description={sector.short}
        primaryCta={{ label: "Solicitar demo", href: "/contacto" }}
        secondaryCta={{ label: "Todos los sectores", href: "/sectores" }}
        imageSrc={sector.image}
        imageAlt={sector.name}
      />

      <AiorSection soft>
        <div className="row gy-4">
          <div className="col-lg-6">
            <AiorTitle eyebrow="Retos" title="Qué suele frenar el crecimiento" />
            <AiorCheckList items={sector.challenges} />
          </div>
          <div className="col-lg-6">
            <AiorTitle eyebrow="Resultados" title="Qué buscamos lograr" />
            <AiorCheckList items={sector.outcomes} />
          </div>
        </div>
      </AiorSection>

      <AiorSection>
        <AiorTitle
          eyebrow="Stack recomendado"
          title="Módulos SaaS y servicios de agencia"
          description="El software se licencia; la agencia se presupuesta aparte."
        />
        <AiorFeatureGrid
          items={[
            ...linkedModules.map((m) => ({ title: `SaaS · ${m.name}`, body: m.short })),
            ...linkedServices.map((s) => ({ title: `Agencia · ${s.name}`, body: s.short })),
          ]}
        />
      </AiorSection>

      <AiorSection soft>
        <AiorTitle eyebrow={`FAQ · ${sector.name}`} title="Preguntas del sector" />
        <AiorFaq items={[...sector.faqs]} />
      </AiorSection>

      <AiorRelated
        title="Otros sectores"
        items={relatedSectors.map((s) => ({ label: s.name, href: `/sectores/${s.slug}`, body: s.short }))}
      />

      <AiorCtaBand
        title={`NELVYON para ${sector.name}`}
        body="Definimos módulos SaaS, servicios de agencia e integraciones según su sector."
        primaryCta={{ label: "Solicitar demo", href: "/contacto" }}
        secondaryCta={{ label: "Ver precios", href: "/precios" }}
      />
    </>
  );
}
