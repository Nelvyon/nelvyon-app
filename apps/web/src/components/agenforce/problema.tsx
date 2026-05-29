const PUNTOS = [
  { title: "Herramientas desconectadas", desc: "Campañas, leads y reporting en silos." },
  { title: "Procesos manuales", desc: "Seguimiento y tareas sin control central." },
  { title: "Sin visibilidad", desc: "La dirección no ve la operación completa." },
];

export function Problema() {
  return (
    <section className="nelvyon-mkt-section--compact" style={{ backgroundColor: "#f8faff" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 0.95fr) minmax(0, 1.05fr)",
            gap: "clamp(40px, 6vw, 80px)",
            alignItems: "start",
          }}
          className="nelvyon-problema-layout"
        >
          <div>
            <p className="mkt-eyebrow">El problema</p>
            <h2 className="mkt-h2 fade-in" style={{ marginBottom: 16 }}>
              No es falta de herramientas
            </h2>
            <p className="mkt-lead">
              Es que no trabajan juntas. Campañas, CRM, email y reporting dispersos — sin una operación unificada.
            </p>
          </div>
          <div>
            {PUNTOS.map((p) => (
              <div key={p.title} className="mkt-row">
                <div>
                  <p className="mkt-row__title">{p.title}</p>
                  <p className="mkt-row__desc">{p.desc}</p>
                </div>
              </div>
            ))}
            <p
              style={{
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "#07122a",
                margin: "28px 0 0",
                paddingTop: 24,
                borderTop: "1px solid #e8eef8",
              }}
            >
              NELVYON unifica la operación.
            </p>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .nelvyon-problema-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
