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
        <h2 style={{ color: "#07122a", fontSize: "clamp(24px, 3.5vw, 40px)", margin: "0 0 24px", fontWeight: 800, textAlign: "center" }}>
          NELVYON vs Agencias Tradicionales vs Otras Plataformas
        </h2>
        <div style={{ overflowX: "auto", borderRadius: "16px", border: "1px solid #dbe7fb" }}>
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
              {rows.map((row) => (
                <tr key={row.feature} style={{ borderTop: "1px solid #e6efff" }}>
                  <td style={{ padding: "14px 16px", fontWeight: 700, color: "#07122a" }}>{row.feature}</td>
                  <td style={{ padding: "14px 16px", textAlign: "center", color: "#1a7fc4", fontWeight: 700 }}>{row.nelvyon}</td>
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
