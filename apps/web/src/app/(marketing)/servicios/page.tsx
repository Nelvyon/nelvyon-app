import type { Metadata } from "next";
import { CtaFinal } from "@/components/agenforce/cta-final";
import { MarketingPageHero } from "@/components/agenforce/marketing-page-hero";

export const metadata: Metadata = {
  title: "Servicios | NELVYON — Marketing Digital con Agentes Expertos",
  description:
    "Servicios profesionales de marketing digital: publicidad, SEO, contenido, CRM, automatización y analítica dentro de una estructura operativa coherente.",
};

type Service = { title: string; description: string };

const columns: { heading: string; services: Service[] }[] = [
  {
    heading: "PUBLICIDAD DE PAGO",
    services: [
      {
        title: "Meta Ads",
        description:
          "Gestión profesional de campañas en Facebook e Instagram orientadas a visibilidad, captación, tráfico, remarketing o conversión según el objetivo del proyecto. El trabajo incluye estructura de campañas, segmentación, revisión de audiencias, coordinación de creatividades, configuración de eventos y seguimiento de rendimiento. NELVYON puede integrar Meta Ads con CRM, formularios, WhatsApp, email y dashboards para que la actividad publicitaria no quede aislada.",
      },
      {
        title: "Google Ads",
        description:
          "Configuración y gestión de campañas en Google Ads para búsquedas, display, shopping, Performance Max y formatos relacionados con intención de búsqueda. El servicio contempla análisis de palabras clave, estructura de grupos, anuncios, extensiones, configuración de conversiones y revisión periódica de términos. La prioridad es construir campañas ordenadas, comprensibles y conectadas con medición fiable.",
      },
      {
        title: "TikTok Ads",
        description:
          "Planificación y ejecución de campañas en TikTok Ads adaptadas al lenguaje, formato y velocidad de consumo de la plataforma. NELVYON trabaja la estructura publicitaria, los ángulos creativos, la adaptación de mensajes y la revisión de activos para mantener coherencia con la marca.",
      },
      {
        title: "YouTube Ads",
        description:
          "Diseño y gestión de campañas publicitarias en YouTube orientadas a presencia de marca, tráfico cualificado, educación de mercado o apoyo a embudos comerciales. Se trabaja la estructura de campañas, segmentación, formatos de anuncio, mensajes de vídeo y conexión con medición.",
      },
      {
        title: "LinkedIn Ads",
        description:
          "Publicidad profesional para entornos B2B, venta consultiva, servicios especializados, formación, tecnología y consultoría. Segmentación por cargo, empresa, sector, ubicación e intereses profesionales. NELVYON diseña campañas con mensajes adecuados al contexto profesional y conexión con CRM.",
      },
      {
        title: "Pinterest Ads",
        description:
          "Gestión de campañas en Pinterest para marcas visuales, ecommerce, decoración, moda, belleza, diseño y sectores con fuerte componente inspiracional. El servicio contempla estructura de campañas, selección de formatos y adaptación visual.",
      },
    ],
  },
  {
    heading: "SEO Y CONTENIDO",
    services: [
      {
        title: "SEO Técnico",
        description:
          "Auditoría y optimización de aspectos técnicos que afectan a la visibilidad orgánica de una web. Se revisan indexación, arquitectura, rendimiento, Core Web Vitals, enlazado interno, estructura de URLs, metadatos, schema y errores técnicos.",
      },
      {
        title: "Marketing de Contenidos",
        description:
          "Planificación y creación de contenidos orientados a educar, posicionar y comunicar con claridad la propuesta de valor de la empresa. Incluye artículos, páginas informativas, recursos descargables, guías, emails y publicaciones. NELVYON trabaja el contenido como un activo estratégico, no como producción genérica.",
      },
      {
        title: "Email Marketing",
        description:
          "Diseño de comunicaciones por email para bienvenida, seguimiento, nutrición comercial, recuperación, fidelización y comunicación recurrente. El servicio puede incluir segmentación, estructura de secuencias, redacción, configuración técnica y automatización.",
      },
      {
        title: "WhatsApp Automatizado",
        description:
          "Implementación de flujos de WhatsApp para atención, cualificación, seguimiento y comunicación comercial. NELVYON puede configurar respuestas automáticas, rutas de conversación, integración con CRM y recuperación de contactos pendientes.",
      },
    ],
  },
  {
    heading: "GESTIÓN Y AUTOMATIZACIÓN",
    services: [
      {
        title: "Gestión de Redes Sociales",
        description:
          "Planificación, creación, programación y revisión de contenido para redes sociales con enfoque profesional. Incluye calendario editorial, adaptación por canal, tono de marca y análisis de actividad.",
      },
      {
        title: "CRM y Pipeline",
        description:
          "Diseño e implementación de un sistema visual para gestionar leads, oportunidades, clientes, tareas y fases comerciales. El CRM permite ordenar el seguimiento, registrar interacciones y automatizar tareas repetitivas.",
      },
      {
        title: "Diseño Web",
        description:
          "Diseño y desarrollo de páginas corporativas, landing pages y estructuras web orientadas a claridad, credibilidad y conversión responsable. El servicio contempla arquitectura de información, copy, experiencia móvil y estructura visual.",
      },
      {
        title: "Ecommerce",
        description:
          "Diseño, optimización y soporte para tiendas online en Shopify, WooCommerce o PrestaShop. NELVYON trabaja estructura de catálogo, experiencia de compra, automatizaciones, recuperación de carrito y conexión con campañas.",
      },
      {
        title: "Automatización de Procesos",
        description:
          "Diseño de flujos automatizados para reducir tareas manuales en marketing, ventas, atención, reporting y gestión interna. Se pueden conectar formularios, CRM, email, WhatsApp, calendarios, pagos y herramientas externas.",
      },
      {
        title: "Analítica y Reporting",
        description:
          "Configuración de medición, eventos, conversiones, paneles e informes para interpretar la actividad digital de la empresa. NELVYON trabaja con herramientas de analítica, píxeles, etiquetas y dashboards según las necesidades del proyecto.",
      },
    ],
  },
];

function ServiceCard({ service }: { service: Service }) {
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid rgba(7, 18, 42, 0.12)",
        borderRadius: "12px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        height: "100%",
      }}
    >
      <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#07122a", margin: 0, lineHeight: 1.3 }}>
        {service.title}
      </h3>
      <p
        className="nelvyon-service-desc"
        style={{
          fontSize: "14px",
          color: "#5a6a8a",
          lineHeight: 1.6,
          margin: 0,
          flex: 1,
          display: "-webkit-box",
          WebkitLineClamp: 4,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {service.description}
      </p>
    </div>
  );
}

export default function ServiciosPage() {
  return (
    <main>
      <MarketingPageHero
        eyebrow="Servicios NELVYON"
        title="Servicios de marketing conectados a una operación real"
        subtitle="Campañas, contenido, automatización, CRM y analítica trabajados dentro de un sistema profesional, medible y centralizado."
        ctaLabel="Solicitar análisis"
        ctaHref="/contacto"
      />

      <section className="nelvyon-mkt-section" style={{ backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <p style={{ fontSize: "16px", color: "#5a6a8a", lineHeight: 1.7, maxWidth: "720px", margin: "0 auto 48px", textAlign: "center" }}>
            Una empresa no necesita más ruido. Necesita claridad. Cada servicio se integra en un sistema mayor: campañas, contenidos, automatización, CRM y seguimiento, configurados según la situación real del negocio.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "40px",
            }}
            className="servicios-columns"
          >
            {columns.map((col) => (
              <div key={col.heading}>
                <h3
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    color: "#0084fc",
                    margin: "0 0 20px",
                    textTransform: "uppercase",
                  }}
                >
                  {col.heading}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {col.services.map((svc) => (
                    <ServiceCard key={svc.title} service={svc} />
                  ))}
                </div>
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

      <section className="nelvyon-mkt-section" style={{ backgroundColor: "#f8faff" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <h2 className="fade-in" style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 800, color: "#07122a", textAlign: "center", margin: "0 0 40px" }}>
            Metodología
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }} className="nelvyon-metodologia-grid">
            {[
              { title: "Diagnóstico", desc: "Análisis de canales, procesos, herramientas y capacidad comercial." },
              { title: "Planificación", desc: "Definición de estructura, prioridades y conexión entre servicios." },
              { title: "Implementación", desc: "Configuración, ejecución y centralización de la operación." },
              { title: "Revisión continua", desc: "Medición, ajustes y optimización con criterio profesional." },
            ].map((m) => (
              <div key={m.title} style={{ backgroundColor: "#ffffff", border: "1px solid #e8eef8", borderRadius: "12px", padding: "24px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#07122a", margin: "0 0 8px" }}>{m.title}</h3>
                <p style={{ fontSize: "14px", color: "#5a6a8a", margin: 0, lineHeight: 1.55 }}>{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <style>{`
          @media (max-width: 768px) {
            .nelvyon-metodologia-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </section>

      <CtaFinal
        title="Ordena tu marketing dentro de un sistema profesional"
        subtitle="Marketing, automatización, CRM y reporting trabajando bajo una misma estructura operativa."
        primaryLabel="Solicitar análisis"
        showSecondary={false}
      />
    </main>
  );
}
