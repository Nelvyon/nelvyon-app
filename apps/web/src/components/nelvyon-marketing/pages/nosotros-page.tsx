import Image from "next/image";

import { NvCtaBand } from "../cta-band";
import { NvPageHero } from "../page-hero";

const VALUES = [
  { title: "Seriedad", desc: "Mensajes claros, procesos documentados y expectativas responsables." },
  { title: "Transparencia", desc: "Sabes qué se hace, cómo se hace y qué información se utiliza." },
  { title: "Orden", desc: "Un sistema bien diseñado reduce confusión y duplicidades." },
  { title: "Continuidad", desc: "Agentes expertos mantienen tareas activas sin depender siempre de intervención manual." },
  { title: "Criterio", desc: "Automatizar significa ejecutar mejor lo que ha sido pensado con rigor." },
  { title: "Escalabilidad", desc: "La plataforma crece con la empresa sin romper la operación." },
];

const METHODOLOGY = [
  { num: "01", title: "Primero entendemos", desc: "Analizamos cómo funciona la empresa antes de configurar nada." },
  { num: "02", title: "Después estructuramos", desc: "Definimos qué centralizar y qué automatizar." },
  { num: "03", title: "Luego implementamos", desc: "Configuramos plataforma, flujos y agentes expertos." },
  { num: "04", title: "Finalmente operamos", desc: "El sistema se mantiene activo y se revisa con criterio." },
];

function NosotrosVisual() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 280,
        borderRadius: 20,
        background: "radial-gradient(circle at 50% 50%, rgba(0,132,252,0.15) 0%, transparent 65%), var(--nv-panel)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <Image src="/logo.png" alt="" width={120} height={120} className="object-contain" />
    </div>
  );
}

export function NvNosotrosPage() {
  return (
    <main>
      <NvPageHero
        eyebrow="Nosotros"
        title="NELVYON nace para ordenar el crecimiento"
        subtitle="Una forma más centralizada y continua de operar marketing, ventas y automatización."
        visual={<NosotrosVisual />}
        split
      />

      <section className="nv-section nv-section--white">
        <div className="nv-container nv-split-content">
          <div className="nv-prose">
            <span className="nv-eyebrow">Misión</span>
            <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 16px", color: "var(--nv-text)" }}>
              Nuestra misión
            </h2>
            <p>
              NELVYON ayuda a empresas a construir sistemas de marketing y ventas más claros, automatizados y medibles. No prometemos resultados imposibles: aportamos estructura, ejecución y tecnología para operar con mayor control.
            </p>
            <p>
              Queremos que cada empresa pueda trabajar campañas, CRM, contenidos y reporting desde un entorno centralizado, con servicios profesionales y agentes expertos cuando hace falta continuidad operativa.
            </p>
          </div>
          <article className="nv-card">
            <span className="nv-eyebrow">Visión</span>
            <h3>Visión</h3>
            <p style={{ marginBottom: 16 }}>
              Convertir NELVYON en una infraestructura de referencia para empresas que quieren dejar de improvisar y operar con criterio.
            </p>
            <h3>Red de especialistas</h3>
            <p style={{ margin: 0 }}>
              Combinamos fundadores, especialistas estratégicos y agentes expertos operativos. Los agentes mantienen tareas activas; los especialistas aportan ejecución profesional cuando el sistema lo requiere.
            </p>
          </article>
        </div>
      </section>

      <section className="nv-section nv-section--light">
        <div className="nv-container">
          <header className="nv-section-head">
            <h2>Nuestros valores</h2>
          </header>
          <div className="nv-grid-3">
            {VALUES.map((v) => (
              <article key={v.title} className="nv-card">
                <h3>{v.title}</h3>
                <p>{v.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="nv-section nv-section--dark">
        <div className="nv-container">
          <header className="nv-section-head nv-section-head--light">
            <span className="nv-eyebrow">Metodología</span>
            <h2>Cómo implementamos cada proyecto</h2>
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
        title="Una empresa seria necesita un sistema serio"
        subtitle="NELVYON está diseñado para compañías que quieren operar con estructura."
        primaryLabel="Conocer NELVYON"
      />
    </main>
  );
}
