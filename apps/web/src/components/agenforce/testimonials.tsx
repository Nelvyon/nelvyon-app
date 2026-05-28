export function Testimonials() {
  const perfiles = [
    {
      name: "Empresas en crecimiento",
      role: "",
      avatar: "EC",
      text: "Para equipos que ya tienen actividad comercial y necesitan una estructura más sólida para gestionar campañas, leads, contenidos y seguimiento.",
      stars: 0,
    },
    {
      name: "Agencias de marketing",
      role: "",
      avatar: "AM",
      text: "Para agencias que quieren apoyarse en una infraestructura más completa para gestionar clientes, procesos y entregas.",
      stars: 0,
    },
    {
      name: "Equipos comerciales",
      role: "",
      avatar: "EQ",
      text: "Para departamentos que necesitan organizar oportunidades, automatizar seguimiento y mantener visibilidad sobre cada fase del pipeline.",
      stars: 0,
    },
    {
      name: "Negocios digitales y ecommerce",
      role: "",
      avatar: "NE",
      text: "Para empresas que necesitan conectar campañas, catálogo, audiencias, automatizaciones, email, WhatsApp y reporting en un único sistema.",
      stars: 0,
    },
  ];
  return (
    <section style={{ backgroundColor: "#ffffff", padding: "64px 0" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#0084fc", marginBottom: "12px" }}>
            Para quién es
          </p>
          <h2 className="fade-in" style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#07122a", margin: 0 }}>
            Perfiles que encajan con NELVYON
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
          {perfiles.map((t, i) => (
            <div
              key={i}
              style={{
                backgroundColor: "#f8faff",
                border: "1px solid #e8eef8",
                borderRadius: "20px",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <p style={{ fontSize: "15px", color: "#374151", lineHeight: 1.6, margin: 0 }}>
                {t.text}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "auto" }}>
                <div style={{
                  width: "42px", height: "42px", borderRadius: "50%",
                  background: "linear-gradient(135deg, #07122a, #0084fc)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: "13px", fontWeight: 700, flexShrink: 0,
                }}>
                  {t.avatar}
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#07122a" }}>{t.name}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
