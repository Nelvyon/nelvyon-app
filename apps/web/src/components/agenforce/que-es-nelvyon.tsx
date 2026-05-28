export function QueEsNelvyon() {
  const pilares = [
    { title: "Servicios", desc: "Ejecución profesional de campañas, contenido, CRM y automatización." },
    { title: "Plataforma", desc: "SaaS central para operar marketing, ventas y reporting." },
    { title: "Agentes expertos", desc: "Coordinación operativa continua según la configuración definida." },
  ];

  return (
    <section className="nelvyon-mkt-section" style={{ backgroundColor: "#ffffff" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
        <div
          className="nelvyon-que-es-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "64px",
            alignItems: "center",
          }}
        >
          <div>
            <p
              style={{
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#0084fc",
                marginBottom: "16px",
              }}
            >
              Qué es NELVYON
            </p>
            <h2
              className="fade-in"
              style={{
                fontSize: "clamp(26px, 3.5vw, 40px)",
                fontWeight: 800,
                color: "#07122a",
                margin: "0 0 24px",
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
              }}
            >
              Plataforma dual: servicios y tecnología operativa
            </h2>
            <p style={{ fontSize: "16px", color: "#5a6a8a", lineHeight: 1.7, margin: "0 0 16px" }}>
              NELVYON es una plataforma dual: une ejecución profesional de marketing con un SaaS operativo impulsado por agentes expertos.
            </p>
            <p style={{ fontSize: "16px", color: "#5a6a8a", lineHeight: 1.7, margin: "0 0 16px" }}>
              La empresa puede centralizar campañas, contenidos, CRM, seguimiento comercial, automatizaciones y reporting desde una misma estructura.
            </p>
            <p style={{ fontSize: "15px", color: "#07122a", fontWeight: 600, lineHeight: 1.6, margin: 0 }}>
              No vendemos promesas. Construimos sistemas de trabajo.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {pilares.map((p) => (
              <div
                key={p.title}
                style={{
                  backgroundColor: "#f8faff",
                  border: "1px solid #e8eef8",
                  borderRadius: "12px",
                  padding: "24px",
                  borderLeft: "3px solid #0084fc",
                }}
              >
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#07122a", marginBottom: "6px" }}>{p.title}</div>
                <div style={{ fontSize: "14px", color: "#5a6a8a", lineHeight: 1.5 }}>{p.desc}</div>
              </div>
            ))}
            <div
              style={{
                marginTop: "8px",
                padding: "20px 24px",
                backgroundColor: "#07122a",
                borderRadius: "12px",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.9)", letterSpacing: "0.04em" }}>
                Servicios + Plataforma + Agentes expertos
              </span>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .nelvyon-que-es-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
        }
      `}</style>
    </section>
  );
}
