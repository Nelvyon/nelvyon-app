export function Stats() {
  const stats = [
    { value: "10M+", label: "Clientes objetivo", sub: "proyectados para 2030" },
    { value: "€2.4B", label: "ARR potencial", sub: "en mercado addressable" },
    { value: "24/7", label: "Automatización", sub: "sin intervención humana" },
    { value: "3x", label: "ROI medio", sub: "frente a agencias tradicionales" },
  ];
  return (
    <section style={{ backgroundColor: "#f8faff", padding: "0 0 64px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#0084fc", marginBottom: "12px" }}>
            Resultados reales
          </p>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#07122a", margin: 0 }}>
            Números que hablan por sí solos
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "24px" }}>
          {stats.map((s, i) => (
            <div
              key={i}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e8eef8",
                borderRadius: "20px",
                padding: "36px 28px",
                textAlign: "center",
                boxShadow: "0 4px 20px rgba(7,18,42,0.06)",
              }}
            >
              <div style={{ fontSize: "clamp(40px, 5vw, 56px)", fontWeight: 900, color: "#0084fc", lineHeight: 1, marginBottom: "8px" }}>
                {s.value}
              </div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#07122a", marginBottom: "4px" }}>
                {s.label}
              </div>
              <div style={{ fontSize: "13px", color: "#6b7a99" }}>
                {s.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
