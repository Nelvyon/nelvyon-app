export function Stats() {
  const principios = [
    { title: "Operación 24/7", desc: "Los agentes expertos mantienen tareas y flujos activos según la configuración definida." },
    { title: "Procesos centralizados", desc: "Campañas, CRM, contenidos y reporting en un entorno único, no en herramientas aisladas." },
    { title: "Dashboards claros", desc: "Visibilidad operativa para revisar qué ocurre y tomar decisiones con criterio." },
    { title: "Agentes expertos", desc: "Coordinación de tareas de marketing, ventas, contenido y análisis sin intervención constante." },
    { title: "Sin permanencia forzada", desc: "Relación profesional mes a mes, centrada en utilidad y claridad operativa." },
    { title: "Servicios + plataforma", desc: "Ejecución profesional y tecnología operativa en el mismo ecosistema." },
  ];

  return (
    <section className="nelvyon-mkt-section" style={{ backgroundColor: "#ffffff" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <p style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#0084fc", marginBottom: "12px" }}>
            Principios operativos
          </p>
          <h2 className="fade-in" style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800, color: "#07122a", margin: 0 }}>
            Diseñado para operar con control
          </h2>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
          }}
          className="nelvyon-principios-grid"
        >
          {principios.map((p) => (
            <div
              key={p.title}
              style={{
                backgroundColor: "#f8faff",
                border: "1px solid #e8eef8",
                borderRadius: "12px",
                padding: "24px",
              }}
            >
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#07122a", marginBottom: "8px" }}>{p.title}</div>
              <div style={{ fontSize: "14px", color: "#5a6a8a", lineHeight: 1.55 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .nelvyon-principios-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 520px) {
          .nelvyon-principios-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
