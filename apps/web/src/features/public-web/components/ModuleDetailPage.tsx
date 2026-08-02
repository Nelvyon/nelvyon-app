import Link from "next/link";

import { getModule, saasModules } from "../content/catalog";
import { SLUG_TO_SHOT, shotForMock, type SaasShotId } from "../content/saasShots";
import { AiorAsideNext, AiorCheckList, AiorFeatureGrid, AiorProcess, AiorRelated, AiorSection, AiorShot, AiorTitle } from "./AiorBlocks";
import { AiorCtaBand, AiorPageHero } from "./AiorPageHero";
import { AiorFaq } from "./AiorFaq";

export function ModuleDetailPage({ slug }: { slug: string }) {
  const mod = getModule(slug);
  if (!mod) return null;

  const related = saasModules.filter((m) => mod.related.includes(m.id) || mod.related.includes(m.slug));
  const primaryShot: SaasShotId | null = SLUG_TO_SHOT[mod.slug] ?? shotForMock(mod.mockVariant);
  const statusLabel = mod.status.replace("_", " ");

  return (
    <>
      <AiorPageHero
        eyebrow={mod.hero.eyebrow || "Módulo SaaS"}
        title={mod.hero.title}
        description={mod.hero.body}
        primaryCta={{ label: "Solicitar demo", href: "/contacto" }}
        secondaryCta={{ label: "Todos los módulos", href: "/producto" }}
        imageSrc={primaryShot ? `/brand/public/saas-shots/${primaryShot}.webp` : undefined}
        imageAlt={`${mod.name} · SaaS NELVYON`}
      />

      <AiorSection soft>
        <AiorTitle
          eyebrow="En el producto"
          title={`${mod.name} forma parte del SaaS NELVYON`}
          description={
            mod.productPath
              ? `Ruta operativa: ${mod.productPath}. Estado: ${statusLabel}.`
              : `Estado: ${statusLabel}.`
          }
        />
        <AiorFeatureGrid items={mod.benefits} />
      </AiorSection>

      {primaryShot ? (
        <AiorSection>
          <div className="row align-items-center gy-4">
            <div className="col-lg-6">
              <AiorTitle
                eyebrow="Capturas"
                title="Cómo se ve en el panel"
                description="Capturas reales del SaaS (tenant demo Aether Labs). Sin PII de clientes."
              />
            </div>
            <div className="col-lg-6">
              <AiorShot id={primaryShot} alt={mod.name} />
            </div>
          </div>
        </AiorSection>
      ) : null}

      <AiorSection soft>
        <AiorTitle eyebrow="Funcionalidades" title="Capacidades en detalle" />
        <AiorFeatureGrid items={mod.features} />
      </AiorSection>

      <AiorSection>
        <AiorTitle eyebrow="Casos de uso" title="Cómo se usa en operaciones reales" />
        <AiorFeatureGrid items={mod.useCases} />
      </AiorSection>

      {mod.comparisonPoints?.length ? (
        <AiorSection soft>
          <AiorTitle eyebrow="Comparativa" title="Stack fragmentado vs NELVYON" />
          <div className="row gy-4">
            <div className="col-md-6">
              <div style={{ padding: 28, borderRadius: 16, border: "1px solid #E0E0E0", background: "#fff", height: "100%" }}>
                <h3 className="h6">Herramientas sueltas</h3>
                <AiorCheckList items={["Datos en silos", "Pegamentos frágiles", "Difícil de auditar"]} />
              </div>
            </div>
            <div className="col-md-6">
              <div style={{ padding: 28, borderRadius: 16, border: "2px solid #0084FF", background: "#fff", height: "100%" }}>
                <h3 className="h6">NELVYON</h3>
                <AiorCheckList
                  items={[
                    mod.comparisonPoints[0] || "Contexto unificado",
                    mod.comparisonPoints[1] || "Mismo tenant y permisos",
                    "RBAC, estados y trazabilidad",
                  ]}
                />
              </div>
            </div>
          </div>
        </AiorSection>
      ) : null}

      <AiorSection>
        <AiorTitle eyebrow="Adopción" title="Cómo se activa" />
        <AiorProcess
          steps={[
            { title: "Demo", body: "Recorrido del módulo en tenant de evaluación." },
            { title: "Alcance", body: "Plan SaaS y permisos necesarios." },
            { title: "Onboarding", body: "Importación y configuración inicial." },
            { title: "Operación", body: "Equipo trabajando con datos reales." },
          ]}
        />
      </AiorSection>

      <AiorSection soft>
        <div className="row gy-4">
          <div className="col-lg-7">
            <AiorTitle eyebrow={`FAQ · ${mod.name}`} title="Preguntas específicas" />
            <AiorFaq items={[...mod.faqs]} />
          </div>
          <div className="col-lg-5">
            <AiorAsideNext
              body="Active el módulo en un plan SaaS o combínelo con servicios de agencia (presupuesto aparte)."
              primaryCta={{ label: "Ver precios SaaS", href: "/precios#saas" }}
              secondaryCta={{ label: "Hablar con ventas", href: "/contacto" }}
            />
            {mod.productPath ? (
              <p className="mt-3" style={{ fontSize: 14, color: "#484848" }}>
                Acceso autenticado:{" "}
                <Link href={mod.productPath} style={{ color: "#0084FF" }}>
                  {mod.productPath}
                </Link>
              </p>
            ) : null}
          </div>
        </div>
      </AiorSection>

      <AiorRelated
        title="Módulos relacionados"
        items={related.map((m) => ({ label: m.name, href: `/producto/${m.slug}`, body: m.short }))}
      />

      <AiorCtaBand
        title={`Demo del módulo ${mod.name}`}
        body="Recorremos el flujo real en un tenant de evaluación."
        primaryCta={{ label: "Solicitar demo", href: "/contacto" }}
        secondaryCta={{ label: "Precios SaaS", href: "/precios#saas" }}
      />
    </>
  );
}
