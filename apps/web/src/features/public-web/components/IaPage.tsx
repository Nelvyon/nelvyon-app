import Image from "next/image";
import Link from "next/link";

import { getModule } from "../content/catalog";
import { saasShotSrc } from "../content/saasShots";
import { AiorCtaBand, AiorPageHero } from "./AiorPageHero";
import { AiorFaq } from "./AiorFaq";

const FAQ = [
  {
    question: "¿La IA está activa por defecto en producción?",
    answer:
      "No. Canary kill y spend off permanecen en kill hasta autorización explícita. El panel existe en producto; el gobierno humano decide cuándo activar.",
  },
  {
    question: "¿Qué diferencia hay entre IA y Agentes?",
    answer:
      "El panel IA concentra gobierno, evidencias y controles. Los agentes ejecutan tareas de marketing y ops con supervisión. Ambos viven en el SaaS NELVYON.",
  },
  {
    question: "¿Usan modelos genéricos de chat como producto?",
    answer:
      "NELVYON no vende un chatbot demo. La IA está acoplada a CRM, workflows, packs OS y políticas de seguridad del tenant.",
  },
] as const;

export function IaPage() {
  const mod = getModule("ia");
  const agentes = getModule("agentes");

  return (
    <>
      <AiorPageHero
        eyebrow="Inteligencia artificial"
        title={mod?.hero.title ?? "IA operativa con gobierno enterprise"}
        description={
          mod?.hero.body ??
          "Panel de IA, agentes y packs OS con kill-switch, trazabilidad y revisión humana. Sin robots de plantilla ni promesas genéricas."
        }
        primaryCta={{ label: "Solicitar demo IA", href: "/contacto?tipo=ia" }}
        secondaryCta={{ label: "Ver agentes", href: "/producto/agentes" }}
        imageSrc={saasShotSrc("ai")}
        imageAlt="Panel de IA NELVYON"
      />

      <section className="space overflow-hidden">
        <div className="container th-container5">
          <div className="row gy-4">
            {[
              {
                title: "Gobierno y kill-switch",
                body: "Controles de canary y spend para que la IA no opere sin autorización en producción.",
              },
              {
                title: "Agentes especializados",
                body: agentes?.short ?? "Agentes para tareas de marketing y operación con supervisión.",
                href: "/producto/agentes",
              },
              {
                title: "Packs OS",
                body: "Orquestación de entregables de marketing con QA y portal de aprobación.",
                href: "/agencia",
              },
              {
                title: "Acoplado al SaaS",
                body: "La IA trabaja sobre CRM, campañas y workflows del tenant — no en un silo demo.",
                href: "/producto",
              },
            ].map((item) => (
              <div key={item.title} className="col-md-6">
                <div style={{ padding: 28, borderRadius: 16, border: "1px solid #E0E0E0", height: "100%", background: "#fff" }}>
                  <h3 className="box-title h5">{item.title}</h3>
                  <p>{item.body}</p>
                  {"href" in item && item.href ? (
                    <Link href={item.href} className="th-btn2 style2">
                      Saber más
                    </Link>
                  ) : null}
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
              <span className="sub-title style3">[ Producto ]</span>
              <h2 className="sec-title h3">Capturas reales del panel y agentes</h2>
              <p>
                Entorno demo controlado sin PII de clientes. Interfaces e identidad NELVYON — sin capturas genéricas
                de plantilla.
              </p>
            </div>
            <div className="col-lg-6">
              <Image
                src={saasShotSrc("agentes")}
                alt="Agentes IA NELVYON"
                width={800}
                height={500}
                className="nv-aior-product-shot"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="space overflow-hidden">
        <div className="container th-container5">
          <div className="title-area text-center mb-40">
            <span className="sub-title style3">[ FAQ ]</span>
            <h2 className="sec-title h3">IA con criterios reales</h2>
          </div>
          <AiorFaq items={[...FAQ]} />
        </div>
      </section>

      <AiorCtaBand
        title="Evalúe IA NELVYON con su operación"
        body="Mostramos gobierno, límites y módulos reales — sin inventar métricas ni clientes."
        primaryCta={{ label: "Hablar con el equipo", href: "/contacto?tipo=ia" }}
        secondaryCta={{ label: "Ver SaaS completo", href: "/producto" }}
      />
    </>
  );
}
