// Enlace que usa `<a>` para las rutas servidas por el pack estatico y
// `next/link` para el resto. Ver EnlacePublico.tsx.
import { EnlacePublico as Link } from "@/features/public-web/components/EnlacePublico";

import { getModule, saasModules } from "../content/catalog";
import { SLUG_TO_SHOT, shotForMock, type SaasShotId } from "../content/saasShots";
import { BrandAsideNext, BrandCheckList, BrandFeatureGrid, BrandProcess, BrandRelated, BrandSection, BrandShot, BrandTitle } from "./BrandBlocks";
import { BrandCtaBand, BrandPageHero } from "./BrandPageHero";
import { BrandFaq } from "./BrandFaq";

export function ModuleDetailPage({ slug }: { slug: string }) {
  const mod = getModule(slug);
  if (!mod) return null;

  const related = saasModules.filter((m) => mod.related.includes(m.id) || mod.related.includes(m.slug));
  const primaryShot: SaasShotId | null = SLUG_TO_SHOT[mod.slug] ?? shotForMock(mod.mockVariant);
  const statusLabel = mod.status.replace("_", " ");

  return (
    <>
      <BrandPageHero
        eyebrow={mod.hero.eyebrow || "Módulo SaaS"}
        title={mod.hero.title}
        description={mod.hero.body}
        primaryCta={{ label: "Solicitar demo", href: "/contacto" }}
        secondaryCta={{ label: "Todos los módulos", href: "/producto" }}
        imageSrc={primaryShot ? `/brand/public/saas-shots/${primaryShot}.webp` : undefined}
        imageAlt={`${mod.name} · SaaS NELVYON`}
      />

      <BrandSection soft>
        <BrandTitle
          eyebrow="En el producto"
          title={`${mod.name} forma parte del SaaS NELVYON`}
          description={
            mod.productPath
              ? `Ruta operativa: ${mod.productPath}. Estado: ${statusLabel}.`
              : `Estado: ${statusLabel}.`
          }
        />
        <BrandFeatureGrid items={mod.benefits} />
      </BrandSection>

      {primaryShot ? (
        <BrandSection>
          <div className="row align-items-center gy-4">
            <div className="col-lg-6">
              <BrandTitle
                eyebrow="Capturas"
                title="Cómo se ve en el panel"
                description="Capturas reales del SaaS (tenant demo Aether Labs). Sin PII de clientes."
              />
            </div>
            <div className="col-lg-6">
              <BrandShot id={primaryShot} alt={mod.name} />
            </div>
          </div>
        </BrandSection>
      ) : null}

      <BrandSection soft>
        <BrandTitle eyebrow="Funcionalidades" title="Capacidades en detalle" />
        <BrandFeatureGrid items={mod.features} />
      </BrandSection>

      <BrandSection>
        <BrandTitle eyebrow="Casos de uso" title="Cómo se usa en operaciones reales" />
        <BrandFeatureGrid items={mod.useCases} />
      </BrandSection>

      {mod.comparisonPoints?.length ? (
        <BrandSection soft>
          <BrandTitle eyebrow="Comparativa" title="Stack fragmentado vs NELVYON" />
          <div className="row gy-4">
            <div className="col-md-6">
              <div style={{ padding: 28, borderRadius: 16, border: "1px solid #E0E0E0", background: "#fff", height: "100%" }}>
                <h3 className="h6">Herramientas sueltas</h3>
                <BrandCheckList items={["Datos en silos", "Pegamentos frágiles", "Difícil de auditar"]} />
              </div>
            </div>
            <div className="col-md-6">
              <div style={{ padding: 28, borderRadius: 16, border: "2px solid #0084FF", background: "#fff", height: "100%" }}>
                <h3 className="h6">NELVYON</h3>
                <BrandCheckList
                  items={[
                    mod.comparisonPoints[0] || "Contexto unificado",
                    mod.comparisonPoints[1] || "Mismo tenant y permisos",
                    "RBAC, estados y trazabilidad",
                  ]}
                />
              </div>
            </div>
          </div>
        </BrandSection>
      ) : null}

      <BrandSection>
        <BrandTitle eyebrow="Adopción" title="Cómo se activa" />
        <BrandProcess
          steps={[
            { title: "Demo", body: "Recorrido del módulo en tenant de evaluación." },
            { title: "Alcance", body: "Plan SaaS y permisos necesarios." },
            { title: "Onboarding", body: "Importación y configuración inicial." },
            { title: "Operación", body: "Equipo trabajando con datos reales." },
          ]}
        />
      </BrandSection>

      <BrandSection soft>
        <div className="row gy-4">
          <div className="col-lg-7">
            <BrandTitle eyebrow={`FAQ · ${mod.name}`} title="Preguntas específicas" />
            <BrandFaq items={[...mod.faqs]} />
          </div>
          <div className="col-lg-5">
            <BrandAsideNext
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
      </BrandSection>

      <BrandRelated
        title="Módulos relacionados"
        items={related.map((m) => ({ label: m.name, href: `/producto/${m.slug}`, body: m.short }))}
      />

      <BrandCtaBand
        title={`Demo del módulo ${mod.name}`}
        body="Recorremos el flujo real en un tenant de evaluación."
        primaryCta={{ label: "Solicitar demo", href: "/contacto" }}
        secondaryCta={{ label: "Precios SaaS", href: "/precios#saas" }}
      />
    </>
  );
}
