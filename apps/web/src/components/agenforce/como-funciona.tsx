export function ComoFunciona() {
  const steps = [
    {
      num: "01",
      title: "Diagnóstico operativo",
      desc: "Analizamos canales, procesos, herramientas, equipo comercial y necesidades reales de automatización.",
    },
    {
      num: "02",
      title: "Diseño del sistema",
      desc: "Definimos la estructura de campañas, CRM, contenidos, agentes expertos, reporting y flujos de trabajo.",
    },
    {
      num: "03",
      title: "Implementación controlada",
      desc: "Configuramos la plataforma, conectamos herramientas y dejamos cada módulo preparado para operar.",
    },
    {
      num: "04",
      title: "Operación continua",
      desc: "Los agentes expertos mantienen tareas, flujos y procesos activos 24/7 según la configuración definida.",
    },
  ];

  return (
    <section style={{ backgroundColor: "#07122a", padding: "96px 0" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <p style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#0084fc", marginBottom: "12px" }}>
            Proceso
          </p>
          <h2 className="fade-in" style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800, color: "#ffffff", margin: 0 }}>
            Cómo funciona
          </h2>
        </div>
        <div
          className="nelvyon-como-funciona-timeline"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "24px",
            position: "relative",
          }}
        >
          <div
            aria-hidden
            className="nelvyon-timeline-line"
            style={{
              position: "absolute",
              top: "28px",
              left: "12%",
              right: "12%",
              height: "1px",
              background: "rgba(255,255,255,0.1)",
            }}
          />
          {steps.map((step) => (
            <div key={step.num} style={{ position: "relative", zIndex: 1 }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "12px",
                  background: "rgba(0,132,252,0.12)",
                  border: "1px solid rgba(0,132,252,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#0084fc",
                  marginBottom: "20px",
                }}
              >
                {step.num}
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff", margin: "0 0 10px", lineHeight: 1.3 }}>{step.title}</h3>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .nelvyon-como-funciona-timeline { grid-template-columns: 1fr !important; gap: 32px !important; }
          .nelvyon-timeline-line { display: none !important; }
        }
      `}</style>
    </section>
  );
}
