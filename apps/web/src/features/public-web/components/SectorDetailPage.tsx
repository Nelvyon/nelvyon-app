import {
  agencyServices,
  getSector,
  saasModules,
  sectorsCatalog,
} from "../content/catalog";
import {
  BrandCheckList,
  BrandFeatureGrid,
  BrandRelated,
  BrandSection,
  BrandTitle,
} from "./BrandBlocks";
import { BrandCtaBand, BrandPageHero } from "./BrandPageHero";
import { BrandFaq } from "./BrandFaq";

export function SectorDetailPage({ slug }: { slug: string }) {
  const sector = getSector(slug);
  if (!sector) return null;

  const relatedSectors = sectorsCatalog.filter((s) => s.id !== sector.id).slice(0, 3);
  const linkedModules = saasModules.filter((m) => sector.modules.includes(m.id));
  const linkedServices = agencyServices.filter((s) => sector.services.includes(s.id));

  return (
    <>
      <BrandPageHero
        eyebrow="Sector"
        title={sector.name}
        description={sector.short}
        primaryCta={{ label: "Solicitar demo", href: "/contacto" }}
        secondaryCta={{ label: "Todos los sectores", href: "/sectores" }}
        imageSrc={sector.image}
        imageAlt={sector.name}
      />

      <BrandSection soft>
        <div className="row gy-4">
          <div className="col-lg-6">
            <BrandTitle eyebrow="Retos" title="Qué suele frenar el crecimiento" />
            <BrandCheckList items={sector.challenges} />
          </div>
          <div className="col-lg-6">
            <BrandTitle eyebrow="Resultados" title="Qué buscamos lograr" />
            <BrandCheckList items={sector.outcomes} />
          </div>
        </div>
      </BrandSection>

      <BrandSection>
        <BrandTitle
          eyebrow="Stack recomendado"
          title="Módulos SaaS y servicios de agencia"
          description="El software se licencia; la agencia se presupuesta aparte."
        />
        <BrandFeatureGrid
          items={[
            ...linkedModules.map((m) => ({ title: `SaaS · ${m.name}`, body: m.short })),
            ...linkedServices.map((s) => ({ title: `Agencia · ${s.name}`, body: s.short })),
          ]}
        />
      </BrandSection>

      <BrandSection soft>
        <BrandTitle eyebrow={`FAQ · ${sector.name}`} title="Preguntas del sector" />
        <BrandFaq items={[...sector.faqs]} />
      </BrandSection>

      <BrandRelated
        title="Otros sectores"
        items={relatedSectors.map((s) => ({ label: s.name, href: `/sectores/${s.slug}`, body: s.short }))}
      />

      <BrandCtaBand
        title={`NELVYON para ${sector.name}`}
        body="Definimos módulos SaaS, servicios de agencia e integraciones según su sector."
        primaryCta={{ label: "Solicitar demo", href: "/contacto" }}
        secondaryCta={{ label: "Ver precios", href: "/precios" }}
      />
    </>
  );
}
