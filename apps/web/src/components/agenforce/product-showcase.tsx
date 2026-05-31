import type { ReactNode } from "react";

import { NELVYON_BLUE } from "./marketing-brand";

function PanelChrome({ title, label, children }: { title: string; label: string; children: ReactNode }) {
  return (
    <article className="nelvyon-product-showcase-item">
      <div className="nelvyon-product-panel">
        <div className="nelvyon-product-panel__chrome">
          <span className="nelvyon-product-panel__dot" style={{ background: "#ff5f57" }} />
          <span className="nelvyon-product-panel__dot" style={{ background: "#febc2e" }} />
          <span className="nelvyon-product-panel__dot" style={{ background: "#28c840" }} />
          <span className="nelvyon-product-panel__title">{title}</span>
        </div>
        <div className="nelvyon-product-panel__body">{children}</div>
      </div>
      <p className="nelvyon-product-showcase-item__label">{label}</p>
    </article>
  );
}

function CrmMock() {
  const cols = [
    { name: "Nuevo", items: ["Lead inbound", "Formulario web"] },
    { name: "Contactado", items: ["Demo agendada"] },
    { name: "Propuesta", items: ["Deal activo"] },
  ];
  return (
    <div style={{ display: "flex", gap: 8, minHeight: 132 }}>
      {cols.map((col) => (
        <div
          key={col.name}
          style={{ flex: 1, background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: 8, border: "1px solid rgba(255,255,255,0.06)" }}
        >
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

function WorkflowsMock() {
  const steps = ["Lead creado", "CRM", "Email", "WhatsApp"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", paddingTop: 4 }}>
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
      <div style={{ width: "100%", marginTop: 10, fontSize: 9, color: "rgba(255,255,255,0.35)" }}>Workflow · Activo</div>
    </div>
  );
}

function CampanasMock() {
  const rows = [
    { name: "Meta · Captación", status: "Activa" },
    { name: "Google · Remarketing", status: "Pausada" },
    { name: "Email · Nurturing", status: "Activa" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {rows.map((row) => (
        <div
          key={row.name}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 10px",
            borderRadius: 6,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            fontSize: 9,
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.72)" }}>{row.name}</span>
          <span style={{ color: row.status === "Activa" ? NELVYON_BLUE : "rgba(255,255,255,0.35)" }}>{row.status}</span>
        </div>
      ))}
    </div>
  );
}

function InboxMock() {
  const threads = [
    { channel: "WhatsApp", preview: "Consulta sobre plan Growth" },
    { channel: "Email", preview: "Seguimiento propuesta comercial" },
    { channel: "Live chat", preview: "Solicitud de demo" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {threads.map((t) => (
        <div
          key={t.channel}
          style={{
            padding: "8px 10px",
            borderRadius: 6,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ fontSize: 9, color: NELVYON_BLUE, fontWeight: 600, marginBottom: 4 }}>{t.channel}</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.55)" }}>{t.preview}</div>
        </div>
      ))}
    </div>
  );
}

function FacturacionMock() {
  const rows = [
    { id: "INV-1042", amount: "€1.240", status: "Pagada" },
    { id: "INV-1043", amount: "€890", status: "Pendiente" },
  ];
  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 0.7fr 0.7fr",
          gap: 8,
          fontSize: 8,
          color: "rgba(255,255,255,0.35)",
          marginBottom: 8,
          paddingBottom: 6,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span>Factura</span>
        <span>Importe</span>
        <span>Estado</span>
      </div>
      {rows.map((row) => (
        <div
          key={row.id}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 0.7fr 0.7fr",
            gap: 8,
            fontSize: 9,
            color: "rgba(255,255,255,0.7)",
            padding: "6px 0",
          }}
        >
          <span>{row.id}</span>
          <span>{row.amount}</span>
          <span style={{ color: row.status === "Pagada" ? "#28c840" : "#febc2e" }}>{row.status}</span>
        </div>
      ))}
    </div>
  );
}

function CalendarioMock() {
  const slots = ["09:00 · Demo SaaS", "11:30 · Revisión campaña", "16:00 · Onboarding"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Hoy · Operación comercial</div>
      {slots.map((slot) => (
        <div
          key={slot}
          style={{
            padding: "8px 10px",
            borderRadius: 6,
            borderLeft: `3px solid ${NELVYON_BLUE}`,
            background: "rgba(255,255,255,0.03)",
            fontSize: 9,
            color: "rgba(255,255,255,0.72)",
          }}
        >
          {slot}
        </div>
      ))}
    </div>
  );
}

function FunnelsMock() {
  const steps = [
    { name: "Landing", pct: 100 },
    { name: "Formulario", pct: 62 },
    { name: "CRM", pct: 41 },
    { name: "Propuesta", pct: 18 },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {steps.map((step) => (
        <div key={step.name}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "rgba(255,255,255,0.55)", marginBottom: 4 }}>
            <span>{step.name}</span>
            <span>{step.pct}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.06)" }}>
            <div style={{ width: `${step.pct}%`, height: "100%", borderRadius: 999, background: NELVYON_BLUE, opacity: step.pct === 100 ? 1 : 0.55 }} />
          </div>
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
      <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 96 }}>
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

const MODULES = [
  { label: "CRM", path: "CRM", Mock: CrmMock },
  { label: "Workflows", path: "Automatización", Mock: WorkflowsMock },
  { label: "Campañas", path: "Campañas", Mock: CampanasMock },
  { label: "Inbox", path: "Inbox", Mock: InboxMock },
  { label: "Facturación", path: "Facturación", Mock: FacturacionMock },
  { label: "Calendario", path: "Calendario", Mock: CalendarioMock },
  { label: "Funnels", path: "Funnels", Mock: FunnelsMock },
  { label: "Reporting", path: "Reporting", Mock: ReportingMock },
] as const;

export function ProductShowcase() {
  return (
    <section className="nelvyon-home-section nelvyon-section--alt nelvyon-product-showcase-section" aria-labelledby="product-showcase-title">
      <div className="nelvyon-section-inner">
        <header className="nelvyon-home-section__head nelvyon-home-section__head--center">
          <p className="mkt-eyebrow">Plataforma SaaS</p>
          <h2 id="product-showcase-title" className="mkt-h2 mkt-h2--display fade-in">
            Módulos reales del producto
          </h2>
          <p className="mkt-lead nelvyon-home-section__lead fade-in">
            Vista representativa de la operación diaria dentro de NELVYON. Sin métricas inventadas ni capturas genéricas.
          </p>
        </header>
        <div className="nelvyon-product-grid nelvyon-product-grid--bento">
          {MODULES.map(({ label, path, Mock }) => (
            <PanelChrome key={label} title={`app.nelvyon.com · ${path}`} label={label}>
              <Mock />
            </PanelChrome>
          ))}
        </div>
      </div>
    </section>
  );
}
