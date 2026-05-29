import { NvCtaBand } from "../cta-band";
import { NvPageHero } from "../page-hero";

const POSTS = [
  {
    tag: "Operaciones",
    title: "Cómo ordenar el marketing sin depender de herramientas dispersas",
    excerpt: "Problemas habituales cuando campañas, CRM y reporting funcionan por separado.",
    date: "Mayo 2026",
    read: "8 min",
  },
  {
    tag: "CRM",
    title: "Qué debe tener un CRM útil para equipos comerciales",
    excerpt: "Pipeline, seguimiento, tareas y visibilidad comercial.",
    date: "Mayo 2026",
    read: "7 min",
  },
  {
    tag: "Automatización",
    title: "Qué procesos conviene automatizar y cuáles no",
    excerpt: "Automatizar sin perder control ni calidad en la relación con el cliente.",
    date: "Abril 2026",
    read: "10 min",
  },
  {
    tag: "Reporting",
    title: "Por qué el reporting es estratégico",
    excerpt: "De datos dispersos a información útil para dirección y operación.",
    date: "Abril 2026",
    read: "6 min",
  },
  {
    tag: "Publicidad",
    title: "Publicidad digital con criterio",
    excerpt: "Estructura, medición y revisión continua en campañas profesionales.",
    date: "Marzo 2026",
    read: "9 min",
  },
  {
    tag: "Operación",
    title: "Agentes expertos en marketing operativo",
    excerpt: "Coordinación continua en contenido, seguimiento y análisis.",
    date: "Marzo 2026",
    read: "7 min",
  },
];

export function NvBlogPage() {
  return (
    <main>
      <NvPageHero
        eyebrow="Blog"
        title="Ideas para operar mejor el marketing"
        subtitle="Guías y reflexiones sobre automatización, campañas, CRM, contenido y reporting."
      />

      <section className="nv-section nv-section--light">
        <div className="nv-container">
          <div className="nv-grid-3">
            {POSTS.map((post) => (
              <article key={post.title} className="nv-card nv-blog-card">
                <div className="nv-blog-card__visual" aria-hidden />
                <div className="nv-blog-card__body">
                  <span className="nv-blog-card__tag">{post.tag}</span>
                  <h3 style={{ fontSize: 17, margin: "10px 0 8px" }}>{post.title}</h3>
                  <p>{post.excerpt}</p>
                  <div className="nv-blog-card__meta">
                    <span>{post.date}</span>
                    <span>{post.read} lectura</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <NvCtaBand title="¿Quieres estructurar tu operación?" subtitle="Hablemos de cómo NELVYON puede encajar en tu empresa." />
    </main>
  );
}
