import type { Metadata } from "next";
import Link from "next/link";
import { CtaFinal } from "@/components/agenforce/cta-final";
import { NavyToWhiteTransition } from "@/components/agenforce/section-transition";

export const metadata: Metadata = {
  title: "Servicios | NELVYON — Marketing Digital con Agentes Expertos",
  description:
    "Meta Ads, Google Ads, TikTok Ads, SEO, email, WhatsApp, CRM y más. Todo gestionado por agentes expertos de NELVYON.",
};

type Service = { title: string; description: string; price: string };

const columns: { heading: string; services: Service[] }[] = [
  {
    heading: "PUBLICIDAD DE PAGO",
    services: [
      {
        title: "Meta Ads (Facebook & Instagram)",
        description:
          "Campañas que escalan ROAS con creatividades y audiencias optimizadas cada día. Resultado medio: +180% leads cualificados en 60 días.",
        price: "Desde €297/mes",
      },
      {
        title: "Google Ads (Search & Display)",
        description:
          "Captura intención de compra en búsqueda y display con pujas inteligentes. Reduce CPA un 35% frente a gestión manual típica.",
        price: "Desde €297/mes",
      },
      {
        title: "TikTok Ads",
        description:
          "Formatos nativos y hooks que convierten en público joven. Escala alcance sin disparar CPM gracias a tests continuos.",
        price: "Desde €297/mes",
      },
      {
        title: "YouTube Ads",
        description:
          "Vídeo que educa y vende con segmentación por intereses y remarketing. Aumenta reconocimiento de marca y tráfico cualificado.",
        price: "Desde €347/mes",
      },
      {
        title: "LinkedIn Ads",
        description:
          "B2B con targeting por cargo, sector y empresa. Genera reuniones comerciales con CPL optimizado para ventas consultivas.",
        price: "Desde €397/mes",
      },
      {
        title: "Pinterest Ads",
        description:
          "Ideal para ecommerce, decoración y lifestyle. Impulsa descubrimiento visual y compras con catálogos dinámicos.",
        price: "Desde €247/mes",
      },
    ],
  },
  {
    heading: "SEO Y CONTENIDO",
    services: [
      {
        title: "SEO técnico y posicionamiento",
        description:
          "Auditoría, arquitectura y contenido orientado a keywords con intención. Posiciones estables en 90-120 días en nichos competitivos.",
        price: "Desde €397/mes",
      },
      {
        title: "Marketing de contenidos",
        description:
          "Calendario editorial, artículos y piezas que atraen tráfico orgánico. Más visitas cualificadas sin depender solo de paid media.",
        price: "Desde €297/mes",
      },
      {
        title: "Email marketing automatizado",
        description:
          "Flujos de bienvenida, nurturing y reactivación con A/B testing. Incrementa ingresos recurrentes desde la base de datos actual.",
        price: "Desde €197/mes",
      },
      {
        title: "WhatsApp Business automatizado",
        description:
          "Secuencias, recordatorios y recuperación de carritos 24/7. Convierte conversaciones en citas y ventas sin equipo manual.",
        price: "Desde €197/mes",
      },
    ],
  },
  {
    heading: "GESTIÓN Y AUTOMATIZACIÓN",
    services: [
      {
        title: "Gestión redes sociales",
        description:
          "Publicación, community y reporting unificado en todas tus redes. Crece engagement y tráfico a web o tienda sin contratar community managers.",
        price: "Desde €247/mes",
      },
      {
        title: "CRM y pipeline de ventas",
        description:
          "Leads, etapas y seguimiento automatizado en un solo panel. Cierra más oportunidades con menos leads perdidos por olvido.",
        price: "Incluido en plan",
      },
      {
        title: "Diseño web y landing pages",
        description:
          "Landings de conversión listas en 24-48h, alineadas a tus campañas. Tasas de conversión superiores a plantillas genéricas.",
        price: "Desde €497 única vez",
      },
      {
        title: "Ecommerce y tiendas online",
        description:
          "Catálogo, checkout y campañas de retargeting integrados. Escala ventas online con funnels medidos de punta a punta.",
        price: "Desde €397/mes",
      },
      {
        title: "Automatización de procesos",
        description:
          "Zapier, webhooks y flujos entre herramientas sin código manual. Ahorra horas semanales en tareas repetitivas del equipo.",
        price: "Incluido en plan",
      },
      {
        title: "Analítica y reporting avanzado",
        description:
          "Dashboards en tiempo real: ROAS, CAC, LTV y atribución multicanal. Decisiones basadas en datos, no en intuición.",
        price: "Incluido en plan",
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
      <p style={{ fontSize: "15px", fontWeight: 700, color: "#0084fc", margin: 0 }}>
        {service.price}
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
            style={{
              fontSize: "clamp(36px, 6vw, 60px)",
              fontWeight: 900,
              color: "#ffffff",
              margin: "0 0 20px",
              lineHeight: 1.1,
            }}
          >
            Marketing digital
            <br />
            sin límites
          </h1>
          <p style={{ fontSize: "18px", color: "#a8c8e8", margin: "0 0 36px", lineHeight: 1.6 }}>
            Agentes expertos gestionan tus canales de captación mientras tú te centras en crecer. Sin agencias, sin
            equipos, sin límites.
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
            Solicitar demo gratuita →
          </Link>
        </div>
        <NavyToWhiteTransition />
      </section>

      <section style={{ backgroundColor: "#ffffff", padding: "0 0 64px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "48px 24px 0" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2
              style={{
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: 800,
                color: "#07122a",
                margin: "0 0 16px",
              }}
            >
              Todo lo que necesitas para dominar tu mercado
            </h2>
            <p style={{ fontSize: "18px", color: "#5a6a8a", maxWidth: "560px", margin: "0 auto" }}>
              Cada servicio gestionado por agentes expertos especializados. Sin contrato de permanencia.
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

      <CtaFinal />
    </main>
  );
}
