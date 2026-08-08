// Enlace que usa `<a>` para las rutas servidas por el pack estatico y
// `next/link` para el resto. Ver EnlacePublico.tsx.
import { EnlacePublico as Link } from "@/features/public-web/components/EnlacePublico";

import { integrationsCatalog } from "../content/catalog";
import { saasShotSrc } from "../content/saasShots";
import { BrandCtaBand, BrandPageHero } from "./BrandPageHero";
import { BrandFaq } from "./BrandFaq";

const FAQ = [
  {
    question: "¿Hay DPA y documentación de subprocesadores?",
    answer:
      "Sí. DPA, subprocessors y políticas de seguridad están publicados en /legal/dpa y /seguridad. No ocultamos dependencias críticas.",
  },
  {
    question: "¿Cómo se gestiona el acceso multi-equipo?",
    answer:
      "RBAC por tenant con roles y permisos. Los contextos SaaS y OS/portal están separados; la autenticación usa cookies httpOnly y claims específicos.",
  },
  {
    question: "¿La IA está activa por defecto en producción?",
    answer:
      "No. Canary kill y spend off permanecen en kill hasta autorización explícita. Gobierno humano en decisiones críticas.",
  },
  {
    question: "¿Qué integraciones están disponibles?",
    answer:
      "Stripe, AWS SES, Google, Meta, WhatsApp/Twilio, Microsoft/Outlook, Slack y webhooks. Cada conector documenta su estado real de activación.",
  },
] as const;

export function EnterprisePage() {
  const integrations = integrationsCatalog.slice(0, 8);

  return (
    <>
      <BrandPageHero
        eyebrow="Enterprise NELVYON"
        title="Seguridad, escala y gobierno para operaciones exigentes"
        description="SaaS multi-tenant, automatización con kill-switch, integraciones gobernadas y documentación de cumplimiento. Composición enterprise — contenido profundo, sin plantilla genérica ni promesas inventadas."
        primaryCta={{ label: "Hablar con enterprise", href: "/contacto?tipo=enterprise" }}
        secondaryCta={{ label: "Centro de seguridad", href: "/seguridad" }}
        imageSrc={saasShotSrc("analytics")}
        imageAlt="Analytics SaaS NELVYON"
      />

      <section className="space overflow-hidden">
        <div className="container th-container5">
          <div className="row gy-4">
            {[
              {
                title: "Multi-tenant y RBAC",
                body: "Aislamiento por organización, roles y cookies httpOnly. Contextos SaaS y plataforma separados.",
              },
              {
                title: "Observabilidad",
                body: "Estados, métricas y evidencia de ejecución para dirección y operaciones.",
              },
              {
                title: "IA con gobierno",
                body: "Kill-switch y spend off hasta autorización. Sin activación silenciosa en producción.",
              },
              {
                title: "Cumplimiento documentado",
                body: "DPA, privacidad, cookies, términos y subprocesadores publicados en rutas legales reales.",
              },
            ].map((item) => (
              <div key={item.title} className="col-md-6 col-xl-3">
                <div style={{ padding: 24, borderRadius: 16, border: "1px solid #E0E0E0", height: "100%", background: "#fff" }}>
                  <h3 className="h6">{item.title}</h3>
                  <p className="mb-0" style={{ fontSize: 14 }}>
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space overflow-hidden" style={{ background: "#F4F7FF" }}>
        <div className="container th-container5">
          <div className="row align-items-center gy-4">
            <div className="col-lg-6">
              <span className="sub-title style3">[ Integraciones ]</span>
              <h2 className="sec-title h3">Conectores con estado honesto</h2>
              <p>
                No listamos logos decorativos. Cada integración del catálogo documenta su rol en la operación NELVYON.
              </p>
              <Link href="/integraciones" className="th-btn2 btn-gradient2">
                Ver integraciones
              </Link>
            </div>
            <div className="col-lg-6">
              <div className="row gy-3">
                {integrations.map((i) => (
                  <div key={i.id} className="col-6">
                    <div style={{ padding: 16, borderRadius: 12, background: "#fff", border: "1px solid #E0E0E0" }}>
                      <strong>{i.name}</strong>
                      <p className="mb-0" style={{ fontSize: 13, color: "#484848" }}>
                        {i.short}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space overflow-hidden">
        <div className="container th-container5">
          <div className="title-area text-center mb-40">
            <span className="sub-title style3">[ FAQ ]</span>
            <h2 className="sec-title h3">Preguntas enterprise</h2>
          </div>
          <BrandFaq items={[...FAQ]} />
        </div>
      </section>

      <BrandCtaBand
        title="Evaluación enterprise con alcance concreto"
        body="Seguridad, integraciones, SLA y despliegue — sin inventar clientes ni certificaciones."
        primaryCta={{ label: "Contactar enterprise", href: "/contacto?tipo=enterprise" }}
        secondaryCta={{ label: "Ver SaaS", href: "/producto" }}
      />
    </>
  );
}
