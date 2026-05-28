import type { Metadata } from "next";
import { CtaFinal } from "@/components/agenforce/cta-final";
import { MarketingPageHero } from "@/components/agenforce/marketing-page-hero";

export const metadata: Metadata = {
  title: "Blog | NELVYON — Marketing Digital y Automatización",
  description: "Análisis, guías y reflexiones sobre automatización, campañas, CRM, contenido, reporting y sistemas de crecimiento empresarial.",
};
const posts = [
  { tag: "Operaciones", title: "Cómo ordenar el marketing de una empresa sin depender de herramientas dispersas", excerpt: "Una guía sobre los problemas más comunes que aparecen cuando campañas, CRM, contenidos y reporting funcionan por separado.", date: "Mayo 2026", readTime: "8 min" },
  { tag: "CRM", title: "Qué debe tener un CRM útil para equipos comerciales modernos", excerpt: "Un análisis práctico sobre pipeline, seguimiento, tareas, automatizaciones y visibilidad comercial.", date: "Mayo 2026", readTime: "7 min" },
  { tag: "Automatización", title: "Automatización de marketing: qué procesos conviene automatizar y cuáles no", excerpt: "Una visión responsable sobre cómo automatizar sin perder control, contexto ni calidad en la relación con el cliente.", date: "Abril 2026", readTime: "10 min" },
  { tag: "Reporting", title: "Por qué el reporting es una pieza estratégica, no una tarea administrativa", excerpt: "Cómo transformar datos dispersos en información útil para dirección, marketing y ventas.", date: "Abril 2026", readTime: "6 min" },
  { tag: "Publicidad", title: "Publicidad digital con criterio: más allá de lanzar campañas", excerpt: "Una explicación sobre estructura, medición, mensajes, audiencias y revisión continua en campañas profesionales.", date: "Marzo 2026", readTime: "9 min" },
  { tag: "Agentes expertos", title: "Agentes expertos en marketing: cómo pueden cambiar la operación empresarial", excerpt: "Una introducción al papel de los agentes expertos en tareas de contenido, seguimiento, análisis y coordinación operativa.", date: "Marzo 2026", readTime: "7 min" },
];
export default function BlogPage() {
  return (
    <main>
      <MarketingPageHero
        eyebrow="Blog NELVYON"
        title="Ideas para operar mejor el marketing"
        subtitle="Análisis, guías y reflexiones sobre automatización, campañas, CRM, contenido, reporting y sistemas de crecimiento empresarial."
      />
      <section className="nelvyon-mkt-section" style={{ backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <div className="nelvyon-blog-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
            {posts.map((post, i) => (
              <div key={i} style={{ backgroundColor: "#f8faff", border: "1px solid #e8eef8", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <span style={{ display: "inline-block", backgroundColor: "#e8f0fb", color: "#0084fc", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: "20px", padding: "4px 12px", width: "fit-content" }}>{post.tag}</span>
                <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#07122a", margin: 0, lineHeight: 1.3 }}>{post.title}</h2>
                <p style={{ fontSize: "14px", color: "#5a6a8a", lineHeight: 1.6, margin: 0 }}>{post.excerpt}</p>
                <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "16px", borderTop: "1px solid #e8eef8" }}>
                  <span style={{ fontSize: "12px", color: "#9aabbf" }}>{post.date}</span>
                  <span style={{ fontSize: "12px", color: "#9aabbf" }}>{post.readTime} lectura</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <CtaFinal />
      <style>{`
        @media (max-width: 640px) {
          .nelvyon-blog-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}
