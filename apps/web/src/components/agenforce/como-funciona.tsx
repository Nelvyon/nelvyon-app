import { NELVYON_BLUE } from "./marketing-brand";

const STEPS = [
  { num: "01", title: "Diagnóstico", desc: "Canales, procesos y necesidades reales." },
  { num: "02", title: "Diseño", desc: "Estructura de CRM, campañas y flujos." },
  { num: "03", title: "Implementación", desc: "Plataforma configurada y conectada." },
  { num: "04", title: "Operación", desc: "Agentes expertos en continuidad 24/7." },
];

export function ComoFunciona() {
  return (
    <section className="nelvyon-mkt-section--airy" style={{ backgroundColor: "#ffffff" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ maxWidth: 480, marginBottom: 56 }}>
          <p className="mkt-eyebrow">Proceso</p>
          <h2 className="mkt-h2 fade-in">Cómo funciona</h2>
          <p className="mkt-lead" style={{ marginTop: 14 }}>
            De diagnóstico a operación continua, con estructura clara en cada fase.
          </p>
        </div>
        <div
          className="nelvyon-como-funciona-timeline"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "clamp(16px, 2.5vw, 24px)",
          }}
        >
          {STEPS.map((step) => (
            <div key={step.num} className="mkt-card--dark">
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: NELVYON_BLUE,
                  letterSpacing: "0.1em",
                  marginBottom: 16,
                }}
              >
                {step.num}
              </div>
              <h3 className="mkt-card__title">{step.title}</h3>
              <p className="mkt-card__desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .nelvyon-como-funciona-timeline { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 520px) {
          .nelvyon-como-funciona-timeline { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
