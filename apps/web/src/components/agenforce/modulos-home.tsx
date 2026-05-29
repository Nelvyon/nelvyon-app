import Link from "next/link";

const MODULOS = [
  { title: "Dashboard Central", desc: "Vista unificada de operación." },
  { title: "Agente de Ads", desc: "Campañas y seguimiento operativo." },
  { title: "Agente de Email", desc: "Secuencias y flujos automatizados." },
  { title: "CRM Visual", desc: "Pipeline y fases comerciales." },
  { title: "Agente de WhatsApp", desc: "Conversaciones integradas con CRM." },
  { title: "Reportes", desc: "Paneles sin hojas dispersas." },
];

export function ModulosHome() {
  return (
    <section className="nelvyon-mkt-section nelvyon-section--white">
      <div className="nelvyon-section-inner">
        <div className="nelvyon-section-head">
          <div>
            <p className="mkt-eyebrow">Plataforma</p>
            <h2 className="mkt-h2 fade-in">Módulos del sistema</h2>
          </div>
          <Link href="/saas" className="mkt-link">
            Ver SaaS →
          </Link>
        </div>
        <div className="nelvyon-modulos-grid">
          {MODULOS.map((m) => (
            <div key={m.title} className="mkt-card nelvyon-modulo-card">
              <p className="mkt-card__title">{m.title}</p>
              <p className="mkt-card__desc">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
