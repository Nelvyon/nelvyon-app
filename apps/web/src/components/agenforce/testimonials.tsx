export function Testimonials() {
  const casos = [
    { title: "Empresa con equipo comercial", desc: "Centralización de leads, seguimiento y pipeline en un único entorno." },
    { title: "Ecommerce", desc: "Conexión entre campañas, catálogo, email, WhatsApp y reporting." },
    { title: "Agencia", desc: "Gestión multi-cliente con procesos, entregas y paneles centralizados." },
    { title: "Empresa B2B", desc: "Automatización de seguimiento comercial y contenido profesional." },
  ];

  return (
    <section style={{ backgroundColor: "#ffffff", padding: "96px 0" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
        <div style={{ marginBottom: "48px" }}>
          <p style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#0084fc", marginBottom: "12px" }}>
            Casos de uso
          </p>
          <h2 className="fade-in" style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800, color: "#07122a", margin: "0 0 12px" }}>
            Escenarios de aplicación
          </h2>
          <p style={{ fontSize: "15px", color: "#5a6a8a", margin: 0, maxWidth: "560px", lineHeight: 1.6 }}>
            Perfiles operativos ilustrativos. No son testimonios de clientes ni resultados publicados.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "16px",
          }}
          className="nelvyon-casos-grid"
        >
          {casos.map((c) => (
            <div
              key={c.title}
              style={{
                backgroundColor: "#f8faff",
                border: "1px solid #e8eef8",
                borderRadius: "12px",
                padding: "28px",
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#07122a", margin: "0 0 10px" }}>{c.title}</h3>
              <p style={{ fontSize: "14px", color: "#5a6a8a", lineHeight: 1.6, margin: 0 }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 640px) {
          .nelvyon-casos-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
