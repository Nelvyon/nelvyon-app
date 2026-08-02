import Link from "next/link";

import { saasShotSrc } from "../content/saasShots";
import { pageContent } from "../content/siteContent";
import { AiorCheckList, AiorFeatureGrid, AiorSection, AiorShot, AiorTitle } from "./AiorBlocks";
import { AiorCtaBand, AiorPageHero } from "./AiorPageHero";

const content = pageContent["automatizaciones-ia"];

export function AutomationsPage() {
  return (
    <>
      <AiorPageHero
        eyebrow={content.eyebrow}
        title={content.title}
        description={content.description}
        primaryCta={{ label: "Solicitar demo", href: "/contacto" }}
        secondaryCta={{ label: "Ver SaaS", href: "/producto" }}
        imageSrc={saasShotSrc("workflows")}
        imageAlt="Workflows SaaS NELVYON"
      />

      <AiorSection soft>
        <AiorTitle
          eyebrow="Automatización"
          title="Workflows, agentes y packs con idempotencia"
          description="Densidad de producto real: lo que el motor ejecuta en producción, sin nodos decorativos."
        />
        <AiorFeatureGrid
          items={[
            {
              title: "Workflows SaaS",
              body: "Triggers, acciones y ventanas de idempotencia para no duplicar envíos críticos.",
            },
            {
              title: "Packs OS",
              body: "Orquestación de marketing con QA y auto-aprobación condicionada.",
            },
            {
              title: "Private AI / gobierno",
              body: "Canary kill, spend off y rutas fail-closed hasta autorización explícita.",
            },
          ]}
        />
        <div className="btn-group mt-4">
          <Link href="/producto/workflows" className="th-btn2 style2">
            Ver workflows
          </Link>
          <Link href="/producto/ia" className="th-btn2 style5">
            Ver IA
          </Link>
        </div>
      </AiorSection>

      <AiorSection>
        <div className="row align-items-center gy-4">
          <div className="col-lg-6">
            <AiorTitle
              eyebrow="Motor"
              title="Automatizar sin perder el control"
              description={content.sections[0]?.body ?? content.description}
            />
            <AiorCheckList
              items={[
                "Diseño visual + clásico alineados al motor SaaS",
                "Idempotencia en acciones críticas",
                "Trazabilidad de ejecución para dirección",
              ]}
            />
          </div>
          <div className="col-lg-6">
            <AiorShot id="ai" alt="Panel IA NELVYON" />
          </div>
        </div>
      </AiorSection>

      <AiorSection soft>
        <AiorTitle eyebrow="Profundidad" title="Qué cubre esta capa" />
        <div className="row gy-4">
          {content.sections.map((section) => (
            <div key={section.heading} className="col-md-6">
              <div
                style={{
                  padding: 28,
                  borderRadius: 16,
                  border: "1px solid #E0E0E0",
                  background: "#fff",
                  height: "100%",
                }}
              >
                <h3 className="h5">{section.heading}</h3>
                <p className="mb-0">{section.body}</p>
              </div>
            </div>
          ))}
        </div>
      </AiorSection>

      <AiorCtaBand
        title="Evalúe automatización en su operación"
        body="Demo con workflows reales y criterios de gobierno — sin nodos de plantilla."
        primaryCta={{ label: "Solicitar demo", href: "/contacto" }}
        secondaryCta={{ label: "Precios SaaS", href: "/precios#saas" }}
      />
    </>
  );
}
