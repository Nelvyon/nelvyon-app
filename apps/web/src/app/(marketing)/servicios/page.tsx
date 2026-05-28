import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = {
  title: "Servicios | NELVYON — Marketing Digital con Agentes Expertos",
  description: "Meta Ads, Google Ads, TikTok Ads, WhatsApp Marketing, Email Marketing y webs automáticas. Todo gestionado por agentes expertos de NELVYON.",
};
const heroStats = [
  { label: "leads generados", value: "+2.847" },
  { label: "ingresos mes", value: "€38.420" },
  { label: "tasa de cierre", value: "34.2%" },
  { label: "clientes activos", value: "142" },
];
const services = [
  {
    title: "Meta Ads (Facebook & Instagram)",
    description: "Agentes expertos crean, lanzan y optimizan tus campañas de Meta en tiempo real. Segmentación avanzada, creatividades A/B y optimización continua del ROAS sin que toques nada.",
    features: ["Creación de campañas automática", "Optimización ROAS en tiempo real", "Audiences Lookalike avanzadas", "Reporting semanal automático", "Retargeting dinámico"],
    price: "Desde €297/mes",
    tag: "Más demandado",
  },
  {
    title: "Google Ads (Search & Display)",
    description: "Domina los resultados de búsqueda con agentes que gestionan keywords, pujas y anuncios automáticamente para maximizar cada euro invertido en Google.",
    features: ["Keywords y pujas automáticas", "Anuncios responsive generados por agentes", "Smart Bidding avanzado", "Integración Google Analytics 4", "Optimización Quality Score"],
    price: "Desde €297/mes",
    tag: "",
  },
  {
    title: "TikTok Ads",
    description: "Accede al canal de mayor crecimiento con agentes que dominan el algoritmo de TikTok. Creatividades cortas, optimización continua y máximo alcance en el público joven.",
    features: ["Creatividades adaptadas al formato TikTok", "Optimización por algoritmo nativo", "Retargeting automático", "Análisis de tendencias en tiempo real", "TopView y In-Feed Ads"],
    price: "Desde €297/mes",
    tag: "En auge",
  },
  {
    title: "WhatsApp Marketing Automatizado",
    description: "Secuencias de mensajes personalizadas, recuperación de carritos, recordatorios de citas y nurturing de leads. Todo sin intervención humana, 24/7.",
    features: ["Secuencias de bienvenida automáticas", "Recuperación de carritos abandonados", "Recordatorios de citas y eventos", "Integración Twilio + CRM NELVYON", "Mensajes personalizados por segmento"],
    price: "Desde €197/mes",
    tag: "",
  },
  {
    title: "Email Marketing Automatizado",
    description: "Newsletters, secuencias de onboarding, follow-ups post-venta y campañas de reactivación. Diseñadas, escritas y enviadas por agentes expertos.",
    features: ["Flujos de email totalmente automáticos", "Segmentación comportamental avanzada", "A/B testing automático de asunto y contenido", "Integración Amazon SES / Resend", "Reportes de conversión semanales"],
    price: "Desde €197/mes",
    tag: "",
  },
  {
    title: "Web Autopilot — NELVYON OS",
    description: "Genera webs profesionales completas para tu negocio de forma automática con agentes expertos. Sin plantillas, sin diseñadores, sin semanas de espera. Lista en 24h.",
    features: ["Web generada en 24h por agentes expertos", "Diseño adaptado a tu marca y sector", "SEO técnico incluido desde el día 1", "Deploy automático en Railway/Vercel", "Dominio y hosting configurados"],
    price: "Desde €497 única vez",
    tag: "Exclusivo NELVYON",
  },
];
export default function ServiciosPage() {
  return (
    <main style={{ paddingTop: "68px" }}>
      {/* Hero */}
      <section style={{ background: "linear-gradient(175deg, #07122a 0%, #0b1e44 40%, #1a7fc4 80%, #ffffff 100%)", padding: "64px 0 48px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#4db8e8", marginBottom: "16px" }}>Servicios NELVYON</p>
          <h1 style={{ fontSize: "clamp(36px, 6vw, 60px)", fontWeight: 900, color: "#ffffff", margin: "0 0 20px", lineHeight: 1.1 }}>
            Marketing digital<br />sin límites
          </h1>
          <p style={{ fontSize: "18px", color: "#a8c8e8", margin: "0 0 36px", lineHeight: 1.6 }}>
            Agentes expertos gestionan tus canales de captación mientras tú te centras en crecer. Sin agencias, sin equipos, sin límites.
          </p>
          <Link href="/contacto" style={{ display: "inline-block", backgroundColor: "#1a7fc4", color: "#ffffff", fontWeight: 700, fontSize: "16px", padding: "16px 40px", borderRadius: "12px", textDecoration: "none" }}>
            Solicitar demo gratuita →
          </Link>
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
      {/* Servicios grid */}
      <section style={{ backgroundColor: "#ffffff", padding: "64px 0" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#07122a", margin: "0 0 16px" }}>
              Todo lo que necesitas para dominar tu mercado
            </h2>
            <p style={{ fontSize: "18px", color: "#5a6a8a", maxWidth: "560px", margin: "0 auto" }}>
              Cada servicio gestionado por agentes expertos especializados. Sin contrato de permanencia.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "28px" }}>
            {services.map((svc, i) => (
              <div key={i} style={{ backgroundColor: "#f8faff", border: "1px solid #e8eef8", borderRadius: "24px", padding: "36px", display: "flex", flexDirection: "column", gap: "16px", position: "relative", overflow: "hidden" }}>
                {svc.tag && (
                  <span style={{ position: "absolute", top: "20px", right: "20px", background: "#1a7fc4", color: "#fff", fontSize: "11px", fontWeight: 700, borderRadius: "20px", padding: "4px 12px" }}>
                    {svc.tag}
                  </span>
                )}
                <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#07122a", margin: 0 }}>{svc.title}</h3>
                <p style={{ fontSize: "15px", color: "#5a6a8a", lineHeight: 1.6, margin: 0 }}>{svc.description}</p>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {svc.features.map((f, fi) => (
                    <li key={fi} style={{ fontSize: "14px", color: "#374151", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: "#1a7fc4", fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: "auto", paddingTop: "20px", borderTop: "1px solid #e8eef8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "18px", fontWeight: 800, color: "#07122a" }}>{svc.price}</span>
                  <Link href="/contacto" style={{ backgroundColor: "#07122a", color: "#fff", fontSize: "13px", fontWeight: 700, padding: "10px 20px", borderRadius: "10px", textDecoration: "none" }}>
                    Contratar →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* CTA */}
      <section style={{ backgroundColor: "#f8faff", padding: "64px 0", textAlign: "center" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, color: "#07122a", margin: "0 0 16px" }}>¿No sabes por dónde empezar?</h2>
          <p style={{ fontSize: "18px", color: "#5a6a8a", margin: "0 0 32px" }}>Hablamos contigo, analizamos tu negocio y te recomendamos el pack perfecto. Gratis y sin compromiso.</p>
          <Link href="/contacto" style={{ display: "inline-block", backgroundColor: "#1a7fc4", color: "#ffffff", fontWeight: 700, fontSize: "16px", padding: "16px 40px", borderRadius: "12px", textDecoration: "none" }}>
            Hablar con un experto →
          </Link>
        </div>
      </section>
    </main>
  );
}
