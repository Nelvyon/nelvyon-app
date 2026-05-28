import type { Metadata } from "next";
import Link from "next/link";
import { ComparisonTable } from "@/components/agenforce/comparison-table";
import { CtaFinal } from "@/components/agenforce/cta-final";
import { NavyToWhiteTransition } from "@/components/agenforce/section-transition";
export const metadata: Metadata = {
  title: "SaaS | NELVYON — Plataforma de Marketing Automatizado",
  description: "NELVYON SaaS: plataforma operativa con agentes expertos para centralizar marketing, ventas, contenidos, automatización y reporting.",
};
const plans = [
  {
    name: "Starter",
    price: "€97",
    period: "/mes",
    description: "Para empresas que quieren empezar a centralizar procesos básicos de marketing, CRM, publicaciones y reporting con mayor orden y visibilidad.",
    features: ["1 canal publicitario gestionado", "Dashboard unificado", "WhatsApp automático (500 msg/mes)", "Email Marketing básico", "Soporte por chat", "1 usuario"],
    cta: "Solicitar demo",
    highlight: false,
  },
  {
    name: "Growth",
    price: "€297",
    period: "/mes",
    description: "Para empresas que necesitan una operación más completa con agentes expertos, automatizaciones, campañas, contenido y seguimiento comercial.",
    features: ["Meta + Google + TikTok Ads", "Dashboard avanzado + Analytics", "WhatsApp automático (5.000 msg/mes)", "Email Marketing con A/B testing", "CRM integrado", "Soporte prioritario 24/7", "5 usuarios", "1 web NELVYON OS/mes"],
    cta: "Solicitar demo",
    highlight: true,
    badge: "Recomendado",
  },
  {
    name: "Elite",
    price: "€797",
    period: "/mes",
    description: "Para empresas, agencias o estructuras complejas que necesitan módulos avanzados, integraciones, reporting amplio y soporte estratégico.",
    features: ["Canales ilimitados", "Dashboard enterprise", "WhatsApp ilimitado", "Email Marketing enterprise", "CRM avanzado + Kanban", "Account Manager dedicado", "Usuarios ilimitados", "NELVYON OS ilimitado", "Integraciones API"],
    cta: "Solicitar demo",
    highlight: false,
  },
];
const saasFeatures = [
  { title: "Dashboard Central", desc: "Vista unificada para consultar campañas, contactos, tareas, oportunidades, automatizaciones, contenidos y métricas principales sin saltar entre herramientas." },
  { title: "Agente de Ads", desc: "Apoyo en creación, revisión y coordinación de campañas: estructura, mensajes, audiencias y seguimiento operativo." },
  { title: "Agente de Email", desc: "Secuencias, newsletters, segmentación, calendarios y flujos automatizados de email." },
  { title: "Agente de Contenidos", desc: "Artículos, publicaciones, copies y piezas adaptadas a la voz de marca de forma organizada." },
  { title: "Agente de SEO", desc: "Oportunidades orgánicas, palabras clave, estructuras de contenido y tareas SEO." },
  { title: "CRM Visual Kanban", desc: "Pipeline visual para oportunidades, contactos, fases comerciales y seguimiento." },
  { title: "Social Publishing", desc: "Planificación y programación de publicaciones desde un entorno centralizado." },
  { title: "Agente de WhatsApp", desc: "Automatización de conversaciones, cualificación y seguimiento integrado con CRM." },
  { title: "Creative Studio", desc: "Piezas y variantes de anuncios alineados con la identidad de marca." },
  { title: "Attribution Engine", desc: "Recorrido de contactos y relación entre canales, campañas e interacciones." },
  { title: "Landing Page Builder", desc: "Páginas de captación con formularios y conexión directa con CRM." },
  { title: "NELVYON Academy", desc: "Recursos para entender la plataforma y adoptar módulos con autonomía." },
  { title: "Agency Partner Portal", desc: "Gestión multi-cliente, reporting y módulos operativos para agencias." },
  { title: "E-commerce Connectors", desc: "Sincronización de tiendas online, automatizaciones y flujos de recuperación." },
  { title: "Reportes y Dashboards", desc: "Paneles e informes sin depender de hojas de cálculo dispersas." },
  { title: "Integraciones API", desc: "Conexión con herramientas externas mediante integraciones y webhooks." },
];

const integraciones = ["Meta", "Google Ads", "WhatsApp", "Stripe", "Shopify", "HubSpot", "LinkedIn", "Zapier"];
export default function SaasPage() {
  return (
    <main style={{ paddingTop: "68px" }}>
      <section style={{ backgroundColor: "#07122a", padding: "64px 0 0" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "0 24px 48px", textAlign: "center" }}>
          <p style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: "16px" }}>Plataforma NELVYON</p>
          <h1 className="fade-in" style={{ fontSize: "clamp(36px, 6vw, 60px)", fontWeight: 900, color: "#ffffff", margin: "0 0 20px", lineHeight: 1.1 }}>
            La plataforma operativa de NELVYON
          </h1>
          <p style={{ fontSize: "18px", color: "#a8c8e8", margin: "0 0 16px", lineHeight: 1.6 }}>
            Un SaaS diseñado para centralizar marketing, ventas, contenidos, automatización y reporting mediante agentes expertos.
          </p>
          <p style={{ fontSize: "16px", color: "#a8c8e8", margin: "0 0 36px", lineHeight: 1.6 }}>
            NELVYON SaaS permite a las empresas trabajar con un entorno más ordenado, automatizado y preparado para operaciones continuas.
          </p>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="#precios" style={{ display: "inline-block", backgroundColor: "#0084fc", color: "#ffffff", fontWeight: 700, fontSize: "16px", padding: "16px 40px", borderRadius: "12px", textDecoration: "none" }}>
              Ver planes →
            </Link>
            <Link href="/contacto" style={{ display: "inline-block", backgroundColor: "transparent", color: "#ffffff", fontWeight: 700, fontSize: "16px", padding: "16px 40px", borderRadius: "12px", textDecoration: "none", border: "2px solid rgba(255,255,255,0.3)" }}>
              Solicitar demo
            </Link>
          </div>
        </div>
        <NavyToWhiteTransition />
      </section>
      <section style={{ backgroundColor: "#f8faff", padding: "48px 0" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 24px" }}>
          <p style={{ fontSize: "17px", color: "#5a6a8a", lineHeight: 1.7, margin: "0 0 16px" }}>
            La mayoría de equipos utilizan demasiadas herramientas desconectadas: una para campañas, otra para contactos, otra para emails, otra para informes, otra para tareas y otra para publicar contenido.
          </p>
          <p style={{ fontSize: "17px", color: "#5a6a8a", lineHeight: 1.7, margin: 0 }}>
            NELVYON SaaS busca reducir esa fragmentación mediante una plataforma central que conecta módulos, datos, flujos y agentes expertos. El sistema no elimina la necesidad de criterio. La organiza, la ejecuta y la mantiene operativa.
          </p>
        </div>
      </section>
      <section style={{ backgroundColor: "#ffffff", padding: "96px 0" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ marginBottom: "48px" }}>
            <p style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#0084fc", marginBottom: "12px" }}>Módulos</p>
            <h2 className="fade-in" style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800, color: "#07122a", margin: "0 0 12px" }}>Módulos de la plataforma</h2>
            <p style={{ fontSize: "16px", color: "#5a6a8a", maxWidth: "540px", margin: 0 }}>16 módulos para ejecutar tareas, coordinar procesos y mantener flujos activos desde un entorno central.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
            {saasFeatures.map((f) => (
              <div key={f.title} style={{ backgroundColor: "#f8faff", border: "1px solid #e8eef8", borderRadius: "12px", padding: "24px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#07122a", margin: "0 0 8px" }}>{f.title}</h3>
                <p style={{ fontSize: "14px", color: "#5a6a8a", lineHeight: 1.55, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section style={{ backgroundColor: "#f8faff", padding: "64px 0", borderTop: "1px solid #e8eef8" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <p style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#0084fc", marginBottom: "12px" }}>Integraciones</p>
          <h2 style={{ fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 800, color: "#07122a", margin: "0 0 24px" }}>Conectado con tu ecosistema</h2>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "12px" }}>
            {integraciones.map((name) => (
              <span key={name} style={{ fontSize: "13px", fontWeight: 600, color: "#5a6a8a", backgroundColor: "#ffffff", border: "1px solid #e8eef8", borderRadius: "8px", padding: "10px 18px" }}>
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>
      <section id="precios" style={{ backgroundColor: "#ffffff", padding: "96px 0" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <p style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#0084fc", marginBottom: "12px" }}>Planes</p>
            <h2 className="fade-in" style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800, color: "#07122a", margin: "0 0 12px" }}>Starter, Growth y Elite</h2>
            <p style={{ fontSize: "16px", color: "#5a6a8a" }}>Sin permanencia forzada. Estructura según la complejidad de tu operación.</p>
          </div>
          <div className="nelvyon-pricing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", alignItems: "stretch" }}>
            {plans.map((plan, i) => (
              <div key={i} style={{ backgroundColor: plan.highlight ? "#07122a" : "#f8faff", border: plan.highlight ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e8eef8", borderRadius: "12px", padding: "32px", position: "relative", display: "flex", flexDirection: "column" }}>
                {plan.badge && (
                  <span style={{ position: "absolute", top: "16px", right: "16px", background: "rgba(0,132,252,0.15)", color: "#0084fc", fontSize: "11px", fontWeight: 600, borderRadius: "6px", padding: "4px 10px", whiteSpace: "nowrap", ...(plan.highlight ? { background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)" } : {}) }}>
                    {plan.badge}
                  </span>
                )}
                <h3 style={{ fontSize: "18px", fontWeight: 700, color: plan.highlight ? "#ffffff" : "#07122a", margin: "0 0 8px" }}>{plan.name}</h3>
                <p style={{ fontSize: "14px", color: plan.highlight ? "rgba(255,255,255,0.55)" : "#5a6a8a", margin: "0 0 20px", lineHeight: 1.5, minHeight: "42px" }}>{plan.description}</p>
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
        title="Una plataforma para operar con continuidad"
        subtitle="Centraliza procesos, activa agentes expertos y trabaja con una estructura digital preparada para crecer con tu empresa."
        primaryLabel="Ver plataforma"
        primaryHref="/saas#precios"
        showSecondary={false}
      />
    </main>
  );
}
