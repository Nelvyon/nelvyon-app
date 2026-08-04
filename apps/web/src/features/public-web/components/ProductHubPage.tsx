import Image from "next/image";
// Enlace que usa `<a>` para las rutas servidas por el pack estatico y
// `next/link` para el resto. Ver EnlacePublico.tsx.
import { EnlacePublico as Link } from "@/features/public-web/components/EnlacePublico";

import { saasModules } from "../content/catalog";
import { PRODUCT_HUB_SHOTS, saasShotSrc } from "../content/saasShots";
import { BrandCtaBand, BrandPageHero } from "./BrandPageHero";

export function ProductHubPage() {
  return (
    <>
      <BrandPageHero
        eyebrow="SaaS B2B NELVYON"
        title="Software operativo para marketing, ventas y automatización"
        description="CRM, pipeline, campañas, workflows, agentes IA, analytics, calendario, billing y más — multi-tenant, con autenticación real y estados honestos. Capturas del producto NELVYON, no mockups genéricos."
        primaryCta={{ label: "Solicitar demo", href: "/contacto" }}
        secondaryCta={{ label: "Precios SaaS", href: "/precios#saas" }}
        imageSrc={saasShotSrc("dashboard")}
        imageAlt="Dashboard SaaS NELVYON"
      />

      <section className="space overflow-hidden">
        <div className="container th-container5">
          <div className="title-area text-center mb-40">
            <span className="sub-title style3">[ Capturas reales ]</span>
            <h2 className="sec-title h3">El producto, no una plantilla</h2>
          </div>
          <div className="row gy-4">
            {PRODUCT_HUB_SHOTS.map((shot) => (
              <div key={shot.id} className="col-md-6 col-xl-4">
                <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid #E0E0E0", background: "#fff" }}>
                  <Image
                    src={saasShotSrc(shot.id)}
                    alt={shot.label}
                    width={640}
                    height={400}
                    className="w-100 h-auto"
                  />
                  <div style={{ padding: 16 }}>
                    <h3 className="h6 mb-0">{shot.label}</h3>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space overflow-hidden" style={{ background: "#F4F7FF" }}>
        <div className="container th-container5">
          <div className="title-area text-center mb-40">
            <span className="sub-title style3">[ Módulos ]</span>
            <h2 className="sec-title h3">Catálogo SaaS documentado</h2>
            <p>Cada módulo tiene página propia y ruta de producto cuando aplica.</p>
          </div>
          <div className="row gy-4">
            {saasModules.map((m) => (
              <div key={m.id} className="col-md-6 col-xl-3">
                <Link
                  href={`/producto/${m.slug}`}
                  className="d-block h-100"
                  style={{
                    padding: 24,
                    borderRadius: 16,
                    background: "#fff",
                    border: "1px solid #E0E0E0",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <h3 className="h6">{m.name}</h3>
                  <p className="mb-0" style={{ fontSize: 14 }}>
                    {m.short}
                  </p>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <BrandCtaBand
        title="Vea NELVYON en su contexto operativo"
        body="Demo con producto real: CRM, campañas, workflows, IA y billing según su caso."
        primaryCta={{ label: "Hablar con NELVYON", href: "/contacto" }}
        secondaryCta={{ label: "Entrar al SaaS", href: "/login" }}
      />
    </>
  );
}
