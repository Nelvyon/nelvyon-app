const ITEMS = [
  { title: "SaaS + ejecución", desc: "Tecnología operativa y capa profesional en un ecosistema." },
  { title: "Operación 24/7", desc: "Agentes expertos con procesos activos continuos." },
  { title: "Centralización", desc: "Un entorno. Menos herramientas aisladas." },
  { title: "Sin permanencia", desc: "Relación mes a mes, centrada en utilidad." },
  { title: "Escala", desc: "Local, growth, ecommerce y agencias." },
];

export function Diferenciadores() {
  return (
    <section className="nelvyon-mkt-section--airy" style={{ backgroundColor: "#ffffff" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ maxWidth: 400, marginBottom: 48 }}>
          <p className="mkt-eyebrow">Por qué NELVYON</p>
          <h2 className="mkt-h2 fade-in">Diseñado para operar</h2>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "0 48px",
          }}
          className="nelvyon-dif-grid"
        >
          {ITEMS.map((d, i) => (
            <div
              key={d.title}
              style={{
                padding: "20px 0",
                borderBottom: "1px solid #e8eef8",
                borderTop: i < 2 ? "1px solid #e8eef8" : "none",
              }}
            >
              <p style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em", color: "#07122a", margin: "0 0 6px" }}>
                {d.title}
              </p>
              <p style={{ fontSize: 13, color: "#5a6a8a", margin: 0, lineHeight: 1.45 }}>{d.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 640px) {
          .nelvyon-dif-grid { grid-template-columns: 1fr !important; gap: 0 !important; }
        }
      `}</style>
    </section>
  );
}
