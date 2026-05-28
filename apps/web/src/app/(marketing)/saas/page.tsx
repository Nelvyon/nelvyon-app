import type { Metadata } from "next";
import Link from "next/link";
import { ComparisonTable } from "@/components/agenforce/comparison-table";
export const metadata: Metadata = {
  title: "SaaS | NELVYON — Plataforma de Marketing Automatizado",
  description: "NELVYON SaaS: la plataforma todo-en-uno con agentes expertos para automatizar tu marketing digital. Planes desde €97/mes. Sin permanencia.",
};
const heroStats = [
  { label: "leads generados", value: "+2.847" },
  { label: "ingresos mes", value: "€38.420" },
  { label: "tasa de cierre", value: "34.2%" },
  { label: "clientes activos", value: "142" },
];
const plans = [
  {
    name: "Starter",
    price: "€97",
    period: "/mes",
    description: "Para emprendedores y negocios que empiezan a escalar.",
    features: ["1 canal publicitario gestionado", "Dashboard unificado", "WhatsApp automático (500 msg/mes)", "Email Marketing básico", "Soporte por chat", "1 usuario"],
    cta: "Empezar ahora",
    highlight: false,
  },
  {
    name: "Growth",
    price: "€297",
    period: "/mes",
    description: "Para empresas que quieren escalar en múltiples canales.",
    features: ["Meta + Google + TikTok Ads", "Dashboard avanzado + Analytics", "WhatsApp automático (5.000 msg/mes)", "Email Marketing con A/B testing", "CRM integrado", "Soporte prioritario 24/7", "5 usuarios", "1 web NELVYON OS/mes"],
    cta: "Empezar ahora",
    highlight: true,
    badge: "Más popular",
  },
  {
    name: "Elite",
    price: "€797",
    period: "/mes",
    description: "Para empresas que quieren dominación total del mercado.",
    features: ["Canales ilimitados", "Dashboard enterprise + BI", "WhatsApp ilimitado", "Email Marketing enterprise", "CRM avanzado + Pipelines Kanban", "Account Manager dedicado", "Usuarios ilimitados", "NELVYON OS ilimitado", "API access completo", "SLA 99.9% uptime"],
    cta: "Contactar ventas",
    highlight: false,
  },
];
const saasFeatures = [
  { icon: "🤖", title: "100% Automatizado", desc: "Agentes expertos trabajan 24/7 sin intervención humana. Lanzan campañas, optimizan y reportan solos." },
  { icon: "📊", title: "Un solo Dashboard", desc: "Meta, Google, TikTok, WhatsApp, Email — todas tus métricas en tiempo real en un solo lugar." },
  { icon: "⚡", title: "Setup en 24h", desc: "Conecta tus cuentas, define objetivos y los agentes se ponen a trabajar. Sin meses de onboarding." },
  { icon: "🔗", title: "12+ integraciones nativas", desc: "Stripe, Shopify, HubSpot, Zapier, Twilio, Mailchimp y más conectados desde el día 1." },
  { icon: "📈", title: "Escalable sin límites", desc: "Desde 1 campaña hasta 1.000. La plataforma crece contigo sin añadir coste marginal." },
  { icon: "🛡️", title: "Datos 100% seguros", desc: "GDPR compliant. Cifrado end-to-end. Tus datos son tuyos, siempre. Nunca los vendemos." },
];
export default function SaasPage() {
  return (
    <main style={{ paddingTop: "68px" }}>
      {/* Hero */}
      <section style={{ background: "linear-gradient(175deg, #07122a 0%, #0b1e44 40%, #1a7fc4 80%, #ffffff 100%)", padding: "64px 0 48px" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#4db8e8", marginBottom: "16px" }}>NELVYON SaaS Platform</p>
          <h1 style={{ fontSize: "clamp(36px, 6vw, 60px)", fontWeight: 900, color: "#ffffff", margin: "0 0 20px", lineHeight: 1.1 }}>
            La plataforma que trabaja<br />mientras tú descansas
          </h1>
          <p style={{ fontSize: "18px", color: "#a8c8e8", margin: "0 0 36px", lineHeight: 1.6 }}>
            NELVYON SaaS automatiza todo tu marketing digital con agentes expertos. Sin agencias, sin equipos, sin límites. Desde €97/mes.
          </p>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="#precios" style={{ display: "inline-block", backgroundColor: "#1a7fc4", color: "#ffffff", fontWeight: 700, fontSize: "16px", padding: "16px 40px", borderRadius: "12px", textDecoration: "none" }}>
              Ver planes →
            </Link>
            <Link href="/contacto" style={{ display: "inline-block", backgroundColor: "transparent", color: "#ffffff", fontWeight: 700, fontSize: "16px", padding: "16px 40px", borderRadius: "12px", textDecoration: "none", border: "2px solid rgba(255,255,255,0.3)" }}>
              Demo gratuita
            </Link>
          </div>
        </div>
      </section>
      <section style={{ backgroundColor: "#f8faff", padding: "24px 0" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ background: "linear-gradient(135deg, #07122a 0%, #1a7fc4 100%)", borderRadius: "16px", padding: "48px", display: "flex", gap: "32px", justifyContent: "center", flexWrap: "wrap" }}>
            {heroStats.map((stat) => (
              <div key={stat.label} style={{ textAlign: "center", minWidth: "160px" }}>
                <p style={{ color: "white", fontSize: "13px", opacity: 0.7, margin: "0 0 8px" }}>{stat.label}</p>
                <p style={{ color: "white", fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 700, margin: 0 }}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Features */}
      <section style={{ backgroundColor: "#ffffff", padding: "64px 0" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#07122a", margin: "0 0 16px" }}>Por qué NELVYON SaaS es diferente</h2>
            <p style={{ fontSize: "18px", color: "#5a6a8a", maxWidth: "540px", margin: "0 auto" }}>No es otra herramienta más. Es tu equipo de marketing completo en una plataforma.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
            {saasFeatures.map((f, i) => (
              <div key={i} style={{ backgroundColor: "#f8faff", border: "1px solid #e8eef8", borderRadius: "20px", padding: "32px", display: "flex", gap: "16px" }}>
                <span style={{ fontSize: "32px", flexShrink: 0 }}>{f.icon}</span>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#07122a", margin: "0 0 8px" }}>{f.title}</h3>
                  <p style={{ fontSize: "14px", color: "#5a6a8a", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Precios */}
      <section id="precios" style={{ backgroundColor: "#f8faff", padding: "64px 0" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#1a7fc4", marginBottom: "12px" }}>Precios transparentes</p>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#07122a", margin: "0 0 16px" }}>Elige tu plan</h2>
            <p style={{ fontSize: "18px", color: "#5a6a8a" }}>Sin permanencia. Sin sorpresas. Cancela cuando quieras.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", alignItems: "start" }}>
            {plans.map((plan, i) => (
              <div key={i} style={{ backgroundColor: plan.highlight ? "#07122a" : "#ffffff", border: plan.highlight ? "2px solid #1a7fc4" : "1px solid #e8eef8", borderRadius: "24px", padding: "40px", position: "relative", boxShadow: plan.highlight ? "0 20px 60px rgba(26,127,196,0.25)" : "0 4px 20px rgba(7,18,42,0.06)" }}>
                {plan.badge && (
                  <span style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)", background: "#1a7fc4", color: "#fff", fontSize: "12px", fontWeight: 700, borderRadius: "20px", padding: "4px 16px", whiteSpace: "nowrap" }}>
                    {plan.badge}
                  </span>
                )}
                <h3 style={{ fontSize: "22px", fontWeight: 800, color: plan.highlight ? "#ffffff" : "#07122a", margin: "0 0 8px" }}>{plan.name}</h3>
                <p style={{ fontSize: "14px", color: plan.highlight ? "#a8c8e8" : "#6b7a99", margin: "0 0 24px" }}>{plan.description}</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "32px" }}>
                  <span style={{ fontSize: "52px", fontWeight: 900, color: plan.highlight ? "#ffffff" : "#07122a", lineHeight: 1 }}>{plan.price}</span>
                  <span style={{ fontSize: "16px", color: plan.highlight ? "#a8c8e8" : "#6b7a99" }}>{plan.period}</span>
                </div>
                <ul style={{ margin: "0 0 32px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {plan.features.map((f, fi) => (
                    <li key={fi} style={{ fontSize: "14px", color: plan.highlight ? "#d0e8f8" : "#374151", display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ color: "#1a7fc4", fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/contacto" style={{ display: "block", textAlign: "center", backgroundColor: plan.highlight ? "#1a7fc4" : "#07122a", color: "#ffffff", fontWeight: 700, fontSize: "15px", padding: "14px 24px", borderRadius: "12px", textDecoration: "none" }}>
                  {plan.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
      <ComparisonTable />
    </main>
  );
}
