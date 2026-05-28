export function ComparisonTable() {
  const rows = [
    { feature: "Precio", nelvyon: "Desde €97/mes", agencia: "€2.000–€10.000", plataformas: "€200–€500" },
    { feature: "Agentes expertos 24/7", nelvyon: "✅", agencia: "❌", plataformas: "⚠️" },
    { feature: "Automatización completa", nelvyon: "✅", agencia: "❌", plataformas: "⚠️" },
    { feature: "Sin contrato", nelvyon: "✅", agencia: "❌", plataformas: "✅" },
    { feature: "Resultados en 48h", nelvyon: "✅", agencia: "❌", plataformas: "⚠️" },
    { feature: "Escalable al instante", nelvyon: "✅", agencia: "❌", plataformas: "⚠️" },
  ];

  return (
    <section style={{ backgroundColor: "#f8faff", padding: "64px 0" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#0084fc", marginBottom: "12px" }}>
            Comparativa honesta
          </p>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#07122a", margin: "0 0 16px" }}>
            NELVYON vs Agencias vs Otras Plataformas
          </h2>
        </div>
        <div style={{ overflowX: "auto", borderRadius: "16px", border: "1px solid #dbe7fb", boxShadow: "0 8px 40px rgba(7,18,42,0.08)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "760px", backgroundColor: "#ffffff" }}>
            <thead>
              <tr style={{ backgroundColor: "#07122a" }}>
                <th style={{ color: "#ffffff", textAlign: "left", padding: "16px" }}>Comparativa</th>
                <th style={{ color: "#ffffff", textAlign: "center", padding: "16px" }}>NELVYON</th>
                <th style={{ color: "#ffffff", textAlign: "center", padding: "16px" }}>Agencias Tradicionales</th>
                <th style={{ color: "#ffffff", textAlign: "center", padding: "16px" }}>Otras Plataformas</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.feature} style={{ borderTop: "1px solid #e6efff", backgroundColor: index % 2 === 0 ? "#ffffff" : "#f0f7ff" }}>
                  <td style={{ padding: "14px 16px", fontWeight: 700, color: "#07122a" }}>{row.feature}</td>
                  <td style={{ padding: "14px 16px", textAlign: "center", color: "#0084fc", fontWeight: 700 }}>{row.nelvyon}</td>
                  <td style={{ padding: "14px 16px", textAlign: "center", color: "#3f4e6b" }}>{row.agencia}</td>
                  <td style={{ padding: "14px 16px", textAlign: "center", color: "#3f4e6b" }}>{row.plataformas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
