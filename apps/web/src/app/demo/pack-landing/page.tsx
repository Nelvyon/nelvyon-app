import Link from "next/link";

import { getPackFeaturedPreset } from "@/lib/packs/packEliteTemplates";
import { LOCAL_GROWTH_PACK_ID, SAAS_B2B_GROWTH_PACK_ID } from "@/lib/packs/types";

const DEMOS = [
  {
    id: "local-restaurant-demo",
    pack_id: LOCAL_GROWTH_PACK_ID,
    label: "Restaurante La Plaza",
    sector: "restaurant",
    description: "Pack Crecimiento Local — landing basada en plantilla Envato de hostelería, personalizada con logo, colores y textos del cliente.",
  },
  {
    id: "saas-flowmetrics-demo",
    pack_id: SAAS_B2B_GROWTH_PACK_ID,
    label: "FlowMetrics",
    sector: "saas_b2b",
    description: "Pack SaaS B2B — landing basada en plantilla Aceternity/SaaS, personalizada con ICP, CTA y propuesta de valor.",
  },
] as const;

export default function PackLandingDemoIndexPage() {
  const localPreset = getPackFeaturedPreset(LOCAL_GROWTH_PACK_ID);
  const saasPreset = getPackFeaturedPreset(SAAS_B2B_GROWTH_PACK_ID);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 960, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <h1 style={{ fontSize: "1.75rem", marginBottom: ".5rem" }}>Demo — Landings desde biblioteca de plantillas</h1>
      <p style={{ color: "#64748b", marginBottom: "2rem" }}>
        Nelvyon OS elige la mejor plantilla base de <code>templates/seeds/</code> y solo personaliza contenidos
        (logo, colores, textos, datos). El diseño estructural viene de la plantilla real.
      </p>

      <div style={{ display: "grid", gap: "1.5rem" }}>
        {DEMOS.map((demo) => (
          <article
            key={demo.id}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: "1rem",
              overflow: "hidden",
              background: "#fff",
            }}
          >
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0" }}>
              <h2 style={{ fontSize: "1.15rem", margin: 0 }}>{demo.label}</h2>
              <p style={{ color: "#64748b", fontSize: ".9rem", margin: ".35rem 0 0" }}>{demo.description}</p>
              <p style={{ fontSize: ".85rem", margin: ".75rem 0 0" }}>
                Pack: <strong>{demo.pack_id}</strong> · Sector: <strong>{demo.sector}</strong>
              </p>
            </div>
            <iframe
              title={`Landing demo ${demo.label}`}
              src={`/api/demo/pack-landing/${demo.id}`}
              style={{ width: "100%", height: 520, border: 0, display: "block" }}
            />
            <div style={{ padding: "1rem 1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: ".9rem" }}>
              <Link href={`/api/demo/pack-landing/${demo.id}`} target="_blank" rel="noopener">
                Abrir landing completa ↗
              </Link>
              <Link href={`/api/demo/pack-landing/${demo.id}?format=json`} target="_blank" rel="noopener">
                Ver provenance JSON (plantilla usada)
              </Link>
            </div>
          </article>
        ))}
      </div>

      <section style={{ marginTop: "2.5rem", padding: "1.25rem", background: "#f8fafc", borderRadius: ".75rem" }}>
        <h3 style={{ marginTop: 0 }}>Presets de referencia</h3>
        <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#475569" }}>
          <li>
            Local: {localPreset.label} — {String(localPreset.intake.business_name)} ({String(localPreset.intake.city ?? "")})
          </li>
          <li>
            SaaS: {saasPreset.label} — {String(saasPreset.intake.business_name)} ({String(saasPreset.intake.city ?? "")})
          </li>
        </ul>
        <p style={{ fontSize: ".85rem", color: "#64748b", marginBottom: 0 }}>
          Documentación: <code>docs/templates/BIBLIOTECA_LOCAL_Y_FLUJO_PERSONALIZACION.md</code>
        </p>
      </section>
    </main>
  );
}
