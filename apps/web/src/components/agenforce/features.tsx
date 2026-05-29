import Link from "next/link";
import { NELVYON_BLUE, NELVYON_NAVY } from "./marketing-brand";

const CAPAS = [
  { title: "Publicidad digital", desc: "Meta, Google, TikTok, LinkedIn." },
  { title: "SEO técnico", desc: "Indexación, rendimiento y arquitectura." },
  { title: "Contenidos", desc: "Posicionamiento y comunicación clara." },
  { title: "Automatización", desc: "CRM, email, WhatsApp y reporting." },
  { title: "Web y ecommerce", desc: "Landings y tiendas conectadas al OS." },
  { title: "Analítica", desc: "Medición y paneles operativos." },
];

function CapasHubVisual() {
  return (
    <div className="nelvyon-capas-hub" aria-hidden>
      <svg viewBox="0 0 200 200" className="nelvyon-capas-hub__svg">
        <line x1="100" y1="100" x2="100" y2="28" stroke={NELVYON_BLUE} strokeOpacity={0.35} strokeWidth={1} />
        <line x1="100" y1="100" x2="162" y2="56" stroke={NELVYON_BLUE} strokeOpacity={0.35} strokeWidth={1} />
        <line x1="100" y1="100" x2="172" y2="100" stroke={NELVYON_BLUE} strokeOpacity={0.35} strokeWidth={1} />
        <line x1="100" y1="100" x2="162" y2="144" stroke={NELVYON_BLUE} strokeOpacity={0.35} strokeWidth={1} />
        <line x1="100" y1="100" x2="100" y2="172" stroke={NELVYON_BLUE} strokeOpacity={0.35} strokeWidth={1} />
        <line x1="100" y1="100" x2="38" y2="144" stroke={NELVYON_BLUE} strokeOpacity={0.35} strokeWidth={1} />
        <rect x="68" y="78" width="64" height="44" rx="8" fill={NELVYON_NAVY} stroke={NELVYON_BLUE} strokeOpacity={0.5} />
        <text x="100" y="102" textAnchor="middle" fill="#fff" fontSize={9} fontWeight={700}>
          NELVYON
        </text>
        <text x="100" y="114" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize={6} fontWeight={500}>
          OS
        </text>
      </svg>
    </div>
  );
}

export function Features() {
  return (
    <section className="nelvyon-mkt-section--compact" style={{ backgroundColor: "#f8faff" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 0.85fr) minmax(0, 1.15fr)",
            gap: "clamp(40px, 6vw, 72px)",
            alignItems: "start",
          }}
          className="nelvyon-capas-layout"
        >
          <div>
            <p className="mkt-eyebrow">Capas de ejecución</p>
            <h2 className="mkt-h2 fade-in" style={{ marginBottom: 12 }}>
              Conectadas al núcleo
            </h2>
            <p className="mkt-lead" style={{ marginBottom: 24 }}>
              Capas que se activan sobre NELVYON OS — no servicios aislados.
            </p>
            <CapasHubVisual />
            <Link href="/servicios" className="mkt-link" style={{ display: "inline-block", marginTop: 20 }}>
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
                <span className="mkt-row__meta" style={{ color: NELVYON_BLUE, opacity: 0.7 }}>
                  OS
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        .nelvyon-capas-hub {
          max-width: 200px;
          margin-top: 8px;
        }
        .nelvyon-capas-hub__svg {
          width: 100%;
          height: auto;
          display: block;
        }
        @media (max-width: 768px) {
          .nelvyon-capas-layout { grid-template-columns: 1fr !important; }
          .nelvyon-capas-hub { max-width: 160px; }
        }
      `}</style>
    </section>
  );
}
