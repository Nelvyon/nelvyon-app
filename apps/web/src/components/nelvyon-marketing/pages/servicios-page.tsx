import Image from "next/image";

import { NvCtaBand } from "../cta-band";
import { NvPageHero } from "../page-hero";

const GROUPS = [
  {
    title: "Publicidad y captación",
    items: [
      { name: "Meta Ads", desc: "Campañas conectadas a CRM y medición." },
      { name: "Google Ads", desc: "Search, display y conversiones estructuradas." },
      { name: "TikTok Ads", desc: "Formato nativo con seguimiento operativo." },
      { name: "LinkedIn Ads", desc: "Segmentación B2B y pipeline." },
    ],
  },
  {
    title: "Contenido y comunicación",
    items: [
      { name: "SEO técnico", desc: "Indexación, rendimiento y arquitectura." },
      { name: "Contenidos", desc: "Estrategia editorial conectada a la operación." },
      { name: "Email marketing", desc: "Secuencias y segmentación." },
      { name: "Redes sociales", desc: "Calendario y publicación centralizada." },
    ],
  },
  {
    title: "Operación comercial",
    items: [
      { name: "CRM y pipeline", desc: "Leads, fases y seguimiento visual." },
      { name: "WhatsApp", desc: "Flujos comerciales integrados." },
      { name: "Automatización", desc: "Procesos entre CRM, email y reporting." },
      { name: "Analítica", desc: "Paneles e informes operativos." },
    ],
  },
];

const METHODOLOGY = [
  { num: "01", title: "Diagnóstico", desc: "Canales, procesos y herramientas actuales." },
  { num: "02", title: "Planificación", desc: "Prioridades y estructura del sistema." },
  { num: "03", title: "Implementación", desc: "Configuración y centralización." },
  { num: "04", title: "Operación", desc: "Revisión y mejora continua." },
];

function ServiciosVisual() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 280,
        borderRadius: 20,
        background: "linear-gradient(165deg, var(--nv-panel) 0%, var(--nv-navy) 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <Image src="/logo.png" alt="" width={100} height={100} className="object-contain" style={{ opacity: 0.95 }} />
    </div>
  );
}

export function NvServiciosPage() {
  return (
    <main>
      <NvPageHero
        eyebrow="Servicios"
        title="Capas de ejecución sobre la plataforma"
        subtitle="Publicidad, contenido y automatización como extensiones de NELVYON — no como paquetes aislados."
        visual={<ServiciosVisual />}
        split
      />

      {GROUPS.map((group, gi) => (
        <section key={group.title} className={`nv-section ${gi % 2 === 0 ? "nv-section--white" : "nv-section--light"}`}>
          <div className="nv-container">
            <header className="nv-section-head" style={{ textAlign: "left", marginLeft: 0, maxWidth: "none" }}>
              <h2>{group.title}</h2>
            </header>
            <div className="nv-grid-3">
              {group.items.map((item) => (
                <article key={item.name} className="nv-card">
                  <h3>{item.name}</h3>
                  <p>{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="nv-section nv-section--dark">
        <div className="nv-container">
          <header className="nv-section-head nv-section-head--light">
            <span className="nv-eyebrow">Metodología</span>
            <h2>De diagnóstico a operación</h2>
          </header>
          <div className="nv-grid-4">
            {METHODOLOGY.map((m) => (
              <article key={m.num} className="nv-card nv-card--dark">
                <span className="nv-card__num">{m.num}</span>
                <h3>{m.title}</h3>
                <p>{m.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <NvCtaBand
        title="Activa capas sobre tu operación"
        subtitle="Marketing y automatización dentro de un mismo entorno NELVYON."
        primaryLabel="Solicitar análisis"
      />
    </main>
  );
}
