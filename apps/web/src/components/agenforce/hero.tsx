import React from "react";
import { Container } from "./container";
import { GradientDivider } from "./gradient-divider";
import { NELVYON_BLUE, NELVYON_NAVY } from "./marketing-brand";

const CHANNELS = ["Meta", "Google", "Email", "CRM", "WA", "SEO"];
const PIPELINE = [
  { stage: "Nuevo", width: "100%" },
  { stage: "Contactado", width: "68%" },
  { stage: "Propuesta", width: "42%" },
  { stage: "Cerrado", width: "18%" },
];

const ACTIVITY = [
  { action: "Flujo email activado", module: "Automatización" },
  { action: "Lead movido a Propuesta", module: "CRM" },
  { action: "Informe semanal generado", module: "Reporting" },
];

export const Hero = () => {
  return (
    <section
      className="relative overflow-hidden nelvyon-hero"
      style={{
        background: `linear-gradient(180deg, ${NELVYON_NAVY} 0%, #0a1835 60%, #0d2048 100%)`,
        paddingTop: "56px",
        paddingBottom: "0",
      }}
    >
      <Container>
        <div className="nelvyon-hero-copy" style={{ maxWidth: "720px", margin: "0 auto", textAlign: "center" }}>
          <p
            className="nelvyon-hero-eyebrow"
            style={{
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.45)",
              marginBottom: "16px",
            }}
          >
            Plataforma operativa · Agentes expertos
          </p>
          <h1
            className="fade-in"
            style={{
              fontSize: "clamp(28px, 4.5vw, 52px)",
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.12,
              letterSpacing: "-0.03em",
              margin: "0 0 16px",
            }}
          >
            Marketing operativo para empresas exigentes
          </h1>
          <p
            className="nelvyon-hero-subtitle"
            style={{
              fontSize: "clamp(15px, 1.5vw, 17px)",
              color: "rgba(255,255,255,0.72)",
              margin: "0 auto 24px",
              lineHeight: 1.55,
              maxWidth: "560px",
            }}
          >
            Centraliza campañas, CRM, contenidos y automatización en un ecosistema operado por agentes expertos con continuidad 24/7.
          </p>
          <div
            className="nelvyon-hero-ctas"
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "center",
              flexWrap: "wrap",
              marginBottom: "40px",
            }}
          >
            <a
              href="/contacto"
              style={{
                background: NELVYON_BLUE,
                color: "white",
                fontWeight: 600,
                fontSize: "14px",
                padding: "12px 24px",
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
                padding: "12px 24px",
                borderRadius: "8px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.22)",
                color: "rgba(255,255,255,0.9)",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Ver plataforma
            </a>
          </div>
        </div>

        <div
          className="nelvyon-dashboard-shell"
          style={{
            maxWidth: "1040px",
            margin: "0 auto",
            borderRadius: "10px 10px 0 0",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          }}
        >
          <div
            style={{
              background: "#0a1428",
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#ff5f57" }} />
            <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#febc2e" }} />
            <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#28c840" }} />
            <div
              style={{
                flex: 1,
                height: "22px",
                background: "rgba(255,255,255,0.05)",
                borderRadius: "6px",
                margin: "0 12px",
                display: "flex",
                alignItems: "center",
                padding: "0 10px",
              }}
            >
              <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>app.nelvyon.com · Panel operativo</span>
            </div>
          </div>
          <div style={{ display: "flex", background: NELVYON_NAVY, minHeight: "300px" }} className="nelvyon-dashboard-mock">
            <div
              style={{
                width: "168px",
                flexShrink: 0,
                background: "#050d1a",
                borderRight: "1px solid rgba(255,255,255,0.06)",
                padding: "14px 0",
              }}
              className="nelvyon-dashboard-sidebar"
            >
              <div style={{ padding: "0 12px 14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "22px", height: "22px", borderRadius: "6px", background: NELVYON_BLUE }} />
                <span style={{ color: "#ffffff", fontWeight: 700, fontSize: "11px" }}>NELVYON</span>
              </div>
              {["Dashboard", "CRM", "Campañas", "Automatizaciones", "Email", "Reporting"].map((item, i) => (
                <div
                  key={item}
                  style={{
                    padding: "7px 12px",
                    borderLeft: i === 0 ? `2px solid ${NELVYON_BLUE}` : "2px solid transparent",
                    background: i === 0 ? "rgba(0,132,252,0.1)" : "transparent",
                  }}
                >
                  <span style={{ color: i === 0 ? "#ffffff" : "rgba(255,255,255,0.4)", fontSize: "10px", fontWeight: i === 0 ? 600 : 400 }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "8px" }}>
                <div>
                  <div style={{ color: "#ffffff", fontSize: "13px", fontWeight: 700 }}>Vista general</div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "10px" }}>Operación continua · Última sincronización: hace 2 min</div>
                </div>
                <span style={{ fontSize: "10px", color: NELVYON_BLUE, fontWeight: 600, padding: "4px 8px", background: "rgba(0,132,252,0.12)", borderRadius: "6px" }}>
                  En línea
                </span>
              </div>
              <div
                className="nelvyon-dashboard-kpis"
                style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}
              >
                {[
                  { label: "Campañas", value: "Activas" },
                  { label: "CRM", value: "Centralizado" },
                  { label: "Flujos", value: "24/7" },
                  { label: "Reporting", value: "Al día" },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: "6px",
                      padding: "10px",
                    }}
                  >
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "9px", marginBottom: "4px" }}>{kpi.label}</div>
                    <div style={{ color: "#ffffff", fontSize: "11px", fontWeight: 600 }}>{kpi.value}</div>
                  </div>
                ))}
              </div>
              <div className="nelvyon-dashboard-main" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 0.9fr", gap: "8px", flex: 1 }}>
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "6px", padding: "12px" }}>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "9px", marginBottom: "8px" }}>Actividad por canal</div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "56px", marginBottom: "6px" }}>
                    {[40, 55, 38, 52, 44, 58].map((h, i) => (
                      <div
                        key={CHANNELS[i]}
                        style={{
                          flex: 1,
                          height: `${h}%`,
                          borderRadius: "2px 2px 0 0",
                          background: i === 5 ? NELVYON_BLUE : "rgba(0,132,252,0.22)",
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "2px" }}>
                    {CHANNELS.map((ch) => (
                      <span key={ch} style={{ fontSize: "8px", color: "rgba(255,255,255,0.35)", flex: 1, textAlign: "center" }}>
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "6px", padding: "12px" }}>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "9px", marginBottom: "8px" }}>Pipeline comercial</div>
                  {PIPELINE.map((row) => (
                    <div key={row.stage} style={{ marginBottom: "6px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                        <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.5)" }}>{row.stage}</span>
                      </div>
                      <div style={{ height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px" }}>
                        <div style={{ width: row.width, height: "100%", background: NELVYON_BLUE, borderRadius: "2px", opacity: 0.85 }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="nelvyon-dashboard-activity" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "6px", padding: "12px" }}>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "9px", marginBottom: "8px" }}>Actividad reciente</div>
                  {ACTIVITY.map((row) => (
                    <div key={row.action} style={{ padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.65)", lineHeight: 1.3 }}>{row.action}</div>
                      <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.35)" }}>{row.module}</div>
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
          .nelvyon-hero { padding-top: 48px !important; }
          .nelvyon-hero-eyebrow { display: none !important; }
          .nelvyon-hero-subtitle { margin-bottom: 20px !important; }
          .nelvyon-hero-ctas { margin-bottom: 28px !important; flex-direction: column !important; align-items: stretch !important; }
          .nelvyon-hero-ctas a { width: 100%; justify-content: center; }
          .nelvyon-dashboard-sidebar { display: none !important; }
          .nelvyon-dashboard-kpis { grid-template-columns: repeat(2, 1fr) !important; }
          .nelvyon-dashboard-main { grid-template-columns: 1fr !important; }
          .nelvyon-dashboard-activity { display: none !important; }
          .nelvyon-dashboard-mock { min-height: 220px !important; }
        }
        @media (max-width: 390px) {
          .nelvyon-dashboard-shell { margin-left: -8px; margin-right: -8px; border-radius: 8px 8px 0 0; }
        }
      `}</style>
    </section>
  );
};
