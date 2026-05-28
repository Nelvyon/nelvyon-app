export function Problema() {
  const problemas = [
    { title: "Herramientas desconectadas", desc: "Campañas, leads y reporting repartidos en plataformas que no se comunican entre sí." },
    { title: "Procesos manuales", desc: "Seguimiento comercial, emails y tareas repetitivas que consumen tiempo sin aportar control." },
    { title: "Falta de visibilidad", desc: "La dirección no tiene una vista clara de qué ocurre en marketing, ventas y automatización." },
  ];

  return (
    <section style={{ backgroundColor: "#f8faff", padding: "96px 0" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
        <div style={{ maxWidth: "640px", marginBottom: "48px" }}>
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
            El problema
          </p>
          <h2
            className="fade-in"
            style={{
              fontSize: "clamp(26px, 3.5vw, 40px)",
              fontWeight: 800,
              color: "#07122a",
              margin: "0 0 20px",
              lineHeight: 1.15,
            }}
          >
            Muchas empresas no fallan por falta de herramientas
          </h2>
          <p style={{ fontSize: "16px", color: "#5a6a8a", lineHeight: 1.7, margin: 0 }}>
            Fallan porque sus herramientas no trabajan juntas. Campañas en una plataforma. Leads en otra. Emails en otra. WhatsApp sin control. Informes manuales. Seguimiento comercial disperso.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "20px",
            marginBottom: "40px",
          }}
          className="nelvyon-problema-grid"
        >
          {problemas.map((p) => (
            <div
              key={p.title}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e8eef8",
                borderRadius: "12px",
                padding: "28px",
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#07122a", margin: "0 0 10px" }}>{p.title}</h3>
              <p style={{ fontSize: "14px", color: "#5a6a8a", lineHeight: 1.6, margin: 0 }}>{p.desc}</p>
            </div>
          ))}
        </div>
        <p
          style={{
            fontSize: "17px",
            fontWeight: 600,
            color: "#07122a",
            textAlign: "center",
            margin: 0,
            padding: "24px",
            borderTop: "1px solid #e8eef8",
          }}
        >
          NELVYON conecta la operación completa.
        </p>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .nelvyon-problema-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
