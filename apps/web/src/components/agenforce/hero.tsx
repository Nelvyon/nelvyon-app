import React from "react";
import { Container } from "./container";
import { GradientDivider } from "./gradient-divider";

export const Hero = () => {
  const kpiLabels = [
    { label: "Campañas", status: "Operativo" },
    { label: "CRM", status: "Centralizado" },
    { label: "Automatizaciones", status: "En ejecución" },
    { label: "Reporting", status: "Actualizado" },
  ];

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #07122a 0%, #0a1835 55%, #0d2048 100%)",
        paddingTop: "72px",
        paddingBottom: "0",
      }}
    >
      <Container>
        <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
          <p
            style={{
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.45)",
              marginBottom: "20px",
            }}
          >
            Plataforma operativa · Agentes expertos · Operación 24/7
          </p>
          <h1
            className="fade-in"
            style={{
              fontSize: "clamp(32px, 5vw, 56px)",
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              margin: "0 0 20px 0",
            }}
          >
            Marketing operativo para empresas exigentes
          </h1>
          <p
            className="nelvyon-hero-subtitle"
            style={{
              fontSize: "clamp(16px, 1.6vw, 18px)",
              color: "rgba(255,255,255,0.72)",
              margin: "0 auto 28px",
              lineHeight: 1.55,
              maxWidth: "600px",
            }}
          >
            Servicios profesionales, automatización y agentes expertos en un único ecosistema para operar marketing, ventas y procesos comerciales con continuidad.
          </p>
          <p
            className="nelvyon-hero-tagline"
            style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.4)",
              margin: "0 0 32px",
              fontStyle: "italic",
            }}
          >
            Donde nace tu imperio, crece tu marca y se impone tu legado
          </p>
          <div
            className="nelvyon-hero-ctas"
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              flexWrap: "wrap",
              marginBottom: "56px",
            }}
          >
            <a
              href="/contacto"
              style={{
                background: "#0084fc",
                color: "white",
                fontWeight: 600,
                fontSize: "15px",
                padding: "14px 28px",
                borderRadius: "8px",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Solicitar demo
            </a>
            <a
              href="/saas"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "14px 28px",
                borderRadius: "8px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.25)",
                color: "rgba(255,255,255,0.9)",
                fontSize: "15px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Ver plataforma
            </a>
          </div>
        </div>

        <div
          style={{
            maxWidth: "1040px",
            margin: "0 auto",
            borderRadius: "12px 12px 0 0",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
          }}
        >
          <div
            style={{
              background: "#0a1428",
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ff5f57" }} />
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#febc2e" }} />
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#28c840" }} />
            <div style={{ flex: 1, height: "20px", background: "rgba(255,255,255,0.05)", borderRadius: "6px", margin: "0 16px" }} />
          </div>
          <div style={{ display: "flex", background: "#07122a", minHeight: "280px" }} className="nelvyon-dashboard-mock">
            <div
              style={{
                width: "180px",
                flexShrink: 0,
                background: "#050d1a",
                borderRight: "1px solid rgba(255,255,255,0.06)",
                padding: "16px 0",
              }}
              className="nelvyon-dashboard-sidebar"
            >
              <div style={{ padding: "0 14px 16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "#0084fc" }} />
                <span style={{ color: "#ffffff", fontWeight: 700, fontSize: "12px" }}>NELVYON</span>
              </div>
              {["Dashboard", "CRM", "Campañas", "Automatizaciones", "Email", "Reporting"].map((item, i) => (
                <div
                  key={item}
                  style={{
                    padding: "8px 14px",
                    borderLeft: i === 0 ? "2px solid #0084fc" : "2px solid transparent",
                    background: i === 0 ? "rgba(0,132,252,0.1)" : "transparent",
                  }}
                >
                  <span style={{ color: i === 0 ? "#ffffff" : "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: i === 0 ? 600 : 400 }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ flex: 1, padding: "20px" }}>
              <div style={{ color: "#ffffff", fontSize: "14px", fontWeight: 700, marginBottom: "4px" }}>Panel operativo</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", marginBottom: "16px" }}>Vista centralizada · Operación continua</div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "10px",
                  marginBottom: "12px",
                }}
                className="nelvyon-dashboard-kpis"
              >
                {kpiLabels.map((kpi) => (
                  <div
                    key={kpi.label}
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: "8px",
                      padding: "12px",
                    }}
                  >
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "9px", marginBottom: "6px" }}>{kpi.label}</div>
                    <div style={{ color: "#0084fc", fontSize: "11px", fontWeight: 600 }}>{kpi.status}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: "10px" }} className="nelvyon-dashboard-charts">
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", padding: "14px", minHeight: "100px" }}>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "10px", marginBottom: "10px" }}>Actividad por canal</div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "5px", height: "64px" }}>
                    {[35, 50, 42, 58, 48, 62].map((h, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: `${h}%`,
                          borderRadius: "3px 3px 0 0",
                          background: i === 5 ? "#0084fc" : "rgba(0,132,252,0.2)",
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", padding: "14px" }}>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "10px", marginBottom: "10px" }}>Pipeline</div>
                  {["Nuevo", "Contactado", "Propuesta", "Cerrado"].map((s, i) => (
                    <div key={s} style={{ marginBottom: "6px" }}>
                      <div style={{ height: "3px", background: "rgba(255,255,255,0.08)", borderRadius: "2px" }}>
                        <div style={{ width: `${[100, 70, 40, 20][i]}%`, height: "100%", background: "#0084fc", borderRadius: "2px", opacity: 0.5 + i * 0.12 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
      <GradientDivider />
      <style>{`
        @media (max-width: 768px) {
          .nelvyon-hero-tagline { display: none !important; }
          .nelvyon-hero-subtitle { font-size: 15px !important; margin-bottom: 24px !important; }
          .nelvyon-dashboard-sidebar { display: none !important; }
          .nelvyon-dashboard-kpis { grid-template-columns: repeat(2, 1fr) !important; }
          .nelvyon-dashboard-charts { grid-template-columns: 1fr !important; }
          .nelvyon-hero-ctas { flex-direction: column !important; align-items: stretch !important; }
          .nelvyon-hero-ctas a { width: 100%; justify-content: center; }
        }
      `}</style>
    </section>
  );
};
