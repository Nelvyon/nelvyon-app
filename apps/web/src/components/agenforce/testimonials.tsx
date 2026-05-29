const CASOS = [
  { title: "Equipo comercial", desc: "Leads y pipeline en un entorno." },
  { title: "Ecommerce", desc: "Campañas, catálogo y reporting conectados." },
  { title: "Agencia", desc: "Multi-cliente con procesos centralizados." },
  { title: "B2B", desc: "Seguimiento comercial automatizado." },
];

export function Testimonials() {
  return (
    <section className="nelvyon-mkt-section--compact" style={{ backgroundColor: "#ffffff" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ marginBottom: 36 }}>
          <p className="mkt-eyebrow">Casos de uso</p>
          <h2 className="mkt-h2 fade-in" style={{ marginBottom: 8 }}>
            Escenarios operativos
          </h2>
          <p className="mkt-lead" style={{ fontSize: 15 }}>
            Perfiles ilustrativos. No son testimonios ni resultados publicados.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 20,
          }}
          className="nelvyon-casos-grid"
        >
          {CASOS.map((c) => (
            <div key={c.title} className="mkt-card">
              <p className="mkt-card__title" style={{ fontSize: 15 }}>
                {c.title}
              </p>
              <p className="mkt-card__desc">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .nelvyon-casos-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .nelvyon-casos-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
