import React from "react";
import { Container } from "./container";
import { GradientDivider } from "./gradient-divider";
import { NELVYON_BLUE, NELVYON_NAVY } from "./marketing-brand";

const NAV = [
  { label: "Vista general", active: true },
  { label: "Pipeline", active: false },
  { label: "Campañas", active: false },
  { label: "Automatizaciones", active: false },
  { label: "Reporting", active: false },
];

const DEALS = [
  { company: "Grupo Meridian", stage: "Propuesta", status: "En revisión", owner: "AC" },
  { company: "Nova Retail", stage: "Contactado", status: "Activo", owner: "ML" },
  { company: "Atlas B2B", stage: "Nuevo", status: "Pendiente", owner: "JR" },
];

const ACTIVITY = [
  { time: "09:41", text: "Lead cualificado → Propuesta", tag: "CRM" },
  { time: "09:38", text: "Secuencia email activada", tag: "Email" },
  { time: "09:12", text: "Informe semanal generado", tag: "Reporting" },
];

export const Hero = () => {
  return (
    <section
      className="relative overflow-hidden nelvyon-hero"
      style={{
        paddingTop: "52px",
        paddingBottom: 0,
      }}
    >
      <Container>
        <div className="nelvyon-hero-copy" style={{ maxWidth: "680px", margin: "0 auto", textAlign: "center" }}>
          <p className="nelvyon-hero-eyebrow mkt-eyebrow" style={{ color: "rgba(255,255,255,0.55)", marginBottom: 18 }}>
            Plataforma operativa
          </p>
          <h1
            className="fade-in"
            style={{
              fontSize: "clamp(32px, 4.5vw, 54px)",
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.06,
              letterSpacing: "-0.04em",
              margin: "0 0 14px",
            }}
          >
            Marketing operativo para empresas exigentes
          </h1>
          <p
            className="nelvyon-hero-subtitle"
            style={{
              fontSize: "clamp(15px, 1.4vw, 17px)",
              color: "rgba(255,255,255,0.72)",
              margin: "0 auto 28px",
              lineHeight: 1.5,
              letterSpacing: "-0.012em",
              maxWidth: "480px",
            }}
          >
            Un sistema para campañas, CRM, automatización y reporting — operado con continuidad.
          </p>
          <div
            className="nelvyon-hero-ctas"
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              flexWrap: "wrap",
              marginBottom: 48,
            }}
          >
            <a
              href="/contacto"
              className="mkt-btn"
              style={{
                background: NELVYON_BLUE,
                color: "white",
                fontWeight: 600,
                fontSize: 14,
                padding: "11px 22px",
                borderRadius: 7,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Solicitar demo
            </a>
            <a
              href="/saas"
              className="mkt-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "11px 22px",
                borderRadius: 7,
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "rgba(255,255,255,0.88)",
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Ver SaaS
            </a>
          </div>
        </div>

        <div
          className="nelvyon-dashboard-shell"
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            borderRadius: "8px 8px 0 0",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
          }}
        >
          <div
            style={{
              background: "#060f1e",
              padding: "7px 14px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff5f57" }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#febc2e" }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#28c840" }} />
            <div
              style={{
                flex: 1,
                height: 24,
                background: "rgba(255,255,255,0.04)",
                borderRadius: 5,
                margin: "0 16px",
                display: "flex",
                alignItems: "center",
                padding: "0 10px",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.28)" }}>⌘K</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.32)" }}>Buscar en NELVYON…</span>
            </div>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", fontWeight: 500 }}>app.nelvyon.com</span>
          </div>

          <div style={{ display: "flex", background: "#07122a", minHeight: 380 }} className="nelvyon-dashboard-mock">
            <aside
              className="nelvyon-dashboard-sidebar"
              style={{
                width: 176,
                flexShrink: 0,
                background: "#050d1a",
                borderRight: "1px solid rgba(255,255,255,0.05)",
                padding: "12px 0",
              }}
            >
              <div style={{ padding: "0 12px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 20, height: 20, borderRadius: 5, background: NELVYON_BLUE }} />
                <span style={{ color: "#fff", fontWeight: 700, fontSize: 11, letterSpacing: "-0.02em" }}>NELVYON</span>
              </div>
              <div style={{ padding: "8px 12px 4px", fontSize: 8, fontWeight: 600, letterSpacing: "0.12em", color: "rgba(255,255,255,0.22)" }}>
                OPERACIÓN
              </div>
              {NAV.map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: "6px 12px",
                    margin: "1px 6px",
                    borderRadius: 5,
                    background: item.active ? "rgba(255,255,255,0.06)" : "transparent",
                    borderLeft: item.active ? `2px solid ${NELVYON_BLUE}` : "2px solid transparent",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: item.active ? 600 : 400,
                      color: item.active ? "#fff" : "rgba(255,255,255,0.38)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </aside>

            <div style={{ flex: 1, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.32)", marginBottom: 2 }}>Dashboard / Vista general</div>
                  <div style={{ color: "#fff", fontSize: 14, fontWeight: 650, letterSpacing: "-0.03em" }}>Operación comercial</div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", padding: "4px 8px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 5 }}>
                    Últ. sync · 2 min
                  </span>
                  <span style={{ fontSize: 9, color: NELVYON_BLUE, fontWeight: 600, padding: "4px 8px", background: "rgba(0,132,252,0.1)", borderRadius: 5 }}>
                    Operativo
                  </span>
                </div>
              </div>

              <div className="nelvyon-dashboard-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {[
                  { label: "Pipeline", status: "Activo" },
                  { label: "CRM", status: "Sincronizado" },
                  { label: "Automatizaciones", status: "Programado" },
                  { label: "Reporting", status: "En revisión" },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      borderRadius: 5,
                      padding: "10px 10px 8px",
                    }}
                  >
                    <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 8, marginBottom: 4, letterSpacing: "0.02em" }}>{kpi.label}</div>
                    <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: 600, letterSpacing: "-0.01em" }}>{kpi.status}</div>
                  </div>
                ))}
              </div>

              <div className="nelvyon-dashboard-main" style={{ display: "grid", gridTemplateColumns: "1.4fr 0.85fr", gap: 8, flex: 1, minHeight: 0 }}>
                <div
                  style={{
                    background: "rgba(255,255,255,0.015)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 5,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 0.7fr 0.6fr 0.35fr",
                      gap: 8,
                      padding: "8px 10px",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      fontSize: 8,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.3)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    <span>Empresa</span>
                    <span>Etapa</span>
                    <span>Estado</span>
                    <span>Resp.</span>
                  </div>
                  {DEALS.map((row, i) => (
                    <div
                      key={row.company}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.2fr 0.7fr 0.6fr 0.35fr",
                        gap: 8,
                        padding: "7px 10px",
                        borderBottom: i < DEALS.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                        fontSize: 10,
                        alignItems: "center",
                      }}
                    >
                      <span style={{ color: "rgba(255,255,255,0.82)", fontWeight: 500 }}>{row.company}</span>
                      <span style={{ color: "rgba(255,255,255,0.45)" }}>{row.stage}</span>
                      <span style={{ color: "rgba(255,255,255,0.55)", fontWeight: 500, fontSize: 9 }}>{row.status}</span>
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          background: "rgba(255,255,255,0.06)",
                          fontSize: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "rgba(255,255,255,0.5)",
                        }}
                      >
                        {row.owner}
                      </span>
                    </div>
                  ))}
                </div>

                <div
                  className="nelvyon-dashboard-activity"
                  style={{
                    background: "rgba(255,255,255,0.015)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 5,
                    padding: "10px",
                  }}
                >
                  <div style={{ fontSize: 8, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                    Actividad
                  </div>
                  {ACTIVITY.map((row) => (
                    <div key={row.text} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", width: 32, flexShrink: 0 }}>{row.time}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", lineHeight: 1.35 }}>{row.text}</div>
                        <span style={{ fontSize: 8, color: NELVYON_BLUE, opacity: 0.85 }}>{row.tag}</span>
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
          .nelvyon-hero { padding-top: 44px !important; }
          .nelvyon-hero-eyebrow { display: none !important; }
          .nelvyon-hero-subtitle { margin-bottom: 20px !important; }
          .nelvyon-hero-ctas { margin-bottom: 32px !important; flex-direction: column !important; align-items: stretch !important; }
          .nelvyon-hero-ctas a { width: 100%; justify-content: center; }
          .nelvyon-dashboard-sidebar { display: none !important; }
          .nelvyon-dashboard-kpis { grid-template-columns: repeat(2, 1fr) !important; }
          .nelvyon-dashboard-main { grid-template-columns: 1fr !important; }
          .nelvyon-dashboard-activity { display: none !important; }
          .nelvyon-dashboard-mock { min-height: 260px !important; }
        }
        @media (max-width: 390px) {
          .nelvyon-dashboard-shell { margin-left: -6px; margin-right: -6px; }
        }
      `}</style>
    </section>
  );
};
