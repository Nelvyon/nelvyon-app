import Image from "next/image";
import Link from "next/link";

import { saasModules } from "../content/catalog";
import { homeContent, pricingPlans } from "../content/siteContent";
import { saasShotSrc, type SaasShotId } from "../content/saasShots";
import { AiorFaq } from "./AiorFaq";

const SOLUTION_TABS: readonly {
  id: string;
  label: string;
  title: string;
  body: string;
  shot: SaasShotId;
  href: string;
}[] = [
  {
    id: "crm",
    label: "CRM",
    title: "CRM y contactos con contexto real",
    body: "Gestiona contactos, historial y seguimiento comercial conectado a campañas, inbox y automatizaciones — multi-tenant y con roles.",
    shot: "crm",
    href: "/producto/crm",
  },
  {
    id: "workflows",
    label: "Automatizaciones",
    title: "Workflows con idempotencia",
    body: "Flujos programados y por disparador pensados para continuidad operativa, sin duplicados silenciosos en producción.",
    shot: "workflows",
    href: "/producto/workflows",
  },
  {
    id: "ia",
    label: "IA",
    title: "IA y agentes operativos",
    body: "Agentes y panel de IA para ejecutar marketing y operación con trazabilidad, no demos genéricas de chatbot.",
    shot: "ai",
    href: "/producto/ia",
  },
  {
    id: "campanas",
    label: "Campañas",
    title: "Email y campañas con SES",
    body: "Envío con AWS SES, bounces y tracking — acoplado al CRM y a los workflows del tenant.",
    shot: "campanias",
    href: "/producto/campanas",
  },
];

/**
 * Home NELVYON — composición AIOR (Cloud SaaS 09 + BI 05)
 * sin robots, sin testimonios/clientes/reviews inventados.
 */
export function AiorHomePage() {
  const { hero, pillars, platformLayers, proofStats, faqPreview, cta } = homeContent;
  const modules = saasModules.slice(0, 8);
  const plans = pricingPlans.slice(0, 3);

  return (
    <>
      {/* Hero — AIOR hero-9 */}
      <div className="th-hero-wrapper hero-9 bg-top-center" id="hero">
        <div className="container th-container5">
          <div className="row align-items-center">
            <div className="col-xl-12">
              <div className="hero-style9">
                <span className="sub-title style3">{hero.eyebrow}</span>
                <h1 className="hero-title">
                  {hero.titleLines[0]} {hero.titleLines[1]}
                </h1>
                <p className="hero-text">{hero.subtitle}</p>
                <ul className="hero-list">
                  <li>
                    <i className="fa-sharp fa-solid fa-circle-check" aria-hidden />
                    Demo con producto real
                  </li>
                  <li>
                    <i className="fa-sharp fa-solid fa-circle-check" aria-hidden />
                    SaaS y Agencia con precios separados
                  </li>
                  <li>
                    <i className="fa-sharp fa-solid fa-circle-check" aria-hidden />
                    Sin inventar clientes ni resultados
                  </li>
                </ul>
                <div className="btn-group justify-content-center">
                  <Link href={hero.primaryCta.href} className="th-btn2 btn-gradient2">
                    {hero.primaryCta.label}
                  </Link>
                  <Link href={hero.secondaryCta.href} className="th-btn2 style5">
                    {hero.secondaryCta.label}
                  </Link>
                </div>
                <div className="hero-image4 nv-aior-product-shot">
                  <Image
                    src={saasShotSrc("dashboard")}
                    alt="Dashboard SaaS NELVYON"
                    width={1200}
                    height={720}
                    priority
                    className="nv-aior-product-shot"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pilares — sin logos de clientes falsos */}
      <div className="overflow-hidden space">
        <div className="container th-container5">
          <div className="title-area mb-40 text-center">
            <span className="sub-title style3">Qué es NELVYON</span>
            <h2 className="sec-title h3">Agencia, SaaS, IA y automatización en una arquitectura</h2>
            <p className="mt-3 mx-auto" style={{ maxWidth: 640 }}>
              No somos solo una landing de IA. Operamos marketing digital con agentes y entregamos un SaaS B2B
              enterprise para CRM, campañas, workflows y gobierno.
            </p>
          </div>
          <div className="row gy-4">
            {pillars.map((p) => (
              <div key={p.title} className="col-md-6 col-xl-4">
                <div className="feature-card" style={{ padding: 28, borderRadius: 16, background: "#F4F7FF", height: "100%" }}>
                  <h3 className="box-title h5">{p.title}</h3>
                  <p className="mb-0">{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Capas de producto */}
      <section className="project-area2 position-relative space overflow-hidden" id="capas">
        <div className="container th-container5">
          <div className="row justify-content-between align-items-center mb-40">
            <div className="col-xl-6">
              <span className="sub-title style3">[ Plataforma ]</span>
              <h2 className="sec-title h3">Tres capas. Una operación.</h2>
            </div>
            <div className="col-xl-5">
              <p className="mb-0">
                SaaS para el día a día, OS de packs de marketing con IA, y portal cliente para aprobar entregables —
                con trazabilidad entre ejecución y decisión.
              </p>
            </div>
          </div>
          <div className="row gy-4">
            {platformLayers.map((layer, i) => (
              <div key={layer.title} className="col-md-4">
                <div className="feature-card" style={{ padding: 28, borderRadius: 16, border: "1px solid #E0E0E0", height: "100%" }}>
                  <span className="sub-title style3">0{i + 1}</span>
                  <h3 className="box-title h5">{layer.title}</h3>
                  <p className="mb-0">{layer.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Soluciones + capturas reales */}
      <section className="space overflow-hidden" id="soluciones">
        <div className="container th-container5">
          <div className="title-area text-center mb-40">
            <span className="sub-title style3">[ SaaS ]</span>
            <h2 className="sec-title h3">Producto real, no mockups genéricos</h2>
            <p>Capturas del SaaS NELVYON en entorno demo controlado (sin PII de clientes).</p>
          </div>
          <div className="row gy-5">
            {SOLUTION_TABS.map((tab) => (
              <div key={tab.id} className="col-lg-6">
                <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid #E0E0E0", height: "100%" }}>
                  <Image
                    src={saasShotSrc(tab.shot)}
                    alt={tab.title}
                    width={800}
                    height={480}
                    className="w-100 h-auto"
                  />
                  <div style={{ padding: 24 }}>
                    <span className="sub-title style3">{tab.label}</span>
                    <h3 className="box-title h5">{tab.title}</h3>
                    <p>{tab.body}</p>
                    <Link href={tab.href} className="th-btn2 style2">
                      Ver módulo
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-40">
            <Link href="/producto" className="th-btn2 btn-gradient2">
              Ver todo el SaaS
            </Link>
          </div>
        </div>
      </section>

      {/* Módulos */}
      <div className="feature-area3 position-relative space-extra overflow-hidden" id="modulos">
        <div className="container th-container5">
          <div className="title-area text-center mb-40">
            <span className="sub-title style3">[ Módulos ]</span>
            <h2 className="sec-title h3 text-white">Operación comercial y de marketing en un solo SaaS</h2>
          </div>
          <div className="row gy-4">
            {modules.map((m) => (
              <div key={m.id} className="col-md-6 col-xl-3">
                <Link
                  href={`/producto/${m.slug}`}
                  className="d-block"
                  style={{
                    padding: 24,
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.08)",
                    color: "#fff",
                    height: "100%",
                    textDecoration: "none",
                  }}
                >
                  <h3 className="h6 text-white">{m.name}</h3>
                  <p className="mb-0" style={{ color: "rgba(255,255,255,0.78)", fontSize: 14 }}>
                    {m.short}
                  </p>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agencia */}
      <section className="space overflow-hidden" id="agencia">
        <div className="container th-container5">
          <div className="row align-items-center gy-4">
            <div className="col-lg-6">
              <span className="sub-title style3">[ Agencia ]</span>
              <h2 className="sec-title h3">Marketing digital ejecutado por IA, con control humano</h2>
              <p>
                Packs OS (local, ecommerce, SaaS B2B), SEO, ads, branding y producción con revisión de calidad y
                portal de aprobación. El presupuesto de Agencia nunca se mezcla con el plan SaaS.
              </p>
              <div className="btn-group">
                <Link href="/agencia" className="th-btn2 btn-gradient2">
                  Conocer la agencia
                </Link>
                <Link href="/contacto?tipo=agencia" className="th-btn2 style5">
                  Pedir presupuesto
                </Link>
              </div>
            </div>
            <div className="col-lg-6">
              <Image
                src={saasShotSrc("agentes")}
                alt="Agentes IA NELVYON"
                width={800}
                height={500}
                className="nv-aior-product-shot"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Proof — solo métricas de producto */}
      <section className="space-extra overflow-hidden" style={{ background: "#F4F7FF" }}>
        <div className="container th-container5">
          <div className="title-area text-center mb-40">
            <span className="sub-title style3">[ Producto ]</span>
            <h2 className="sec-title h3">Hechos de plataforma, no promesas de marketing</h2>
            <p>No publicamos clientes, premios ni ROI inventados.</p>
          </div>
          <div className="row gy-4">
            {proofStats.map((s) => (
              <div key={s.label} className="col-md-6 col-xl-3">
                <div style={{ padding: 28, borderRadius: 16, background: "#fff", height: "100%", border: "1px solid #E0E0E0" }}>
                  <div className="h2" style={{ color: "#0084FF", marginBottom: 8 }}>
                    {s.value}
                  </div>
                  <h3 className="h6">{s.label}</h3>
                  <p className="mb-0" style={{ fontSize: 14 }}>
                    {s.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Precios teaser */}
      <section className="space overflow-hidden" id="precios">
        <div className="container th-container5">
          <div className="title-area text-center mb-40">
            <span className="sub-title style3">[ Precios SaaS ]</span>
            <h2 className="sec-title h3">Planes claros. Agencia aparte.</h2>
          </div>
          <div className="row gy-4 justify-content-center">
            {plans.map((plan) => (
              <div key={plan.id} className="col-md-6 col-xl-4">
                <div
                  style={{
                    padding: 32,
                    borderRadius: 16,
                    border: plan.featured ? "2px solid #0084FF" : "1px solid #E0E0E0",
                    height: "100%",
                    background: "#fff",
                  }}
                >
                  <h3 className="h5">{plan.name}</h3>
                  <p className="h2" style={{ color: "#0084FF" }}>
                    {plan.priceLabel}
                    {plan.period ? <span className="h6 text-muted"> {plan.period}</span> : null}
                  </p>
                  <p>{plan.description}</p>
                  <ul className="hero-list" style={{ textAlign: "left" }}>
                    {plan.features.slice(0, 5).map((f) => (
                      <li key={f}>
                        <i className="fa-sharp fa-solid fa-circle-check" aria-hidden /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link href={plan.cta.href} className="th-btn2 btn-gradient2 mt-3 d-inline-block">
                    {plan.cta.label}
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-40">
            <Link href="/precios" className="th-btn2 style5">
              Ver precios SaaS completos
            </Link>
            <span className="mx-3">·</span>
            <Link href="/contacto?tipo=agencia" className="th-btn2 style2">
              Presupuesto Agencia
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="space overflow-hidden">
        <div className="container th-container5">
          <div className="title-area text-center mb-40">
            <span className="sub-title style3">[ FAQ ]</span>
            <h2 className="sec-title h3">Preguntas frecuentes</h2>
          </div>
          <AiorFaq items={[...faqPreview]} />
          <div className="text-center mt-40">
            <Link href="/faq" className="th-btn2 style5">
              Ver todas las preguntas
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="space-extra overflow-hidden" style={{ background: "#020817", color: "#fff" }}>
        <div className="container th-container5 text-center">
          <h2 className="sec-title h3 text-white">{cta.title}</h2>
          <p style={{ color: "rgba(255,255,255,0.78)", maxWidth: 560, margin: "0 auto 24px" }}>{cta.body}</p>
          <div className="btn-group justify-content-center">
            <Link href={cta.primaryCta.href} className="th-btn2 btn-gradient2">
              {cta.primaryCta.label}
            </Link>
            <Link href={cta.secondaryCta.href} className="th-btn2 style5" style={{ color: "#fff", borderColor: "#fff" }}>
              {cta.secondaryCta.label}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
