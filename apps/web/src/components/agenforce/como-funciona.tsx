export function ComoFunciona() {
  const steps = [
    {
      num: 1,
      title: "Diagnóstico operativo",
      desc: "Analizamos tu situación actual: canales, procesos, herramientas, equipo, flujo comercial y necesidades reales de automatización.",
    },
    {
      num: 2,
      title: "Diseño del sistema",
      desc: "Definimos la estructura de trabajo: campañas, CRM, contenidos, automatizaciones, agentes expertos, reporting y prioridades operativas.",
    },
    {
      num: 3,
      title: "Implementación controlada",
      desc: "Configuramos el ecosistema NELVYON con los módulos y servicios necesarios para que tu operación quede centralizada y ordenada.",
    },
    {
      num: 4,
      title: "Operación continua",
      desc: "Los agentes expertos trabajan 24/7 ejecutando tareas, coordinando procesos, generando activos y manteniendo el sistema en funcionamiento.",
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
          Cómo funciona
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
