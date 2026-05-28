export function Stats() {
  const principios = [
    {
      title: "Sin promesas infladas",
      desc: "No prometemos cifras que no dependen únicamente de una plataforma o una campaña. Trabajamos con metodología, medición y criterio profesional.",
    },
    {
      title: "Visibilidad completa",
      desc: "Cada acción debe poder revisarse, analizarse y entenderse. La empresa debe saber qué se está haciendo y por qué.",
    },
    {
      title: "Procesos antes que improvisación",
      desc: "El marketing serio no depende de golpes de suerte. Depende de sistemas, consistencia, datos y ejecución ordenada.",
    },
    {
      title: "Agentes expertos operativos",
      desc: "NELVYON utiliza agentes expertos para ejecutar tareas específicas de marketing, ventas, contenido, automatización y análisis sin intervención humana constante.",
    },
    {
      title: "Tecnología con soporte humano",
      desc: "La automatización aporta velocidad y continuidad. El criterio estratégico aporta dirección, control y coherencia.",
    },
  ];
  return (
    <section style={{ backgroundColor: "#f8faff", padding: "0 0 64px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#0084fc", marginBottom: "12px" }}>
            Principios de trabajo
          </p>
          <h2 className="fade-in" style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#07122a", margin: 0 }}>
            Cómo trabajamos en NELVYON
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "24px" }}>
          {principios.map((p, i) => (
            <div
              key={i}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e8eef8",
                borderRadius: "20px",
                padding: "32px 28px",
                textAlign: "left",
                boxShadow: "0 4px 20px rgba(7,18,42,0.06)",
              }}
            >
              <div style={{ fontSize: "17px", fontWeight: 800, color: "#07122a", marginBottom: "12px", lineHeight: 1.3 }}>
                {p.title}
              </div>
              <div style={{ fontSize: "14px", color: "#5a6a8a", lineHeight: 1.6 }}>
                {p.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
