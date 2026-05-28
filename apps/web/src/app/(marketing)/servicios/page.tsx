import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Servicios | NELVYON — Marketing Digital con Agentes Expertos",
  description: "Meta Ads, Google Ads, TikTok Ads, WhatsApp Marketing, Email Marketing y webs automáticas. Todo gestionado por agentes expertos de NELVYON.",
};

const services = [
  {
    icon: "📣",
    title: "Meta Ads (Facebook & Instagram)",
    description: "Agentes expertos crean, lanzan y optimizan tus campañas de Meta en tiempo real. Segmentación avanzada, creatividades A/B y optimización continua del ROAS.",
    features: ["Creación de campañas automática", "Optimización ROAS en tiempo real", "Audiences Lookalike", "Reporting semanal automático"],
    price: "Desde €297/mes",
    tag: "Más demandado",
  },
  {
    icon: "🔍",
    title: "Google Ads (Search & Display)",
    description: "Domina los resultados de búsqueda con agentes que gestionan keywords, pujas y anuncios automáticamente para maximizar cada euro invertido.",
    features: ["Keywords & pujas automáticas", "Anuncios responsive generados por agentes", "Smart Bidding avanzado", "Integración Google Analytics 4"],
    price: "Desde €297/mes",
    tag: "",
  },
  {
    icon: "🎵",
    title: "TikTok Ads",
    description: "Accede al canal de mayor crecimiento con agentes que dominan el algoritmo de TikTok. Creatividades cortas, UGC simulado y optimización continua.",
    features: ["Creatividades adaptadas al formato", "Optimización por algoritmo TikTok", "Retargeting automático", "Análisis de tendencias en tiempo real"],
    price: "Desde €297/mes",
    tag: "En auge",
  },
  {
    icon: "💬",
    title: "WhatsApp Marketing Automatizado",
    description: "Secuencias de mensajes personalizadas, recuperación de carritos, recordatorios de citas y nurturing de leads. Todo sin intervención humana.",
    features: ["Secuencias de bienvenida automáticas", "Recuperación de carritos abandonados", "Recordatorios de citas y eventos", "Integración Twilio + CRM"],
    price: "Desde €197/mes",
    tag: "",
  },
  {
    icon: "📧",
    title: "Email Marketing Automatizado",
    description: "Newsletters, secuencias de onboarding, follow-ups post-venta y campañas de reactivación. Diseñadas y enviadas por agentes expertos.",
    features: ["Flujos de email automáticos", "Segmentación comportamental", "A/B testing automático", "Integración Amazon SES / Resend"],
    price: "Desde €197/mes",
    tag: "",
  },
  {
    icon: "🌐",
    title: "Web Autopilot (NELVYON OS)",
    description: "Genera webs profesionales completas para tu negocio de forma automática. Sin plantillas, sin diseñadores, sin semanas de espera.",
    features: ["Web generada en 24h por agentes", "Diseño adaptado a tu marca", "SEO técnico incluido", "Deploy automático en Railway/Vercel"],
    price: "Desde €497 única vez",
    tag: "Exclusivo",
  },
];

export default function ServiciosPage() {
  return (
    <main>
      <section style={{ background: "linear-gradient(175deg, #07122a 0%, #0b1e44 40%, #1a7fc4 80%, #ffffff 100%)", padding: "120px 0 80px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#4db8e8", marginBottom: "16px" }}>
            Servicios NELVYON
          </p>
          <h1 style={{ fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 900, color: "#ffffff", margin: "0 0 20px", lineHeight: 1.1 }}>
            Marketing digital<br />sin límites
          </h1>
          <p style={{ fontSize: "20px", color: "#a8c8e8", margin: "0 0 40px", lineHeight: 1.6 }}>
            Agentes expertos gestionan tus canales de captación mientras tú te centras en crecer.
          </p>
          <a
            href="/contacto"
            style={{ display: "inline-block", backgroundColor: "#1a7fc4", color: "#ffffff", fontWeight: 700, fontSize: "16px", padding: "16px 40px", borderRadius: "12px", textDecoration: "none" }}
          >
            Solicitar demo →
          </a>
        </div>
      </section>
      <section style={{ backgroundColor: "#ffffff", padding: "96px 0" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "28px" }}>
            {services.map((svc, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: "#f8faff",
                  border: "1px solid #e8eef8",
                  borderRadius: "24px",
                  padding: "36px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {svc.tag && (
                  <span style={{ position: "absolute", top: "20px", right: "20px", background: "#1a7fc4", color: "#fff", fontSize: "11px", fontWeight: 700, borderRadius: "20px", padding: "4px 12px" }}>
                    {svc.tag}
                  </span>
                )}
                <div style={{ fontSize: "36px" }}>{svc.icon}</div>
                <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#07122a", margin: 0 }}>{svc.title}</h3>
                <p style={{ fontSize: "15px", color: "#5a6a8a", lineHeight: 1.6, margin: 0 }}>{svc.description}</p>
                <ul style={{ margin: 0, padding: "0 0 0 4px", listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {svc.features.map((f, fi) => (
                    <li key={fi} style={{ fontSize: "14px", color: "#374151", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: "#1a7fc4", fontWeight: 700 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: "auto", paddingTop: "20px", borderTop: "1px solid #e8eef8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "18px", fontWeight: 800, color: "#07122a" }}>{svc.price}</span>
                  <a href="/contacto" style={{ backgroundColor: "#07122a", color: "#fff", fontSize: "13px", fontWeight: 700, padding: "10px 20px", borderRadius: "10px", textDecoration: "none" }}>
                    Contratar →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section style={{ backgroundColor: "#f8faff", padding: "80px 0", textAlign: "center" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, color: "#07122a", margin: "0 0 16px" }}>
            ¿No sabes por dónde empezar?
          </h2>
          <p style={{ fontSize: "18px", color: "#5a6a8a", margin: "0 0 32px" }}>
            Hablamos contigo, analizamos tu negocio y te recomendamos el pack perfecto.
          </p>
          <a href="/contacto" style={{ display: "inline-block", backgroundColor: "#1a7fc4", color: "#ffffff", fontWeight: 700, fontSize: "16px", padding: "16px 40px", borderRadius: "12px", textDecoration: "none" }}>
            Hablar con un experto →
          </a>
        </div>
      </section>
    </main>
  );
}
