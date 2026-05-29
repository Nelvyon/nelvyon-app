import type { Metadata } from "next";
import { CtaFinal } from "@/components/agenforce/cta-final";
import { MarketingPageHero } from "@/components/agenforce/marketing-page-hero";

export const metadata: Metadata = {
  title: "Servicios | NELVYON — Marketing Digital con Agentes Expertos",
  description:
    "Capas de ejecución profesional sobre NELVYON OS: publicidad, SEO, contenido, CRM, automatización y analítica.",
};

type Service = { title: string; description: string };

const columns: { heading: string; services: Service[] }[] = [
  {
    heading: "Publicidad",
    services: [
      { title: "Meta Ads", description: "Campañas Meta conectadas a CRM y medición." },
      { title: "Google Ads", description: "Search, display y conversiones con estructura clara." },
      { title: "TikTok Ads", description: "Formato nativo y seguimiento operativo." },
      { title: "YouTube Ads", description: "Vídeo, tráfico y embudos B2B/B2C." },
      { title: "LinkedIn Ads", description: "Segmentación profesional y CRM." },
      { title: "Pinterest Ads", description: "Ecommerce y marcas visuales." },
    ],
  },
  {
    heading: "SEO y contenido",
    services: [
      { title: "SEO Técnico", description: "Indexación, rendimiento y arquitectura." },
      { title: "Marketing de Contenidos", description: "Contenido estratégico, no genérico." },
      { title: "Email Marketing", description: "Secuencias, segmentación y automatización." },
      { title: "WhatsApp Automatizado", description: "Flujos comerciales integrados con CRM." },
    ],
  },
  {
    heading: "Operación",
    services: [
      { title: "Redes Sociales", description: "Calendario editorial y publicación centralizada." },
      { title: "CRM y Pipeline", description: "Leads, fases y seguimiento visual." },
      { title: "Diseño Web", description: "Landings y webs conectadas al OS." },
      { title: "Ecommerce", description: "Tiendas, catálogo y recuperación." },
      { title: "Automatización", description: "Flujos entre CRM, email y reporting." },
      { title: "Analítica", description: "Eventos, paneles e informes operativos." },
    ],
  },
];

export default function ServiciosPage() {
  return (
    <main>
      <MarketingPageHero
        eyebrow="Capas de ejecución"
        title="Servicios sobre el sistema operativo"
        subtitle="Publicidad, contenido y automatización como extensiones de NELVYON OS — no como paquetes aislados."
        ctaLabel="Solicitar análisis"
        ctaHref="/contacto"
      />

      <section className="nelvyon-mkt-section" style={{ backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "clamp(32px, 5vw, 56px)",
            }}
            className="servicios-columns"
          >
            {columns.map((col) => (
              <div key={col.heading}>
                <h3 className="mkt-eyebrow" style={{ marginBottom: 20 }}>
                  {col.heading}
                </h3>
                {col.services.map((svc) => (
                  <div key={svc.title} className="mkt-row">
                    <div>
                      <p className="mkt-row__title">{svc.title}</p>
                      <p className="mkt-row__desc">{svc.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <style>{`
          @media (max-width: 1023px) {
            .servicios-columns { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </section>

      <section className="nelvyon-mkt-section--compact" style={{ backgroundColor: "#f8faff" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 24px" }}>
          <p className="mkt-eyebrow">Metodología</p>
          <h2 className="mkt-h2 fade-in" style={{ marginBottom: 32 }}>
            De diagnóstico a operación
          </h2>
          {[
            { title: "Diagnóstico", desc: "Canales, procesos y herramientas." },
            { title: "Planificación", desc: "Estructura y prioridades del sistema." },
            { title: "Implementación", desc: "Configuración y centralización." },
            { title: "Revisión", desc: "Medición y ajuste continuo." },
          ].map((m) => (
            <div key={m.title} className="mkt-row">
              <div>
                <p className="mkt-row__title">{m.title}</p>
                <p className="mkt-row__desc">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <CtaFinal
        title="Activa capas sobre tu operación"
        subtitle="Marketing y automatización dentro de NELVYON OS."
        primaryLabel="Solicitar análisis"
        showSecondary={false}
      />
    </main>
  );
}
