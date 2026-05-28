export function Features() {
  const features = [
    {
      icon: "🤖",
      title: "Agentes Expertos de Marketing",
      description: "Agentes especializados gestionan tus campañas de Meta Ads, Google Ads y TikTok Ads de forma autónoma, optimizando en tiempo real sin que toques nada.",
      badge: "Núcleo",
      large: true,
    },
    {
      icon: "📱",
      title: "WhatsApp & Email Automático",
      description: "Secuencias de nurturing multicanal que convierten leads en clientes mientras duermes.",
      badge: "Automatización",
    },
    {
      icon: "📊",
      title: "Dashboard Unificado",
      description: "Todas tus métricas: ROAS, CAC, LTV, conversiones — en un solo panel en tiempo real.",
      badge: "Analytics",
    },
    {
      icon: "🌐",
      title: "NELVYON OS — Web Autopilot",
      description: "Genera webs completas para tus clientes automáticamente con agentes expertos. Sin plantillas, sin equipo.",
      badge: "OS",
    },
    {
      icon: "⚡",
      title: "Deploy Instantáneo",
      description: "Infraestructura Railway + Vercel. Tus proyectos en producción en minutos, no en días.",
      badge: "Infra",
    },
    {
      icon: "🔒",
      title: "Enterprise-grade Seguridad",
      description: "Autenticación OAuth, JWT, cifrado end-to-end y cumplimiento GDPR de serie.",
      badge: "Seguridad",
    },
  ];
  return (
    <section style={{ backgroundColor: "#ffffff", padding: "96px 0" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "64px" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#1a7fc4", marginBottom: "12px" }}>
            Todo en una plataforma
          </p>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, color: "#07122a", margin: "0 0 16px" }}>
            Cada herramienta que necesitas,<br />ninguna que no necesitas
          </h2>
          <p style={{ fontSize: "18px", color: "#5a6a8a", maxWidth: "600px", margin: "0 auto", lineHeight: 1.6 }}>
            NELVYON reemplaza 12+ herramientas en una sola plataforma impulsada por agentes expertos.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "20px" }}>
          <div
            style={{
              gridColumn: "span 7",
              backgroundColor: "#07122a",
              borderRadius: "24px",
              padding: "40px",
              color: "#ffffff",
              position: "relative",
              overflow: "hidden",
              minHeight: "280px",
            }}
          >
            <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "200px", height: "200px", borderRadius: "50%", background: "radial-gradient(circle, #1a7fc4 0%, transparent 70%)", opacity: 0.3 }} />
            <span style={{ display: "inline-block", background: "#1a7fc4", color: "#fff", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: "20px", padding: "4px 12px", marginBottom: "20px" }}>
              {features[0].badge}
            </span>
            <div style={{ fontSize: "36px", marginBottom: "16px" }}>{features[0].icon}</div>
            <h3 style={{ fontSize: "22px", fontWeight: 800, margin: "0 0 12px", color: "#ffffff" }}>{features[0].title}</h3>
            <p style={{ fontSize: "15px", color: "#a8b8d8", lineHeight: 1.6, margin: 0 }}>{features[0].description}</p>
          </div>
          <div style={{ gridColumn: "span 5", display: "flex", flexDirection: "column", gap: "20px" }}>
            {features.slice(1, 3).map((f, i) => (
              <div key={i} style={{ backgroundColor: "#f8faff", border: "1px solid #e8eef8", borderRadius: "20px", padding: "28px", flex: 1 }}>
                <span style={{ display: "inline-block", background: "#e8f0fb", color: "#1a7fc4", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: "20px", padding: "4px 10px", marginBottom: "14px" }}>
                  {f.badge}
                </span>
                <div style={{ fontSize: "28px", marginBottom: "10px" }}>{f.icon}</div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#07122a", margin: "0 0 8px" }}>{f.title}</h3>
                <p style={{ fontSize: "14px", color: "#6b7a99", lineHeight: 1.5, margin: 0 }}>{f.description}</p>
              </div>
            ))}
          </div>
          {features.slice(3).map((f, i) => (
            <div key={i} style={{ gridColumn: "span 4", backgroundColor: "#f8faff", border: "1px solid #e8eef8", borderRadius: "20px", padding: "28px" }}>
              <span style={{ display: "inline-block", background: "#e8f0fb", color: "#1a7fc4", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: "20px", padding: "4px 10px", marginBottom: "14px" }}>
                {f.badge}
              </span>
              <div style={{ fontSize: "28px", marginBottom: "10px" }}>{f.icon}</div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#07122a", margin: "0 0 8px" }}>{f.title}</h3>
              <p style={{ fontSize: "14px", color: "#6b7a99", lineHeight: 1.5, margin: 0 }}>{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
