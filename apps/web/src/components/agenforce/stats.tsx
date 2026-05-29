const PRINCIPIOS = [
  "Operación 24/7 con agentes expertos",
  "Campañas, CRM y reporting centralizados",
  "Dashboards para decisiones con criterio",
  "Sin permanencia forzada",
];

export function Stats() {
  return (
    <section className="nelvyon-mkt-section--airy" style={{ backgroundColor: "#ffffff" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
        <p className="mkt-eyebrow">Principios</p>
        <h2 className="mkt-h2 fade-in" style={{ marginBottom: 40 }}>
          Control operativo
        </h2>
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "12px 32px",
            maxWidth: 720,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {PRINCIPIOS.map((p) => (
            <li
              key={p}
              style={{
                fontSize: 15,
                fontWeight: 500,
                letterSpacing: "-0.02em",
                color: "#5a6a8a",
              }}
            >
              {p}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
