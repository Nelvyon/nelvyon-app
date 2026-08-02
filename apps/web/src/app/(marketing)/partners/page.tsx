"use client";

import { useMemo, useState } from "react";

import { BrandFeatureGrid, BrandSection, BrandTitle } from "@/features/public-web/components/BrandBlocks";
import { BrandCtaBand, BrandPageHero } from "@/features/public-web/components/BrandPageHero";

export default function PartnersPage() {
  const [clients, setClients] = useState("10");
  const commission = useMemo(() => {
    const n = Number(clients);
    if (!Number.isFinite(n) || n < 0) return 0;
    // Estimación ilustrativa sobre plan Starter (€97) al 30% — no es compromiso contractual.
    return n * 97 * 0.3;
  }, [clients]);

  return (
    <>
      <BrandPageHero
        eyebrow="Partners"
        title="Programa de partners NELVYON"
        description="Refiera el SaaS NELVYON a empresas de su red. Comisión recurrente orientativa sobre el plan Starter; condiciones finales en acuerdo partner."
        primaryCta={{ label: "Solicitar alta partner", href: "/contacto?tipo=partner" }}
        secondaryCta={{ label: "Ver precios SaaS", href: "/precios#saas" }}
      />

      <BrandSection soft>
        <BrandTitle eyebrow="Cómo funciona" title="Tres pasos" center />
        <BrandFeatureGrid
          items={[
            { title: "1. Regístrese", body: "Solicite alta partner y revise condiciones comerciales." },
            { title: "2. Comparta su enlace", body: "Referral link único para empresas y agencias de su red." },
            { title: "3. Comisión recurrente", body: "Liquidación según acuerdo mientras los referidos permanezcan activos." },
          ]}
        />
      </BrandSection>

      <BrandSection>
        <BrandTitle eyebrow="Beneficios" title="Qué incluye el programa" />
        <BrandFeatureGrid
          items={[
            { title: "Comisión recurrente", body: "Ingresos alineados a la permanencia del cliente referido." },
            { title: "Visibilidad en SaaS", body: "Seguimiento de leads y referidos desde el producto cuando el programa está activo." },
            { title: "Pagos mensuales", body: "Liquidación periódica según el acuerdo partner firmado." },
          ]}
        />
      </BrandSection>

      <BrandSection soft>
        <BrandTitle
          eyebrow="Estimación"
          title="Calculadora ilustrativa"
          description="Ejemplo sobre plan Starter (€97/mes) al 30%. No sustituye el acuerdo comercial."
        />
        <div style={{ maxWidth: 420, margin: "0 auto", padding: 28, borderRadius: 16, border: "1px solid #E0E0E0", background: "#fff" }}>
          <label htmlFor="clients" className="d-block mb-2">
            Número de clientes referidos (Starter)
          </label>
          <input
            id="clients"
            type="number"
            min={0}
            value={clients}
            onChange={(e) => setClients(e.target.value)}
            className="form-control"
            style={{ maxWidth: 200, marginBottom: 16 }}
          />
          <p className="mb-0">
            Comisión mensual estimada: <strong style={{ color: "#0084FF" }}>€{commission.toFixed(2)}</strong>
          </p>
        </div>
      </BrandSection>

      <BrandCtaBand
        title="Conviértase en partner NELVYON"
        body="Le enviamos condiciones reales del programa — sin promesas de volumen inventadas."
        primaryCta={{ label: "Contactar", href: "/contacto?tipo=partner" }}
        secondaryCta={{ label: "Ver SaaS", href: "/producto" }}
      />
    </>
  );
}
