import Link from "next/link";

import {
  agencyServices,
  getAgencyService,
  getAgencyServiceByHref,
  saasModules,
} from "../content/catalog";
import { saasShotSrc } from "../content/saasShots";
import {
  AiorAsideNext,
  AiorCheckList,
  AiorFeatureGrid,
  AiorProcess,
  AiorRelated,
  AiorSection,
  AiorTitle,
} from "./AiorBlocks";
import { AiorCtaBand, AiorPageHero } from "./AiorPageHero";
import { AiorFaq } from "./AiorFaq";

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
      <AiorPageHero
        eyebrow="Agencia NELVYON"
        title={svc.name}
        description={`${svc.short} Problema: ${svc.problem} Enfoque: ${svc.solution}`}
        primaryCta={{ label: "Pedir presupuesto", href: `/contacto?tipo=agencia&servicio=${svc.id}` }}
        secondaryCta={{ label: "Todos los servicios", href: "/agencia" }}
        imageSrc={svc.image?.endsWith(".webp") || svc.image?.includes("saas-shots") ? svc.image : saasShotSrc("agentes")}
        imageAlt={svc.name}
      />

      <AiorSection soft>
        <div className="row gy-4">
          <div className="col-lg-6">
            <AiorTitle eyebrow="Problema" title="Qué resolvemos" description={svc.problem} />
          </div>
          <div className="col-lg-6">
            <AiorTitle eyebrow="Enfoque" title="Cómo lo resolvemos" description={svc.solution} />
          </div>
        </div>
      </AiorSection>

      <AiorSection>
        <AiorTitle eyebrow="Beneficios" title="Por qué equipos eligen este servicio" />
        <AiorFeatureGrid items={svc.benefits} />
      </AiorSection>

      <AiorSection soft>
        <AiorTitle eyebrow="Entregables" title="Qué recibe su organización" />
        <AiorCheckList items={svc.deliverables} />
      </AiorSection>

      <AiorSection>
        <AiorTitle
          eyebrow="Proceso"
          title="Cómo trabajamos"
          description="Fases claras, exclusiones explícitas y handoff documentado."
        />
        <AiorProcess steps={svc.process} />
      </AiorSection>

      <AiorSection soft>
        <div className="row gy-4">
          <div className="col-lg-7">
            <AiorTitle eyebrow={`FAQ · ${svc.name}`} title="Preguntas frecuentes" />
            <AiorFaq items={[...svc.faqs]} />
          </div>
          <div className="col-lg-5">
            <AiorAsideNext
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
      </AiorSection>

      <AiorRelated
        title="Otros servicios de agencia"
        items={related.map((s) => ({ label: s.name, href: s.href, body: s.short }))}
      />

      <AiorCtaBand
        title={`Presupuesto para ${svc.name}`}
        body="Los servicios de agencia se cotizan a medida. El SaaS, si aplica, se factura aparte."
        primaryCta={{ label: "Pedir presupuesto", href: `/contacto?tipo=agencia&servicio=${svc.id}` }}
        secondaryCta={{ label: "Ver SaaS", href: "/producto" }}
      />
    </>
  );
}
