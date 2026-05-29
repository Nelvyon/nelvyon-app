const ITEMS = [
  { title: "SaaS + ejecución", desc: "Tecnología operativa y capa profesional en un ecosistema." },
  { title: "Operación 24/7", desc: "Agentes expertos con procesos activos continuos." },
  { title: "Centralización", desc: "Un entorno. Menos herramientas aisladas." },
  { title: "Sin permanencia", desc: "Relación mes a mes, centrada en utilidad." },
  { title: "Escala", desc: "Local, growth, ecommerce y agencias." },
];

export function Diferenciadores() {
  return (
    <section className="nelvyon-mkt-section--airy nelvyon-section--alt">
      <div className="nelvyon-section-inner">
        <div style={{ maxWidth: 400, marginBottom: 48 }}>
          <p className="mkt-eyebrow">Por qué NELVYON</p>
          <h2 className="mkt-h2 fade-in">Diseñado para operar</h2>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}
          className="nelvyon-dif-grid"
        >
          {ITEMS.map((d) => (
            <div key={d.title} className="mkt-card">
              <p className="mkt-card__title">{d.title}</p>
              <p className="mkt-card__desc">{d.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
