import { getUseCase, useCasesCatalog } from "../content/catalog";
import { AiorFeatureGrid, AiorRelated, AiorSection, AiorTitle } from "./AiorBlocks";
import { AiorCtaBand, AiorPageHero } from "./AiorPageHero";

export function UseCaseDetailPage({ slug }: { slug: string }) {
  const useCase = getUseCase(slug);
  if (!useCase) return null;

  const related = useCasesCatalog.filter((u) => u.id !== useCase.id).slice(0, 3);

  return (
    <>
      <AiorPageHero
        eyebrow="Caso de uso"
        title={useCase.name}
        description={`${useCase.short} Audiencia: ${useCase.audience}.`}
        primaryCta={{ label: "Solicitar diagnóstico", href: "/contacto" }}
        secondaryCta={{ label: "Todos los casos", href: "/casos-de-uso" }}
        imageSrc={useCase.image}
        imageAlt={useCase.name}
      />

      <AiorSection soft>
        <div className="row gy-4">
          {useCase.metrics.map((m) => (
            <div key={m.label} className="col-md-6">
              <div
                style={{
                  padding: 28,
                  borderRadius: 16,
                  border: "1px solid #E0E0E0",
                  background: "#fff",
                  height: "100%",
                }}
              >
                <div className="h2" style={{ color: "#0084FF", marginBottom: 8 }}>
                  {m.value}
                </div>
                <h3 className="h6 mb-0">{m.label}</h3>
              </div>
            </div>
          ))}
        </div>
      </AiorSection>

      {useCase.story.map((block, idx) => (
        <AiorSection key={block.title} soft={idx % 2 === 1}>
          <AiorTitle eyebrow={block.eyebrow || `Paso ${idx + 1}`} title={block.title} description={block.body} />
          {block.bullets?.length ? (
            <ul className="hero-list" style={{ textAlign: "left" }}>
              {block.bullets.map((b) => (
                <li key={b}>
                  <i className="fa-sharp fa-solid fa-circle-check" aria-hidden /> {b}
                </li>
              ))}
            </ul>
          ) : null}
        </AiorSection>
      ))}

      <AiorSection>
        <AiorTitle
          eyebrow="Nota metodológica"
          title="Perfil tipificado, no testimonio inventado"
          description="Este caso describe capacidades y enfoques reales de NELVYON. No incluye métricas de clientes con nombre ficticio ni promesas de ROI garantizado."
        />
        <AiorFeatureGrid
          items={[
            {
              title: "Honestidad operativa",
              body: "Documentamos qué está activo en producción y qué requiere configuración adicional.",
            },
            {
              title: "Adaptación en discovery",
              body: "Cada organización tiene matices; validamos alcance antes de comprometer entregables.",
            },
            {
              title: "SaaS + Agencia",
              body: "El software se licencia; los servicios de ejecución se presupuestan aparte cuando aplican.",
            },
          ]}
        />
      </AiorSection>

      <AiorRelated
        title="Otros casos de uso"
        items={related.map((u) => ({ label: u.name, href: `/casos-de-uso/${u.slug}`, body: u.short }))}
      />

      <AiorCtaBand
        title="Aplicar este caso a su operación"
        body="Perfil tipificado — adaptamos módulos, servicios e integraciones en discovery."
        primaryCta={{ label: "Contactar", href: "/contacto" }}
        secondaryCta={{ label: "Ver sectores", href: "/sectores" }}
      />
    </>
  );
}
