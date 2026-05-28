export function ComoFunciona() {
  const steps = [
    {
      num: 1,
      title: "Auditoría gratuita",
      desc: "Analizamos tu negocio, competencia y oportunidades en 24h.",
    },
    {
      num: 2,
      title: "Estrategia personalizada",
      desc: "Agentes expertos diseñan tu plan de crecimiento a medida.",
    },
    {
      num: 3,
      title: "Ejecución automática",
      desc: "Lanzamos y optimizamos campañas sin que toques nada.",
    },
    {
      num: 4,
      title: "Resultados medibles",
      desc: "Ves el ROI real en tu dashboard en tiempo real.",
    },
  ];

  return (
    <section style={{ backgroundColor: "#07122a" }}>
      <div
        aria-hidden
        style={{ background: "linear-gradient(to bottom, #ffffff, #07122a)", height: "80px" }}
      />
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "64px 24px" }}>
        <h2
          className="fade-in"
          style={{
            fontSize: "clamp(28px, 4vw, 44px)",
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
            margin: "0 0 48px",
          }}
        >
          Resultados en 4 pasos
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "32px",
          }}
        >
          {steps.map((step) => (
            <div key={step.num} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "clamp(48px, 6vw, 72px)",
                  fontWeight: 900,
                  color: "#0084fc",
                  lineHeight: 1,
                  marginBottom: "16px",
                }}
              >
                {step.num}
              </div>
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "#ffffff",
                  margin: "0 0 12px",
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  fontSize: "15px",
                  color: "#a8c8e8",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div
        aria-hidden
        style={{ background: "linear-gradient(to bottom, #07122a, #ffffff)", height: "80px" }}
      />
    </section>
  );
}
