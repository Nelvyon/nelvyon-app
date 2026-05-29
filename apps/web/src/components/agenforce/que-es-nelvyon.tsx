import { NELVYON_BLUE, NELVYON_NAVY } from "./marketing-brand";

const CAPAS = [
  { key: "01", title: "NELVYON", desc: "Marca y plataforma. NELVYON OS como núcleo SaaS: CRM, campañas, automatización y reporting." },
  { key: "02", title: "Agentes expertos", desc: "Coordinación operativa continua según reglas definidas." },
  { key: "03", title: "Capa de ejecución", desc: "Servicios profesionales cuando el sistema necesita manos." },
];

export function QueEsNelvyon() {
  return (
    <section className="nelvyon-mkt-section nelvyon-section--white">
      <div className="nelvyon-section-inner">
        <div className="nelvyon-que-es-grid">
          <div>
            <p className="mkt-eyebrow">Qué es NELVYON</p>
            <h2 className="mkt-h2 fade-in" style={{ marginBottom: 20 }}>
              Software operativo con capas de ejecución
            </h2>
            <p className="mkt-lead" style={{ marginBottom: 12 }}>
              El SaaS es el núcleo. Los agentes expertos mantienen la operación. Los servicios amplían el sistema cuando hace falta.
            </p>
            <p style={{ fontSize: 15, fontWeight: 650, color: NELVYON_NAVY, letterSpacing: "-0.02em", margin: 0 }}>
              Sin promesas vacías. Sistemas que funcionan.
            </p>
          </div>
          <div className="nelvyon-capas-stack">
            {CAPAS.map((c) => (
              <div key={c.key} className="mkt-card nelvyon-capa-card">
                <span className="nelvyon-capa-card__key">{c.key}</span>
                <div>
                  <p className="mkt-card__title">{c.title}</p>
                  <p className="mkt-card__desc">{c.desc}</p>
                </div>
                <span className="nelvyon-capa-card__dot" style={{ background: NELVYON_BLUE }} aria-hidden />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
