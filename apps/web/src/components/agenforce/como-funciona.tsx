const STEPS = [
  { num: "01", title: "Diagnóstico", desc: "Canales, procesos y necesidades reales." },
  { num: "02", title: "Diseño", desc: "Estructura de CRM, campañas y flujos." },
  { num: "03", title: "Implementación", desc: "Plataforma configurada y conectada." },
  { num: "04", title: "Operación", desc: "Agentes expertos en continuidad 24/7." },
];

export function ComoFunciona() {
  return (
    <section className="nelvyon-mkt-section--airy" style={{ backgroundColor: "#07122a" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ maxWidth: 480, marginBottom: 56 }}>
          <p className="mkt-eyebrow" style={{ color: "rgba(0,132,252,0.9)" }}>
            Proceso
          </p>
          <h2 className="mkt-h2 mkt-h2--light fade-in">Cómo funciona</h2>
        </div>
        <div
          className="nelvyon-como-funciona-timeline"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "clamp(20px, 3vw, 40px)",
          }}
        >
          {STEPS.map((step) => (
            <div key={step.num}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.28)",
                  letterSpacing: "0.08em",
                  marginBottom: 14,
                }}
              >
                {step.num}
              </div>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#ffffff",
                  margin: "0 0 8px",
                  lineHeight: 1.25,
                  letterSpacing: "-0.025em",
                }}
              >
                {step.title}
              </h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.48)", lineHeight: 1.45, margin: 0 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .nelvyon-como-funciona-timeline { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 520px) {
          .nelvyon-como-funciona-timeline { grid-template-columns: 1fr !important; gap: 28px !important; }
        }
      `}</style>
    </section>
  );
}
