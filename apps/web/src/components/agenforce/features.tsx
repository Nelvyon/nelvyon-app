import Link from "next/link";

const CAPAS = [
  { title: "Publicidad digital", desc: "Meta, Google, TikTok, LinkedIn." },
  { title: "SEO técnico", desc: "Indexación, rendimiento y arquitectura." },
  { title: "Contenidos", desc: "Posicionamiento y comunicación clara." },
  { title: "Automatización", desc: "CRM, email, WhatsApp y reporting." },
  { title: "Web y ecommerce", desc: "Landings y tiendas conectadas al OS." },
  { title: "Analítica", desc: "Medición y paneles operativos." },
];

export function Features() {
  return (
    <section className="nelvyon-mkt-section--compact" style={{ backgroundColor: "#f8faff" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.1fr)",
            gap: "clamp(40px, 6vw, 72px)",
            alignItems: "start",
          }}
          className="nelvyon-capas-layout"
        >
          <div>
            <p className="mkt-eyebrow">Capas de ejecución</p>
            <h2 className="mkt-h2 fade-in" style={{ marginBottom: 12 }}>
              Servicios como extensión del sistema
            </h2>
            <p className="mkt-lead" style={{ marginBottom: 20 }}>
              No son paquetes aislados. Son capas que se activan sobre NELVYON OS cuando la operación lo requiere.
            </p>
            <Link href="/servicios" className="mkt-link">
              Ver capas →
            </Link>
          </div>
          <div>
            {CAPAS.map((s) => (
              <div key={s.title} className="mkt-row">
                <div>
                  <p className="mkt-row__title">{s.title}</p>
                  <p className="mkt-row__desc">{s.desc}</p>
                </div>
                <span className="mkt-row__meta">Capa</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .nelvyon-capas-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
