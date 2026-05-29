import React from "react";
import { Container } from "./container";
import { GradientDivider } from "./gradient-divider";
import { NELVYON_BLUE } from "./marketing-brand";

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
    <section className="relative overflow-hidden nelvyon-hero">
      <Container className="nelvyon-hero-container">
        <div className="nelvyon-hero-grid">
          <div className="nelvyon-hero-copy">
            <p className="nelvyon-hero-eyebrow mkt-eyebrow" style={{ color: "rgba(255,255,255,0.58)" }}>
              Plataforma operativa
            </p>
            <h1 className="mkt-h1 fade-in">Marketing operativo para empresas exigentes</h1>
            <p className="nelvyon-hero-subtitle mkt-lead--light">
              Un sistema para campañas, CRM, automatización y reporting — operado con continuidad.
            </p>
            <div className="nelvyon-hero-ctas">
              <a href="/contacto" className="mkt-btn nelvyon-btn-primary">
                Solicitar demo
              </a>
              <a href="/saas" className="mkt-btn nelvyon-btn-ghost">
                Ver SaaS
              </a>
            </div>
          </div>

          <div className="nelvyon-hero-visual">
            <div className="nelvyon-hero-glow" aria-hidden />
            <div className="nelvyon-dashboard-shell">
              <div className="nelvyon-dashboard-chrome">
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff5f57" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#febc2e" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#28c840" }} />
                <div className="nelvyon-dashboard-search">
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.28)" }}>⌘K</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.32)" }}>Buscar en NELVYON…</span>
                </div>
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", fontWeight: 500 }}>app.nelvyon.com</span>
              </div>

              <div className="nelvyon-dashboard-mock">
                <aside className="nelvyon-dashboard-sidebar">
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

                <div style={{ flex: 1, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
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

                  <div className="nelvyon-dashboard-kpis">
                    {[
                      { label: "Pipeline", status: "Activo" },
                      { label: "CRM", status: "Sincronizado" },
                      { label: "Automatizaciones", status: "Programado" },
                      { label: "Reporting", status: "En revisión" },
                    ].map((kpi) => (
                      <div key={kpi.label} className="nelvyon-dashboard-kpi">
                        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 8, marginBottom: 4, letterSpacing: "0.02em" }}>{kpi.label}</div>
                        <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: 600, letterSpacing: "-0.01em" }}>{kpi.status}</div>
                      </div>
                    ))}
                  </div>

                  <div className="nelvyon-dashboard-main">
                    <div className="nelvyon-dashboard-table">
                      <div className="nelvyon-dashboard-table-head">
                        <span>Empresa</span>
                        <span>Etapa</span>
                        <span>Estado</span>
                        <span>Resp.</span>
                      </div>
                      {DEALS.map((row, i) => (
                        <div key={row.company} className="nelvyon-dashboard-table-row" style={{ borderBottom: i < DEALS.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
                          <span style={{ color: "rgba(255,255,255,0.82)", fontWeight: 500 }}>{row.company}</span>
                          <span style={{ color: "rgba(255,255,255,0.45)" }}>{row.stage}</span>
                          <span style={{ color: "rgba(255,255,255,0.55)", fontWeight: 500, fontSize: 9 }}>{row.status}</span>
                          <span className="nelvyon-dashboard-avatar">{row.owner}</span>
                        </div>
                      ))}
                    </div>

                    <div className="nelvyon-dashboard-activity">
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
          </div>
        </div>
      </Container>
      <GradientDivider />
    </section>
  );
};
