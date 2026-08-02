import { integrationsCatalog } from "../content/catalog";
import { saasShotSrc } from "../content/saasShots";
import { AiorAsideNext, AiorFeatureGrid, AiorSection, AiorTitle } from "./AiorBlocks";
import { AiorCtaBand, AiorPageHero } from "./AiorPageHero";
import { AiorFaq } from "./AiorFaq";

const CONNECTIVITY_LABEL: Record<string, string> = {
  nativo: "Nativo",
  api: "API",
  webhook: "Webhook",
  oauth: "OAuth",
};

const categories = [...new Set(integrationsCatalog.map((i) => i.category))];

const FAQ = [
  {
    question: "¿Todas las integraciones están activas en mi cuenta?",
    answer:
      "No necesariamente. Stripe y SES son nativos pero requieren configuración de entorno. Google/Meta/WhatsApp se activan por proyecto.",
  },
  {
    question: "¿Pueden desarrollar un conector custom?",
    answer: "Sí, en alcance enterprise. Evaluamos API, webhooks y requisitos de compliance en discovery.",
  },
  {
    question: "¿WhatsApp funciona out-of-the-box?",
    answer: "Requiere Twilio/WhatsApp Business configurado. La UI indica el estado real.",
  },
  {
    question: "¿Dónde veo el mapa completo del SaaS?",
    answer: "En /producto encontrará módulos e integraciones vinculadas al software operativo.",
  },
] as const;

export function IntegrationsPage() {
  return (
    <>
      <AiorPageHero
        eyebrow="Integraciones"
        title="Conecte NELVYON con su ecosistema real"
        description="Stripe, AWS SES, Google, Meta, WhatsApp, Microsoft, Outlook, Slack, Twilio y webhooks. Cada integración documenta su modo de conectividad y estado de activación — sin fingir conexiones que no existen."
        primaryCta={{ label: "Solicitar integración", href: "/contacto" }}
        secondaryCta={{ label: "Ver SaaS", href: "/producto" }}
        imageSrc={saasShotSrc("workflows")}
        imageAlt="Automatizaciones e integraciones SaaS NELVYON"
      />

      <AiorSection soft>
        <AiorTitle
          eyebrow="Principio"
          title="Estados honestos"
          description="Si una integración requiere configuración (SES, Twilio, OAuth de proyecto), la UI y esta documentación lo indican."
        />
        <AiorFeatureGrid
          items={[
            { title: "Nativo", body: "Integrado en el producto (Stripe billing, SES campañas)." },
            { title: "OAuth / API", body: "Activación por proyecto o credenciales del cliente." },
            { title: "Webhooks", body: "Eventos salientes para Slack, Zapier y sistemas propios." },
          ]}
        />
      </AiorSection>

      {categories.map((category, idx) => {
        const items = integrationsCatalog.filter((i) => i.category === category);
        return (
          <AiorSection key={category} soft={idx % 2 === 1}>
            <AiorTitle eyebrow={category} title={`Integraciones · ${category}`} />
            <div className="row gy-4">
              {items.map((item) => (
                <div key={item.id} className="col-md-6 col-xl-4">
                  <article
                    style={{
                      padding: 24,
                      borderRadius: 16,
                      border: "1px solid #E0E0E0",
                      background: "#fff",
                      height: "100%",
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <span
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            background: "#F4F7FF",
                            display: "grid",
                            placeItems: "center",
                            fontWeight: 700,
                          }}
                        >
                          {item.initial}
                        </span>
                        <h3 className="h6 mb-0">{item.name}</h3>
                      </div>
                      <span className="sub-title style3 mb-0">
                        {CONNECTIVITY_LABEL[item.connectivity] ?? item.connectivity}
                      </span>
                    </div>
                    <p style={{ fontSize: 14 }}>{item.short}</p>
                    <p style={{ fontSize: 12, color: "#6b7c93", textTransform: "uppercase", fontWeight: 600 }}>
                      {item.status.replace("_", " ")} · {item.statusNote}
                    </p>
                    <ul style={{ paddingLeft: 18, marginBottom: 0, fontSize: 13, color: "#484848" }}>
                      {item.capabilities.map((cap) => (
                        <li key={cap}>{cap}</li>
                      ))}
                    </ul>
                  </article>
                </div>
              ))}
            </div>
          </AiorSection>
        );
      })}

      <AiorSection soft>
        <div className="row gy-4">
          <div className="col-lg-7">
            <AiorTitle eyebrow="FAQ" title="Preguntas sobre integraciones" />
            <AiorFaq items={[...FAQ]} />
          </div>
          <div className="col-lg-5">
            <AiorAsideNext
              body="Cuéntenos qué sistemas debe conectar su operación y le proponemos alcance técnico concreto."
              primaryCta={{ label: "Contactar", href: "/contacto" }}
              secondaryCta={{ label: "Enterprise", href: "/enterprise" }}
            />
          </div>
        </div>
      </AiorSection>

      <AiorCtaBand
        title="¿Falta un conector crítico?"
        body="Evaluamos webhooks, APIs OAuth y alcance enterprise para su stack."
        primaryCta={{ label: "Hablar con NELVYON", href: "/contacto" }}
        secondaryCta={{ label: "Ver SaaS", href: "/producto" }}
      />
    </>
  );
}
