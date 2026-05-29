import { NELVYON_NAVY } from "./marketing-brand";

const CAPAS = [
  { key: "01", title: "NELVYON", desc: "Marca y plataforma. NELVYON OS como núcleo SaaS: CRM, campañas, automatización y reporting." },
  { key: "02", title: "Agentes expertos", desc: "Coordinación operativa continua según reglas definidas." },
  { key: "03", title: "Capa de ejecución", desc: "Servicios profesionales cuando el sistema necesita manos." },
];

export function QueEsNelvyon() {
  return (
    <section className="nelvyon-mkt-section--airy" style={{ backgroundColor: "#ffffff" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px" }}>
        <div
          className="nelvyon-que-es-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
            gap: "clamp(48px, 8vw, 96px)",
            alignItems: "start",
          }}
        >
          <div>
            <p className="mkt-eyebrow">Qué es NELVYON</p>
            <h2 className="mkt-h2 fade-in" style={{ marginBottom: 20 }}>
              Software operativo con capas de ejecución
            </h2>
            <p className="mkt-lead" style={{ marginBottom: 12 }}>
              El SaaS es el núcleo. Los agentes expertos mantienen la operación. Los servicios amplían el sistema cuando hace falta.
            </p>
            <p style={{ fontSize: 14, fontWeight: 600, color: NELVYON_NAVY, letterSpacing: "-0.02em", margin: 0 }}>
              Sin promesas vacías. Sistemas que funcionan.
            </p>
          </div>
          <div>
            {CAPAS.map((c) => (
              <div key={c.key} className="mkt-row">
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flex: 1 }}>
                  <span className="mkt-row__meta" style={{ color: "rgba(7,18,42,0.25)", paddingTop: 2 }}>
                    {c.key}
                  </span>
                  <div>
                    <p className="mkt-row__title">{c.title}</p>
                    <p className="mkt-row__desc">{c.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .nelvyon-que-es-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
        }
      `}</style>
    </section>
  );
}
