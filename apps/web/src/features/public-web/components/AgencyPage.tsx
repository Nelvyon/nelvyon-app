import Image from "next/image";
import Link from "next/link";

import { agencyServices } from "../content/catalog";
import { saasShotSrc } from "../content/saasShots";
import { BrandCheck } from "./BrandCheck";
import { BrandCtaBand, BrandPageHero } from "./BrandPageHero";

export function AgencyPage() {
  return (
    <>
      <BrandPageHero
        eyebrow="Agencia NELVYON"
        title="Marketing digital ejecutado con IA y gobierno humano"
        description="SEO, ads, branding, contenido, web, email y automatización producidos con agentes, control de calidad y portal de aprobación. El presupuesto de agencia se cotiza a medida y nunca se mezcla con el plan SaaS."
        primaryCta={{ label: "Pedir propuesta", href: "/contacto?tipo=agencia" }}
        secondaryCta={{ label: "Ver precios SaaS", href: "/precios#saas" }}
        imageSrc={saasShotSrc("agentes")}
        imageAlt="Panel de agentes IA NELVYON"
      />

      <section className="space overflow-hidden">
        <div className="container th-container5">
          <div
            style={{
              padding: 28,
              borderRadius: 16,
              border: "1px solid rgba(0,132,255,0.25)",
              background: "#F4F7FF",
            }}
          >
            <span className="sub-title style3">Separación de precios</span>
            <p className="mb-0">
              Servicios de agencia ={" "}
              <Link href="/contacto?tipo=agencia">presupuesto personalizado</Link>. Licencia SaaS = planes mensuales
              en <Link href="/precios#saas">/precios#saas</Link>. No combinamos ejecución y software en una sola línea
              opaca.
            </p>
          </div>
        </div>
      </section>

      <section className="space overflow-hidden">
        <div className="container th-container5">
          <div className="title-area text-center mb-40">
            <span className="sub-title style3">[ Catálogo ]</span>
            <h2 className="sec-title h3">Servicios de agencia</h2>
            <p>Cada servicio tiene alcance propio y se cotiza según operación, no con precios demo.</p>
          </div>
          <div className="row gy-4">
            {agencyServices.map((service) => (
              <div key={service.id} className="col-md-6 col-xl-4">
                <Link
                  href={service.href}
                  className="d-block h-100"
                  style={{
                    padding: 28,
                    borderRadius: 16,
                    border: "1px solid #E0E0E0",
                    textDecoration: "none",
                    color: "inherit",
                    background: "#fff",
                  }}
                >
                  <h3 className="box-title h5">{service.name}</h3>
                  <p className="mb-0">{service.short}</p>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space overflow-hidden" style={{ background: "#F4F7FF" }}>
        <div className="container th-container5">
          <div className="row align-items-center gy-4">
            <div className="col-lg-6">
              <span className="sub-title style3">[ Packs OS ]</span>
              <h2 className="sec-title h3">Packs de crecimiento con orquestación real</h2>
              <p>
                Local, ecommerce y SaaS B2B: kickoff, agentes, entregables, QA y auto-aprobación cuando la calidad
                alcanza el umbral definido. El cliente revisa en el portal.
              </p>
              <ul className="hero-list">
                <li>
                  <BrandCheck /> Orquestación de packs en producto
                </li>
                <li>
                  <BrandCheck /> Umbral QA ≥ 85 para auto-aprobación
                </li>
                <li>
                  <BrandCheck /> Portal cliente para decisión humana
                </li>
              </ul>
            </div>
            <div className="col-lg-6">
              <Image
                src={saasShotSrc("workflows")}
                alt="Automatizaciones y packs NELVYON"
                width={800}
                height={500}
                className="nv-brand-product-shot"
              />
            </div>
          </div>
        </div>
      </section>

      <BrandCtaBand
        title="Presupuesto de agencia a medida"
        body="Cuéntenos sector, objetivos y alcance. Recibirá una propuesta real, no un formulario de demo genérico."
        primaryCta={{ label: "Solicitar presupuesto", href: "/contacto?tipo=agencia" }}
        secondaryCta={{ label: "Ver SaaS", href: "/producto" }}
      />
    </>
  );
}
