import Link from "next/link";

import {
  agencyServices,
  getAgencyService,
  getAgencyServiceByHref,
  saasModules,
} from "../content/catalog";
import { saasShotSrc } from "../content/saasShots";
import {
  BrandAsideNext,
  BrandCheckList,
  BrandFeatureGrid,
  BrandProcess,
  BrandRelated,
  BrandSection,
  BrandTitle,
} from "./BrandBlocks";
import { BrandCtaBand, BrandPageHero } from "./BrandPageHero";
import { BrandFaq } from "./BrandFaq";

export function ServiceDetailPage({ slugOrHref }: { slugOrHref: string }) {
  const svc =
    getAgencyService(slugOrHref) ??
    getAgencyServiceByHref(slugOrHref.startsWith("/") ? slugOrHref : `/${slugOrHref}`);
  if (!svc) return null;

  const relatedFinal = agencyServices
    .filter((s) => s.id !== svc.id && (svc.relatedServices.includes(s.id) || svc.relatedServices.includes(s.slug)))
    .slice(0, 4);
  const related =
    relatedFinal.length > 0 ? relatedFinal : agencyServices.filter((s) => s.id !== svc.id).slice(0, 4);

  return (
    <>
      <BrandPageHero
        eyebrow="Agencia NELVYON"
        title={svc.name}
        description={`${svc.short} Problema: ${svc.problem} Enfoque: ${svc.solution}`}
        primaryCta={{ label: "Pedir presupuesto", href: `/contacto?tipo=agencia&servicio=${svc.id}` }}
        secondaryCta={{ label: "Todos los servicios", href: "/agencia" }}
        imageSrc={svc.image?.endsWith(".webp") || svc.image?.includes("saas-shots") ? svc.image : saasShotSrc("agentes")}
        imageAlt={svc.name}
      />

      <BrandSection soft>
        <div className="row gy-4">
          <div className="col-lg-6">
            <BrandTitle eyebrow="Problema" title="Qué resolvemos" description={svc.problem} />
          </div>
          <div className="col-lg-6">
            <BrandTitle eyebrow="Enfoque" title="Cómo lo resolvemos" description={svc.solution} />
          </div>
        </div>
      </BrandSection>

      <BrandSection>
        <BrandTitle eyebrow="Beneficios" title="Por qué equipos eligen este servicio" />
        <BrandFeatureGrid items={svc.benefits} />
      </BrandSection>

      <BrandSection soft>
        <BrandTitle eyebrow="Entregables" title="Qué recibe su organización" />
        <BrandCheckList items={svc.deliverables} />
      </BrandSection>

      <BrandSection>
        <BrandTitle
          eyebrow="Proceso"
          title="Cómo trabajamos"
          description="Fases claras, exclusiones explícitas y handoff documentado."
        />
        <BrandProcess steps={svc.process} />
      </BrandSection>

      <BrandSection soft>
        <div className="row gy-4">
          <div className="col-lg-7">
            <BrandTitle eyebrow={`FAQ · ${svc.name}`} title="Preguntas frecuentes" />
            <BrandFaq items={[...svc.faqs]} />
          </div>
          <div className="col-lg-5">
            <BrandAsideNext
              title="SaaS + Agencia"
              body="Si el servicio requiere el motor software, cotizamos la licencia SaaS en línea separada."
              primaryCta={{ label: "Pedir presupuesto", href: `/contacto?tipo=agencia&servicio=${svc.id}` }}
              secondaryCta={{ label: "Precios agencia", href: "/precios#agencia" }}
            />
            <ul className="mt-3" style={{ fontSize: 14, color: "#484848", paddingLeft: 0, listStyle: "none" }}>
              {saasModules.slice(0, 5).map((m) => (
                <li key={m.id} className="mb-2">
                  <Link href={`/producto/${m.slug}`} style={{ color: "#0084FF" }}>
                    {m.name}
                  </Link>
                  {" — "}
                  {m.short}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </BrandSection>

      <BrandRelated
        title="Otros servicios de agencia"
        items={related.map((s) => ({ label: s.name, href: s.href, body: s.short }))}
      />

      <BrandCtaBand
        title={`Presupuesto para ${svc.name}`}
        body="Los servicios de agencia se cotizan a medida. El SaaS, si aplica, se factura aparte."
        primaryCta={{ label: "Pedir presupuesto", href: `/contacto?tipo=agencia&servicio=${svc.id}` }}
        secondaryCta={{ label: "Ver SaaS", href: "/producto" }}
      />
    </>
  );
}
