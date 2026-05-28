export function Features() {
  const features = [
    {
      icon: "📣",
      title: "Publicidad digital",
      description: "Gestión profesional de campañas en Meta, Google, TikTok, YouTube, LinkedIn y Pinterest con estructura, seguimiento y optimización responsable.",
      badge: "Campañas",
      large: true,
    },
    {
      icon: "⚙️",
      title: "Automatización de marketing",
      description: "Diseño de flujos que conectan campañas, formularios, CRM, email, WhatsApp y seguimiento comercial.",
      badge: "Flujos",
    },
    {
      icon: "📊",
      title: "CRM y pipeline",
      description: "Organización visual de oportunidades, clientes, tareas y fases comerciales para mejorar el control interno.",
      badge: "CRM",
    },
    {
      icon: "✍️",
      title: "Contenido y copywriting",
      description: "Creación de textos, publicaciones, anuncios, emails, guiones y piezas orientadas a comunicación clara y conversión responsable.",
      badge: "Contenido",
    },
    {
      icon: "🌐",
      title: "Diseño web y ecommerce",
      description: "Desarrollo de páginas, landings y tiendas online con enfoque profesional, estructura clara y experiencia de usuario cuidada.",
      badge: "Web",
    },
    {
      icon: "📈",
      title: "Analítica y reporting",
      description: "Implementación de medición, eventos, paneles e informes para interpretar la actividad de marketing con mayor precisión.",
      badge: "Datos",
    },
  ];
  return (
    <section style={{ backgroundColor: "#ffffff", padding: "64px 0" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#0084fc", marginBottom: "12px" }}>
            Qué es NELVYON
          </p>
          <h2 className="fade-in" style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, color: "#07122a", margin: "0 0 16px" }}>
            Servicios destacados
          </h2>
          <p style={{ fontSize: "17px", color: "#5a6a8a", maxWidth: "800px", margin: "0 auto 16px", lineHeight: 1.7 }}>
            NELVYON es una plataforma dual para empresas que necesitan una estructura de marketing más seria, más ordenada y más operativa. Por un lado, ofrece servicios profesionales de marketing digital ejecutados con criterio estratégico. Por otro, integra un entorno SaaS con agentes expertos capaces de coordinar tareas, procesos y flujos de trabajo de forma continua.
          </p>
          <p style={{ fontSize: "16px", color: "#5a6a8a", maxWidth: "800px", margin: "0 auto", lineHeight: 1.7 }}>
            No sustituimos la estrategia. No vendemos fórmulas mágicas. Construimos sistemas de trabajo claros, medibles y preparados para operar con consistencia.
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
            <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "200px", height: "200px", borderRadius: "50%", background: "radial-gradient(circle, #0084fc 0%, transparent 70%)", opacity: 0.3 }} />
            <span style={{ display: "inline-block", background: "#0084fc", color: "#fff", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: "20px", padding: "4px 12px", marginBottom: "20px" }}>
              {features[0].badge}
            </span>
            <div style={{ fontSize: "36px", marginBottom: "16px" }}>{features[0].icon}</div>
            <h3 style={{ fontSize: "22px", fontWeight: 800, margin: "0 0 12px", color: "#ffffff" }}>{features[0].title}</h3>
            <p style={{ fontSize: "15px", color: "#a8b8d8", lineHeight: 1.6, margin: 0 }}>{features[0].description}</p>
          </div>
          <div style={{ gridColumn: "span 5", display: "flex", flexDirection: "column", gap: "20px" }}>
            {features.slice(1, 3).map((f, i) => (
              <div key={i} style={{ backgroundColor: "#f8faff", border: "1px solid #e8eef8", borderRadius: "20px", padding: "28px", flex: 1 }}>
                <span style={{ display: "inline-block", background: "#e8f0fb", color: "#0084fc", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: "20px", padding: "4px 10px", marginBottom: "14px" }}>
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
              <span style={{ display: "inline-block", background: "#e8f0fb", color: "#0084fc", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: "20px", padding: "4px 10px", marginBottom: "14px" }}>
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
