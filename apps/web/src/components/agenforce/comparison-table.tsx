export function ComparisonTable() {
  const rows = [
    { feature: "Precio mensual", nelvyon: "Desde €97/mes", agencia: "€2.000–€10.000", plataformas: "€200–€500" },
    { feature: "Agentes expertos 24/7", nelvyon: "Sí", agencia: "No", plataformas: "Parcial" },
    { feature: "Servicios + plataforma", nelvyon: "Sí", agencia: "No", plataformas: "No" },
    { feature: "Sin permanencia forzada", nelvyon: "Sí", agencia: "No", plataformas: "Variable" },
    { feature: "Centralización operativa", nelvyon: "Sí", agencia: "Parcial", plataformas: "Parcial" },
    { feature: "Reporting integrado", nelvyon: "Sí", agencia: "Parcial", plataformas: "Parcial" },
  ];

  return (
    <section style={{ backgroundColor: "#f8faff", padding: "80px 0" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <p style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#0084fc", marginBottom: "12px" }}>
            Comparativa
          </p>
          <h2 className="mkt-h2" style={{ margin: "0 0 12px" }}>
            NELVYON frente a otras opciones
          </h2>
          <p className="mkt-lead" style={{ margin: "0 auto", maxWidth: "520px" }}>
            Referencia orientativa. No implica promesas de rendimiento.
          </p>
        </div>
        <div style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid #e8eef8" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "640px", backgroundColor: "#ffffff" }}>
            <thead>
              <tr style={{ backgroundColor: "#07122a" }}>
                <th style={{ color: "rgba(255,255,255,0.9)", textAlign: "left", padding: "14px 16px", fontSize: "13px", fontWeight: 600 }}>Criterio</th>
                <th style={{ color: "#ffffff", textAlign: "center", padding: "14px 16px", fontSize: "13px", fontWeight: 600 }}>NELVYON</th>
                <th style={{ color: "rgba(255,255,255,0.7)", textAlign: "center", padding: "14px 16px", fontSize: "13px", fontWeight: 600 }}>Agencia tradicional</th>
                <th style={{ color: "rgba(255,255,255,0.7)", textAlign: "center", padding: "14px 16px", fontSize: "13px", fontWeight: 600 }}>Herramientas sueltas</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.feature} style={{ borderTop: "1px solid #e8eef8", backgroundColor: index % 2 === 0 ? "#ffffff" : "#fafbfd" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "#07122a", fontSize: "14px" }}>{row.feature}</td>
                  <td style={{ padding: "12px 16px", textAlign: "center", color: "#07122a", fontWeight: 600, fontSize: "14px" }}>{row.nelvyon}</td>
                  <td style={{ padding: "12px 16px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>{row.agencia}</td>
                  <td style={{ padding: "12px 16px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>{row.plataformas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
