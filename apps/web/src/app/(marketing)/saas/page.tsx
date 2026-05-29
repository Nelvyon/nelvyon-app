import type { Metadata } from "next";
import Link from "next/link";
import { ComparisonTable } from "@/components/agenforce/comparison-table";
import { CtaFinal } from "@/components/agenforce/cta-final";
import { MarketingPageHero } from "@/components/agenforce/marketing-page-hero";
export const metadata: Metadata = {
  title: "SaaS | NELVYON — Plataforma de Marketing Automatizado",
  description: "NELVYON SaaS: plataforma operativa con agentes expertos para centralizar marketing, ventas, contenidos, automatización y reporting.",
};
const plans = [
  {
    name: "Starter",
    price: "€97",
    period: "/mes",
    description: "Centraliza marketing, CRM y reporting con orden.",
    features: ["1 canal publicitario gestionado", "Dashboard unificado", "WhatsApp automático (500 msg/mes)", "Email Marketing básico", "Soporte por chat", "1 usuario"],
    cta: "Solicitar demo",
    highlight: false,
  },
  {
    name: "Growth",
    price: "€297",
    period: "/mes",
    description: "Operación completa con agentes expertos y automatización.",
    features: ["Meta + Google + TikTok Ads", "Dashboard avanzado + Analytics", "WhatsApp automático (5.000 msg/mes)", "Email Marketing con A/B testing", "CRM integrado", "Soporte prioritario 24/7", "5 usuarios", "1 web NELVYON OS/mes"],
    cta: "Solicitar demo",
    highlight: true,
    badge: "Recomendado",
  },
  {
    name: "Elite",
    price: "€797",
    period: "/mes",
    description: "Módulos avanzados, integraciones y soporte estratégico.",
    features: ["Canales ilimitados", "Dashboard enterprise", "WhatsApp ilimitado", "Email Marketing enterprise", "CRM avanzado + Kanban", "Account Manager dedicado", "Usuarios ilimitados", "NELVYON OS ilimitado", "Integraciones API"],
    cta: "Solicitar demo",
    highlight: false,
  },
];
const saasFeatures = [
  { title: "Dashboard Central", desc: "Vista unificada de operación." },
  { title: "Agente de Ads", desc: "Campañas y seguimiento." },
  { title: "Agente de Email", desc: "Secuencias y flujos." },
  { title: "Agente de Contenidos", desc: "Piezas y calendario editorial." },
  { title: "Agente de SEO", desc: "Oportunidades y tareas orgánicas." },
  { title: "CRM Visual Kanban", desc: "Pipeline y fases comerciales." },
  { title: "Social Publishing", desc: "Publicación centralizada." },
  { title: "Agente de WhatsApp", desc: "Conversaciones + CRM." },
  { title: "Creative Studio", desc: "Variantes de anuncios." },
  { title: "Attribution Engine", desc: "Recorrido entre canales." },
  { title: "Landing Page Builder", desc: "Captación conectada al CRM." },
  { title: "NELVYON Academy", desc: "Onboarding y autonomía." },
  { title: "Agency Partner Portal", desc: "Multi-cliente para agencias." },
  { title: "E-commerce Connectors", desc: "Tiendas y recuperación." },
  { title: "Reportes y Dashboards", desc: "Paneles operativos." },
  { title: "Integraciones API", desc: "Webhooks y herramientas externas." },
];

const integraciones = ["Meta", "Google Ads", "WhatsApp", "Stripe", "Shopify", "HubSpot", "LinkedIn", "Zapier"];
export default function SaasPage() {
  return (
    <main>
      <MarketingPageHero
        eyebrow="NELVYON"
        title="El núcleo de tu operación"
        subtitle="Marketing, ventas y automatización en un sistema operativo con agentes expertos."
        ctaLabel="Ver planes"
        ctaHref="#precios"
      />
      <section className="nelvyon-mkt-section" style={{ backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ maxWidth: 400, marginBottom: 40 }}>
            <p className="mkt-eyebrow">Módulos</p>
            <h2 className="mkt-h2 fade-in">16 módulos operativos</h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "0 48px",
              maxWidth: 900,
            }}
            className="nelvyon-saas-modules"
          >
            {saasFeatures.map((f) => (
              <div key={f.title} className="mkt-row">
                <div>
                  <p className="mkt-row__title">{f.title}</p>
                  <p className="mkt-row__desc">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <style>{`
          @media (max-width: 640px) {
            .nelvyon-saas-modules { grid-template-columns: 1fr !important; gap: 0 !important; }
          }
        `}</style>
      </section>
      <section className="nelvyon-integrations-bar">
        <div className="nelvyon-integrations-bar__inner">
          <p className="mkt-eyebrow">Integraciones</p>
          <h2 className="mkt-h2 mkt-h2--light">Tu ecosistema conectado</h2>
          <div className="nelvyon-integrations-bar__pills">
            {integraciones.map((name) => (
              <span key={name} className="nelvyon-integrations-bar__pill">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>
      <section id="precios" className="nelvyon-mkt-section" style={{ backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
            <p className="mkt-eyebrow">Planes</p>
            <h2 className="mkt-h2 fade-in" style={{ marginBottom: 10 }}>Starter, Growth y Elite</h2>
            <p className="mkt-lead">Sin permanencia. Escala según tu operación.</p>
          </div>
          <div className="nelvyon-pricing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", alignItems: "stretch" }}>
            {plans.map((plan, i) => (
              <div
                key={i}
                className={plan.highlight ? "mkt-card--dark" : "mkt-card"}
                style={{ position: "relative", display: "flex", flexDirection: "column", padding: "28px 24px" }}
              >
                {plan.badge && (
                  <span style={{ position: "absolute", top: "16px", right: "16px", background: "rgba(0,132,252,0.15)", color: "#0084fc", fontSize: "11px", fontWeight: 600, borderRadius: "6px", padding: "4px 10px", whiteSpace: "nowrap", ...(plan.highlight ? { background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)" } : {}) }}>
                    {plan.badge}
                  </span>
                )}
                <h3 style={{ fontSize: "18px", fontWeight: 700, color: plan.highlight ? "#ffffff" : "#07122a", margin: "0 0 8px" }}>{plan.name}</h3>
                <p style={{ fontSize: "14px", color: plan.highlight ? "rgba(255,255,255,0.62)" : "#64748b", margin: "0 0 20px", lineHeight: 1.55 }}>{plan.description}</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "24px" }}>
                  <span style={{ fontSize: "40px", fontWeight: 800, color: plan.highlight ? "#ffffff" : "#07122a", lineHeight: 1, letterSpacing: "-0.02em" }}>{plan.price}</span>
                  <span style={{ fontSize: "14px", color: plan.highlight ? "rgba(255,255,255,0.5)" : "#5a6a8a" }}>{plan.period}</span>
                </div>
                <ul style={{ margin: "0 0 32px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {plan.features.map((f, fi) => (
                    <li key={fi} style={{ fontSize: "14px", color: plan.highlight ? "#d0e8f8" : "#374151", display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ color: "#0084fc", fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/contacto" style={{ display: "block", textAlign: "center", marginTop: "auto", backgroundColor: plan.highlight ? "#0084fc" : "#07122a", color: "#ffffff", fontWeight: 600, fontSize: "14px", padding: "12px 20px", borderRadius: "8px", textDecoration: "none" }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
        <style>{`
          @media (max-width: 900px) {
            .nelvyon-pricing-grid { grid-template-columns: 1fr !important; max-width: 400px; margin: 0 auto; }
          }
        `}</style>
      </section>
      <ComparisonTable />
      <CtaFinal
        title="Opera con continuidad"
        subtitle="Activa agentes expertos sobre NELVYON OS."
        primaryLabel="Solicitar demo"
        primaryHref="/contacto"
        showSecondary={false}
      />
    </main>
  );
}
