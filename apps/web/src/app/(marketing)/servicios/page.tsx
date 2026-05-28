import type { Metadata } from "next";
import Link from "next/link";
import { CtaFinal } from "@/components/agenforce/cta-final";
import { NavyToWhiteTransition } from "@/components/agenforce/section-transition";

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
        borderRadius: "16px",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        height: "100%",
      }}
    >
      <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#07122a", margin: 0, lineHeight: 1.3 }}>
        {service.title}
      </h3>
      <p style={{ fontSize: "14px", color: "#5a6a8a", lineHeight: 1.6, margin: 0, flex: 1 }}>
        {service.description}
      </p>
    </div>
  );
}

export default function ServiciosPage() {
  return (
    <main style={{ paddingTop: "68px" }}>
      <section style={{ backgroundColor: "#07122a", padding: "64px 0 0" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 24px 48px", textAlign: "center" }}>
          <p
            style={{
              fontSize: "13px",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#00d6fe",
              marginBottom: "16px",
            }}
          >
            Servicios NELVYON
          </p>
          <h1
            className="fade-in"
            style={{
              fontSize: "clamp(36px, 6vw, 60px)",
              fontWeight: 900,
              color: "#ffffff",
              margin: "0 0 20px",
              lineHeight: 1.1,
            }}
          >
            Servicios de marketing para operar con criterio
          </h1>
          <p style={{ fontSize: "18px", color: "#a8c8e8", margin: "0 0 16px", lineHeight: 1.6 }}>
            NELVYON diseña, ejecuta y coordina servicios de marketing digital dentro de una estructura profesional, medible y conectada.
          </p>
          <p style={{ fontSize: "16px", color: "#a8c8e8", margin: "0 0 36px", lineHeight: 1.6 }}>
            Cada servicio se integra dentro de un sistema mayor: campañas, contenidos, automatización, CRM, analítica y seguimiento. El objetivo no es hacer acciones aisladas, sino construir una operación coherente.
          </p>
          <Link
            href="/contacto"
            style={{
              display: "inline-block",
              backgroundColor: "#0084fc",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "16px",
              padding: "16px 40px",
              borderRadius: "12px",
              textDecoration: "none",
            }}
          >
            Solicitar análisis →
          </Link>
        </div>
        <NavyToWhiteTransition />
      </section>

      <section style={{ backgroundColor: "#ffffff", padding: "0 0 64px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "48px 24px 0" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2
              className="fade-in"
              style={{
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: 800,
                color: "#07122a",
                margin: "0 0 16px",
              }}
            >
              Metodología profesional
            </h2>
            <p style={{ fontSize: "17px", color: "#5a6a8a", maxWidth: "800px", margin: "0 auto 16px", lineHeight: 1.7 }}>
              Una empresa no necesita más ruido. Necesita claridad. NELVYON trabaja con una metodología basada en diagnóstico, ejecución, medición y optimización responsable. Cada canal se configura según la situación real del negocio, sus activos, su mercado, su capacidad comercial y su estructura interna.
            </p>
            <p style={{ fontSize: "16px", color: "#5a6a8a", maxWidth: "800px", margin: "0 auto", lineHeight: 1.7 }}>
              No utilizamos mensajes vacíos ni promesas irreales. Creamos sistemas de marketing profesionales preparados para funcionar de forma ordenada.
            </p>
          </div>
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

      <CtaFinal
        title="Servicios conectados dentro de un sistema"
        subtitle="Marketing, automatización, CRM y reporting trabajando bajo una misma estructura operativa."
        primaryLabel="Solicitar análisis"
        showSecondary={false}
      />
    </main>
  );
}
