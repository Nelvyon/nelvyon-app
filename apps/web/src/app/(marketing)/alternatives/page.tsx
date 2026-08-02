import type { Metadata } from "next";

import { BrandCheck } from "@/features/public-web/components/BrandCheck";
import { BrandSection, BrandTitle } from "@/features/public-web/components/BrandBlocks";
import { BrandCtaBand, BrandPageHero } from "@/features/public-web/components/BrandPageHero";

export const metadata: Metadata = {
  title: { absolute: "NELVYON vs alternativas | NELVYON" },
  description:
    "Compare NELVYON con agencias tradicionales y suites fragmentadas: SaaS B2B real + agencia IA, con precios honestos.",
  alternates: { canonical: "/alternatives" },
};

const COMPARISONS = [
  {
    competitor: "Agencia de marketing tradicional",
    them: [
      "Presupuesto opaco o paquetes genéricos",
      "Herramientas ajenas sin gobierno unificado",
      "Poca trazabilidad de ejecución",
      "Facturación mezclada con herramientas",
    ],
    us: [
      "Presupuesto de agencia a medida y separado del SaaS",
      "CRM, campañas y workflows en el mismo tenant",
      "Packs OS con QA y portal de aprobación",
      "Planes SaaS claros: €97 / €297 / €797",
    ],
  },
  {
    competitor: "Herramientas solo de copy / chat IA",
    them: [
      "Generación de texto sin operación comercial",
      "Sin CRM ni campañas de producción",
      "Sin workflows con idempotencia",
      "Sin packs de marketing orquestados",
    ],
    us: [
      "IA acoplada a CRM, workflows y packs",
      "Email con AWS SES cuando está configurado",
      "Gobierno: canary kill y spend off hasta autorización",
      "Producto multi-tenant con RBAC",
    ],
  },
  {
    competitor: "Suite CRM / marketing fragmentada",
    them: [
      "Varios productos y contratos",
      "Integraciones frágiles entre silos",
      "Coste creciente por módulo",
      "Onboarding complejo",
    ],
    us: [
      "Un SaaS operativo para marketing y ventas",
      "Integraciones con estado documentado",
      "Planes Starter, Growth y Elite",
      "Demo con producto real, no mock genérico",
    ],
  },
] as const;

export default function AlternativesPage() {
  return (
    <>
      <BrandPageHero
        eyebrow="Comparativa"
        title="NELVYON frente a stacks fragmentados"
        description="Comparación cualitativa honesta: sin inventar precios de terceros ni afirmar superioridad con métricas no verificadas. Precios SaaS NELVYON: Starter €97, Growth €297, Elite €797."
        primaryCta={{ label: "Solicitar demo", href: "/contacto" }}
        secondaryCta={{ label: "Ver precios", href: "/precios" }}
      />

      {COMPARISONS.map((row, idx) => (
        <BrandSection key={row.competitor} soft={idx % 2 === 1}>
          <BrandTitle eyebrow="Comparativa" title={row.competitor} />
          <div className="row gy-4">
            <div className="col-md-6">
              <div style={{ padding: 28, borderRadius: 16, border: "1px solid #E0E0E0", background: "#fff", height: "100%" }}>
                <h3 className="h6">Enfoque típico</h3>
                <ul className="hero-list" style={{ textAlign: "left" }}>
                  {row.them.map((t) => (
                    <li key={t}>
                      <span className="nv-dot" aria-hidden /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="col-md-6">
              <div style={{ padding: 28, borderRadius: 16, border: "2px solid #0084FF", background: "#fff", height: "100%" }}>
                <h3 className="h6">NELVYON</h3>
                <ul className="hero-list" style={{ textAlign: "left" }}>
                  {row.us.map((t) => (
                    <li key={t}>
                      <BrandCheck /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </BrandSection>
      ))}

      <BrandCtaBand
        title="Evalúe NELVYON con su operación real"
        body="Demo del SaaS y, si aplica, presupuesto de agencia — sin cifras de clientes inventadas."
        primaryCta={{ label: "Contactar", href: "/contacto" }}
        secondaryCta={{ label: "Ver producto", href: "/producto" }}
      />
    </>
  );
}
