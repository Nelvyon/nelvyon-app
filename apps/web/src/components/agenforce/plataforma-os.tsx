const MODULOS = [
  "Ads",
  "CRM",
  "Email",
  "WhatsApp",
  "SEO",
  "Contenido",
  "Reporting",
  "Automatización",
];

export function PlataformaOs() {
  return (
    <section className="nelvyon-mkt-section--compact" style={{ backgroundColor: "#07122a" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: "clamp(40px, 6vw, 72px)",
            alignItems: "center",
          }}
          className="nelvyon-os-layout"
        >
          <div>
            <p className="mkt-eyebrow" style={{ color: "rgba(0,132,252,0.9)" }}>
              Infraestructura
            </p>
            <h2 className="mkt-h2 mkt-h2--light fade-in" style={{ marginBottom: 14 }}>
              Un sistema operativo para marketing
            </h2>
            <p className="mkt-lead mkt-lead--light" style={{ maxWidth: 400 }}>
              Estrategia, campañas, CRM y reporting — coordinados desde un núcleo, no desde herramientas aisladas.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              justifyContent: "flex-end",
            }}
          >
            <div
              style={{
                width: "100%",
                marginBottom: 12,
                padding: "16px 18px",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", marginBottom: 6 }}>
                NÚCLEO
              </div>
              <div style={{ fontSize: 20, fontWeight: 650, color: "#fff", letterSpacing: "-0.03em" }}>NELVYON OS</div>
            </div>
            {MODULOS.map((label) => (
              <span
                key={label}
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.65)",
                  letterSpacing: "-0.01em",
                  padding: "8px 12px",
                  borderRadius: 5,
                  border: "1px solid rgba(255,255,255,0.07)",
                  background: "rgba(255,255,255,0.02)",
                  transition: "border-color 0.2s ease, background 0.2s ease",
                }}
                className="nelvyon-os-chip"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        .nelvyon-os-chip:hover {
          border-color: rgba(0, 132, 252, 0.35);
          background: rgba(0, 132, 252, 0.06);
        }
        @media (max-width: 768px) {
          .nelvyon-os-layout { grid-template-columns: 1fr !important; }
          .nelvyon-os-layout > div:last-child { justify-content: flex-start !important; }
        }
      `}</style>
    </section>
  );
}
