export function ComparisonTable() {
  const features = [
    "Agentes expertos de marketing",
    "Campañas Meta + Google + TikTok",
    "WhatsApp & Email automatizado",
    "Dashboard unificado en tiempo real",
    "Generación de webs automática (OS)",
    "CRM integrado",
    "Soporte 24/7",
    "Sin contrato de permanencia",
    "Deploy instantáneo",
    "Precio mensual",
  ];
  const cols = [
    {
      name: "NELVYON",
      highlight: true,
      values: ["✅", "✅", "✅", "✅", "✅", "✅", "✅", "✅", "✅", "€97–€797"],
    },
    {
      name: "GoHighLevel",
      highlight: false,
      values: ["❌", "Parcial", "✅", "✅", "❌", "✅", "✅", "✅", "❌", "$97–$497"],
    },
    {
      name: "HubSpot",
      highlight: false,
      values: ["❌", "❌", "Parcial", "✅", "❌", "✅", "Parcial", "❌", "❌", "$800–$3.600"],
    },
    {
      name: "Agencia tradicional",
      highlight: false,
      values: ["❌", "Manual", "Manual", "❌", "❌", "❌", "Laboral", "❌", "❌", "€2.000–€8.000"],
    },
  ];
  return (
    <section style={{ backgroundColor: "#f8faff", padding: "96px 0" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#1a7fc4", marginBottom: "12px" }}>
            Comparativa honesta
          </p>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#07122a", margin: "0 0 16px" }}>
            NELVYON vs el resto del mundo
          </h2>
          <p style={{ fontSize: "18px", color: "#5a6a8a", maxWidth: "520px", margin: "0 auto" }}>
            Más funcionalidades, mejor precio, totalmente autónomo.
          </p>
        </div>
        <div style={{ overflowX: "auto", borderRadius: "24px", border: "1px solid #e8eef8", boxShadow: "0 8px 40px rgba(7,18,42,0.08)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#ffffff" }}>
            <thead>
              <tr>
                <th style={{ padding: "20px 24px", textAlign: "left", backgroundColor: "#ffffff", borderBottom: "2px solid #e8eef8", fontSize: "14px", fontWeight: 700, color: "#5a6a8a", width: "30%" }}>
                  Características
                </th>
                {cols.map((col, i) => (
                  <th
                    key={i}
                    style={{
                      padding: "20px 24px",
                      textAlign: "center",
                      borderBottom: "2px solid #e8eef8",
                      backgroundColor: col.highlight ? "#07122a" : "#ffffff",
                      color: col.highlight ? "#ffffff" : "#07122a",
                      fontSize: "15px",
                      fontWeight: 800,
                      borderRadius: i === 0 ? "24px 0 0 0" : i === cols.length - 1 ? "0 24px 0 0" : "0",
                    }}
                  >
                    {col.highlight && (
                      <span style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "#4db8e8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>
                        Recomendado
                      </span>
                    )}
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((feat, fi) => (
                <tr key={fi} style={{ borderBottom: fi < features.length - 1 ? "1px solid #f0f4fc" : "none" }}>
                  <td style={{ padding: "16px 24px", fontSize: "14px", fontWeight: 600, color: "#07122a" }}>{feat}</td>
                  {cols.map((col, ci) => (
                    <td
                      key={ci}
                      style={{
                        padding: "16px 24px",
                        textAlign: "center",
                        fontSize: "14px",
                        backgroundColor: col.highlight ? (fi % 2 === 0 ? "#f0f7ff" : "#ffffff") : "transparent",
                        color: col.values[fi] === "✅" ? "#16a34a" : col.values[fi] === "❌" ? "#dc2626" : "#1a7fc4",
                        fontWeight: col.highlight ? 700 : 400,
                      }}
                    >
                      {col.values[fi]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
