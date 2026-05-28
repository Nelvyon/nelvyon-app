import type { Metadata } from "next";
import { CtaFinal } from "@/components/agenforce/cta-final";
import { MarketingPageHero } from "@/components/agenforce/marketing-page-hero";

export const metadata: Metadata = {
  title: "Nosotros | NELVYON — La empresa detrás de la automatización",
  description: "NELVYON nace para ordenar el crecimiento. Conoce nuestra misión, visión, valores y forma de trabajar con agentes expertos.",
};

const values = [
  { title: "Seriedad", desc: "Trabajamos con mensajes claros, procesos documentados y expectativas responsables." },
  { title: "Transparencia", desc: "La empresa debe saber qué se hace, cómo se hace y qué información se está utilizando." },
  { title: "Orden", desc: "Un sistema bien diseñado reduce confusión, duplicidades y pérdida de información." },
  { title: "Continuidad", desc: "Los agentes expertos permiten mantener tareas activas sin depender siempre de intervención humana." },
  { title: "Criterio", desc: "Automatizar no significa improvisar más rápido. Significa ejecutar mejor lo que ha sido pensado con rigor." },
  { title: "Escalabilidad", desc: "La infraestructura debe poder crecer con la empresa sin romper su operación." },
];

const formaTrabajar = [
  { step: "1", title: "Primero entendemos", desc: "Antes de configurar campañas o automatizaciones, analizamos cómo funciona la empresa." },
  { step: "2", title: "Después estructuramos", desc: "Definimos qué procesos deben centralizarse, qué tareas pueden automatizarse y qué módulos son necesarios." },
  { step: "3", title: "Luego implementamos", desc: "Configuramos la plataforma, los flujos, los agentes expertos y los elementos operativos." },
  { step: "4", title: "Finalmente operamos", desc: "El sistema se mantiene activo, se revisa y se ajusta con criterios claros." },
];

export default function NosotrosPage() {
  return (
    <main>
      <MarketingPageHero
        eyebrow="Sobre NELVYON"
        title="NELVYON nace para ordenar el crecimiento"
        subtitle="Creamos una nueva forma de operar marketing, ventas y automatización: más centralizada, más continua y más profesional."
      />
      <section className="nelvyon-mkt-section" style={{ backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <div className="nelvyon-nosotros-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "start" }}>
            <div>
              <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#0084fc", marginBottom: "16px" }}>
                Quiénes somos
              </p>
              <p style={{ fontSize: "17px", color: "#5a6a8a", lineHeight: 1.7, margin: "0 0 24px" }}>
                NELVYON es una empresa construida sobre una idea simple: las empresas modernas no pueden depender de procesos dispersos, herramientas aisladas y ejecución improvisada. El marketing necesita estrategia. Las ventas necesitan seguimiento. La automatización necesita lógica. La dirección necesita visibilidad. NELVYON une estos elementos en una plataforma operativa con servicios profesionales y agentes expertos.
              </p>
              <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#0084fc", marginBottom: "12px" }}>
                Misión
              </p>
              <p style={{ fontSize: "17px", color: "#5a6a8a", lineHeight: 1.7, margin: "0 0 24px" }}>
                Ayudar a empresas a construir sistemas de marketing y ventas más claros, automatizados y medibles. Nuestra misión no es prometer resultados imposibles. Es aportar estructura, ejecución y tecnología para que cada empresa pueda operar con mayor control.
              </p>
              <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#0084fc", marginBottom: "12px" }}>
                Visión
              </p>
              <p style={{ fontSize: "17px", color: "#5a6a8a", lineHeight: 1.7, margin: 0 }}>
                Convertir NELVYON en una infraestructura de referencia para empresas que quieren trabajar su marketing, ventas y operaciones desde un entorno centralizado. Una plataforma capaz de combinar criterio humano, agentes expertos y automatización continua.
              </p>
            </div>
            <div>
              <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#0084fc", marginBottom: "16px" }}>
                NELVYON OS
              </p>
              <p style={{ fontSize: "17px", color: "#5a6a8a", lineHeight: 1.7, margin: "0 0 24px" }}>
                NELVYON OS es el sistema operativo interno que coordina agentes expertos, automatizaciones, módulos y procesos. Su función es conectar piezas que normalmente trabajan separadas: campañas, CRM, email, WhatsApp, contenido, reporting, ecommerce e integraciones externas. NELVYON OS no es una promesa comercial. Es la forma en la que estructuramos la operación.
              </p>
              <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#0084fc", marginBottom: "16px" }}>
                Equipo
              </p>
              <p style={{ fontSize: "17px", color: "#5a6a8a", lineHeight: 1.7, margin: 0 }}>
                NELVYON combina fundadores, especialistas estratégicos y agentes expertos operativos. Los fundadores definen visión, criterio y estándares de calidad. Los especialistas aportan ejecución profesional. Los agentes expertos mantienen tareas operativas activas de forma continua.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="nelvyon-mkt-section" style={{ backgroundColor: "#f8faff" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#0084fc", marginBottom: "12px" }}>
              Lo que nos define
            </p>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#07122a", margin: 0 }}>
              Nuestros valores
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px" }}>
            {values.map((v, i) => (
              <div key={i} style={{ backgroundColor: "#ffffff", border: "1px solid #e8eef8", borderRadius: "12px", padding: "28px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#07122a", margin: "0 0 10px" }}>{v.title}</h3>
                <p style={{ fontSize: "14px", color: "#5a6a8a", lineHeight: 1.6, margin: 0 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="nelvyon-mkt-section" style={{ backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#0084fc", marginBottom: "12px" }}>
              Forma de trabajar
            </p>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#07122a", margin: "0 0 16px" }}>
              Cómo implementamos cada proyecto
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0", marginBottom: "64px" }}>
            {formaTrabajar.map((m, i) => (
              <div key={i} style={{ display: "flex", gap: "24px", paddingBottom: i < formaTrabajar.length - 1 ? "40px" : "0" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "linear-gradient(135deg, #07122a, #0084fc)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "12px", fontWeight: 800, flexShrink: 0 }}>
                    {m.step}
                  </div>
                  {i < formaTrabajar.length - 1 && (
                    <div style={{ width: "2px", flex: 1, backgroundColor: "#e8eef8", marginTop: "8px" }} />
                  )}
                </div>
                <div style={{ paddingTop: "10px" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#07122a", margin: "0 0 8px" }}>{m.title}</h3>
                  <p style={{ fontSize: "15px", color: "#5a6a8a", lineHeight: 1.6, margin: 0 }}>{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <style>{`
        @media (max-width: 768px) {
          .nelvyon-nosotros-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
        }
      `}</style>
      <CtaFinal
        title="Una empresa seria necesita un sistema serio"
        subtitle="NELVYON está diseñado para compañías que quieren dejar de improvisar y empezar a operar con estructura."
        primaryLabel="Conocer NELVYON"
        showSecondary={false}
      />
    </main>
  );
}
