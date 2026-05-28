export function PlataformaOs() {
  const orbit = [
    "Ads",
    "CRM",
    "Email",
    "WhatsApp",
    "SEO",
    "Contenido",
    "Reporting",
    "Ecommerce",
    "Automatización",
  ];

  return (
    <section style={{ backgroundColor: "#07122a", padding: "96px 0" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", maxWidth: "640px", margin: "0 auto 56px" }}>
          <p
            style={{
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#0084fc",
              marginBottom: "16px",
            }}
          >
            Infraestructura
          </p>
          <h2
            className="fade-in"
            style={{
              fontSize: "clamp(26px, 3.5vw, 40px)",
              fontWeight: 800,
              color: "#ffffff",
              margin: "0 0 16px",
              lineHeight: 1.15,
            }}
          >
            Una plataforma. Un equipo. Un sistema operativo.
          </h2>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.65)", lineHeight: 1.7, margin: 0 }}>
            NELVYON une lo que normalmente trabaja separado: estrategia, campañas, contenidos, CRM, automatización, reporting y agentes expertos.
          </p>
        </div>
        <div
          className="nelvyon-os-diagram"
          style={{
            position: "relative",
            maxWidth: "720px",
            margin: "0 auto",
            minHeight: "420px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "8%",
              border: "1px dashed rgba(255,255,255,0.12)",
              borderRadius: "50%",
            }}
          />
          <div
            style={{
              width: "200px",
              height: "200px",
              borderRadius: "16px",
              background: "linear-gradient(145deg, rgba(0,132,252,0.15) 0%, rgba(7,18,42,0.9) 100%)",
              border: "1px solid rgba(0,132,252,0.35)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "24px",
              zIndex: 2,
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#0084fc", marginBottom: "8px" }}>
              Núcleo
            </div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em" }}>NELVYON OS</div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "8px", lineHeight: 1.4 }}>
              Coordinación operativa central
            </div>
          </div>
          <div
            className="nelvyon-os-orbit"
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "12px",
              padding: "0",
            }}
          >
            {orbit.map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.75)",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    padding: "8px 14px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        .nelvyon-os-orbit > div:nth-child(5) { grid-column: 2; }
        @media (max-width: 640px) {
          .nelvyon-os-orbit {
            position: static !important;
            display: flex !important;
            flex-wrap: wrap !important;
            justify-content: center !important;
            gap: 8px !important;
            margin-top: 240px !important;
          }
          .nelvyon-os-diagram { min-height: auto !important; flex-direction: column !important; padding-bottom: 24px !important; }
          .nelvyon-os-diagram > div:first-of-type { display: none !important; }
        }
      `}</style>
    </section>
  );
}
