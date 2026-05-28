export function Diferenciadores() {
  const items = [
    { title: "Plataforma y servicio en un mismo ecosistema", desc: "NELVYON no es solo una herramienta ni solo una agencia. Une tecnología operativa y ejecución profesional." },
    { title: "Operación 24/7", desc: "Los agentes expertos mantienen procesos activos de forma continua según la configuración definida." },
    { title: "Centralización real", desc: "Menos herramientas aisladas. Más control desde un entorno único." },
    { title: "Sin permanencia forzada", desc: "Relación mes a mes, con foco en utilidad real, claridad y continuidad profesional." },
    { title: "Preparado para escalar", desc: "Estructura para negocios locales, empresas en crecimiento, ecommerce y agencias." },
  ];

  return (
    <section className="nelvyon-mkt-section" style={{ backgroundColor: "#f8faff" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <p style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#0084fc", marginBottom: "12px" }}>
            Diferenciadores
          </p>
          <h2 className="fade-in" style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800, color: "#07122a", margin: 0 }}>
            Por qué NELVYON
          </h2>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {items.map((d) => (
            <div
              key={d.title}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e8eef8",
                borderRadius: "12px",
                padding: "24px",
              }}
            >
              <p style={{ fontSize: "15px", fontWeight: 700, color: "#07122a", margin: "0 0 8px", lineHeight: 1.35 }}>{d.title}</p>
              <p style={{ fontSize: "14px", color: "#5a6a8a", margin: 0, lineHeight: 1.55 }}>{d.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
