import Link from "next/link";

import { NvCtaBand } from "../cta-band";
import { NvDashboardMock } from "../dashboard-mock";
import { NvPageHero } from "../page-hero";
import { NvPlatformStrip } from "../platform-strip";

const FEATURES = [
  { title: "Dashboard central", desc: "Vista unificada de la operación." },
  { title: "Campañas", desc: "Seguimiento operativo en canales de pago." },
  { title: "CRM visual", desc: "Pipeline y fases comerciales." },
  { title: "Email", desc: "Secuencias y flujos automatizados." },
  { title: "WhatsApp", desc: "Conversaciones integradas con CRM." },
  { title: "Reporting", desc: "Paneles operativos centralizados." },
  { title: "Automatización", desc: "Flujos entre CRM, email y canales." },
  { title: "Integraciones", desc: "Herramientas externas conectadas." },
  { title: "Multi-usuario", desc: "Equipos con permisos y roles." },
];

const PLANS = [
  {
    name: "Starter",
    price: "€97",
    period: "/mes",
    desc: "Centraliza marketing, CRM y reporting con orden.",
    features: ["1 canal publicitario", "Dashboard unificado", "WhatsApp (límite mensual)", "Email básico", "1 usuario"],
    featured: false,
  },
  {
    name: "Growth",
    price: "€297",
    period: "/mes",
    desc: "Operación completa con automatización y soporte prioritario.",
    features: ["Meta + Google + TikTok", "Dashboard avanzado", "CRM integrado", "Automatización", "5 usuarios", "Soporte prioritario"],
    featured: true,
    badge: "Recomendado",
  },
  {
    name: "Elite",
    price: "€797",
    period: "/mes",
    desc: "Módulos avanzados, integraciones y acompañamiento estratégico.",
    features: ["Canales ampliados", "CRM avanzado", "Usuarios ampliados", "Integraciones", "Account manager"],
    featured: false,
  },
];

const INTEGRATIONS = ["Meta", "Google Ads", "WhatsApp", "Stripe", "Shopify", "HubSpot", "LinkedIn", "Zapier"];

export function NvSaasPage() {
  return (
    <main>
      <NvPageHero
        eyebrow="SaaS"
        title="La plataforma para operar marketing y ventas"
        subtitle="Centraliza campañas, CRM, automatización y reporting en un entorno diseñado para continuidad."
        visual={<NvDashboardMock />}
        split
      />
      <NvPlatformStrip />

      <section className="nv-section nv-section--white">
        <div className="nv-container">
          <header className="nv-section-head">
            <h2>Capacidades de la plataforma</h2>
            <p>Módulos operativos para equipos que necesitan orden, no más herramientas sueltas.</p>
          </header>
          <div className="nv-grid-3">
            {FEATURES.map((f) => (
              <article key={f.title} className="nv-card">
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="nv-section nv-section--dark">
        <div className="nv-container">
          <header className="nv-section-head nv-section-head--light">
            <span className="nv-eyebrow">Integraciones</span>
            <h2>Tu ecosistema conectado</h2>
            <p>Canales y herramientas que ya usas, integrados en la operación.</p>
          </header>
          <div className="nv-strip__items" style={{ justifyContent: "center" }}>
            {INTEGRATIONS.map((name) => (
              <span key={name} className="nv-strip__item" style={{ padding: "10px 18px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}>
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="precios" className="nv-section nv-section--light">
        <div className="nv-container">
          <header className="nv-section-head">
            <h2>Planes Starter, Growth y Elite</h2>
            <p>Sin permanencia. Escala según tu operación.</p>
          </header>
          <div className="nv-pricing-grid">
            {PLANS.map((plan) => (
              <article
                key={plan.name}
                className={`nv-card nv-pricing-card${plan.featured ? " nv-pricing-card--featured" : ""}`}
              >
                {plan.badge ? <span className="nv-pricing-badge">{plan.badge}</span> : null}
                <h3>{plan.name}</h3>
                <p>{plan.desc}</p>
                <div className="nv-pricing-card__price">
                  {plan.price}
                  <span className="nv-pricing-card__period"> {plan.period}</span>
                </div>
                <ul>
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <Link href="/contacto" className="nv-btn nv-btn--primary" style={{ width: "100%" }}>
                  Solicitar demo
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <NvCtaBand title="Opera con continuidad" subtitle="Activa la plataforma NELVYON con el plan que encaje en tu operación." />
    </main>
  );
}
