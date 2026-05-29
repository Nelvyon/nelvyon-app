import type { ReactNode } from "react";
import { NELVYON_BLUE } from "./marketing-brand";

function PanelChrome({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="nelvyon-product-showcase-item">
      <div className="nelvyon-product-panel">
        <div className="nelvyon-product-panel__chrome">
          <span className="nelvyon-product-panel__dot" style={{ background: "#ff5f57" }} />
          <span className="nelvyon-product-panel__dot" style={{ background: "#febc2e" }} />
          <span className="nelvyon-product-panel__dot" style={{ background: "#28c840" }} />
          <span className="nelvyon-product-panel__title">{title}</span>
        </div>
        <div className="nelvyon-product-panel__body">{children}</div>
      </div>
    </div>
  );
}

function CrmMock() {
  const cols = [
    { name: "Nuevo", items: ["Lead A", "Lead B"] },
    { name: "Contactado", items: ["Lead C"] },
    { name: "Propuesta", items: ["Deal X"] },
  ];
  return (
    <div style={{ display: "flex", gap: 8, minHeight: 148 }}>
      {cols.map((col) => (
        <div key={col.name} style={{ flex: 1, background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginBottom: 8, fontWeight: 600 }}>{col.name}</div>
          {col.items.map((item) => (
            <div
              key={item}
              style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.7)",
                padding: "6px 8px",
                background: "rgba(255,255,255,0.04)",
                borderRadius: 4,
                marginBottom: 4,
                borderLeft: `2px solid ${NELVYON_BLUE}`,
              }}
            >
              {item}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ReportingMock() {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>Actividad por canal</span>
        <span style={{ fontSize: 9, color: NELVYON_BLUE, fontWeight: 600 }}>Sincronizado</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 108 }}>
        {[35, 52, 41, 58, 45, 62].map((h, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${h}%`,
              borderRadius: "3px 3px 0 0",
              background: i === 5 ? NELVYON_BLUE : "rgba(0,132,252,0.2)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function AutomationMock() {
  const steps = ["Formulario", "CRM", "Email", "WhatsApp"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", paddingTop: 8 }}>
      {steps.map((step, i) => (
        <div key={step} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: 9,
              padding: "6px 10px",
              borderRadius: 5,
              background: i === 0 ? "rgba(0,132,252,0.15)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${i === 0 ? "rgba(0,132,252,0.35)" : "rgba(255,255,255,0.08)"}`,
              color: "rgba(255,255,255,0.75)",
              fontWeight: 500,
            }}
          >
            {step}
          </span>
          {i < steps.length - 1 ? <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 10 }}>→</span> : null}
        </div>
      ))}
      <div style={{ width: "100%", marginTop: 10, fontSize: 9, color: "rgba(255,255,255,0.35)" }}>Estado: Programado</div>
    </div>
  );
}

export function ProductShowcase() {
  return (
    <section className="nelvyon-mkt-section nelvyon-section--alt nelvyon-product-showcase-section">
      <div className="nelvyon-section-inner">
        <div className="nelvyon-section-head nelvyon-section-head--stack">
          <p className="mkt-eyebrow">Producto</p>
          <h2 className="mkt-h2 mkt-h2--display fade-in">Software en acción</h2>
        </div>
        <div className="nelvyon-product-grid">
          <PanelChrome title="app.nelvyon.com · CRM">
            <CrmMock />
          </PanelChrome>
          <PanelChrome title="app.nelvyon.com · Reporting">
            <ReportingMock />
          </PanelChrome>
          <PanelChrome title="app.nelvyon.com · Automatizaciones">
            <AutomationMock />
          </PanelChrome>
        </div>
      </div>
    </section>
  );
}
