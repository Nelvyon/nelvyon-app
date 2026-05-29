const PUNTOS = [
  { title: "Herramientas desconectadas", desc: "Campañas, leads y reporting en silos." },
  { title: "Procesos manuales", desc: "Seguimiento y tareas sin control central." },
  { title: "Sin visibilidad", desc: "La dirección no ve la operación completa." },
];

export function Problema() {
  return (
    <section className="nelvyon-mkt-section--compact nelvyon-section--alt">
      <div className="nelvyon-section-inner">
        <div className="nelvyon-problema-layout">
          <div>
            <p className="mkt-eyebrow">El problema</p>
            <h2 className="mkt-h2 fade-in" style={{ marginBottom: 16 }}>
              No es falta de herramientas
            </h2>
            <p className="mkt-lead">
              Es que no trabajan juntas. Campañas, CRM, email y reporting dispersos — sin una operación unificada.
            </p>
          </div>
          <div className="nelvyon-problema-cards">
            {PUNTOS.map((p) => (
              <div key={p.title} className="mkt-card">
                <p className="mkt-card__title">{p.title}</p>
                <p className="mkt-card__desc">{p.desc}</p>
              </div>
            ))}
            <p className="nelvyon-problema-close">NELVYON unifica la operación.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
