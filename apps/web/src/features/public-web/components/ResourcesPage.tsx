import { BrandCardLink, BrandSection, BrandTitle } from "./BrandBlocks";
import { BrandCtaBand, BrandPageHero } from "./BrandPageHero";

const RESOURCE_SECTIONS = [
  {
    id: "blog",
    title: "Blog",
    description: "Artículos sobre SaaS B2B, automatización, seguridad y operación de marketing con IA.",
    items: [
      { label: "Todos los artículos", href: "/blog", body: "Contenido profesional en español, sin relleno genérico." },
    ],
  },
  {
    id: "guias",
    title: "Guías y producto",
    description: "Documentación orientada a decisión: qué incluye el SaaS, cómo funciona la agencia y qué esperar en onboarding.",
    items: [
      { label: "Hub del SaaS", href: "/producto", body: "Módulos, integraciones y comparativa SaaS vs Agencia." },
      { label: "Precios", href: "/precios", body: "Planes SaaS y presupuesto de agencia claramente separados." },
      { label: "FAQ", href: "/faq", body: "Preguntas frecuentes sobre producto, packs y enterprise." },
      { label: "Integraciones", href: "/integraciones", body: "Google, Meta, Stripe, WhatsApp y más." },
    ],
  },
  {
    id: "legal",
    title: "Legal y seguridad",
    description: "Transparencia para equipos legales, IT y compliance.",
    items: [
      { label: "Centro de seguridad", href: "/seguridad", body: "Prácticas, auth y gobierno de IA." },
      { label: "Aviso legal", href: "/aviso-legal", body: "Información legal de NELVYON." },
      { label: "DPA", href: "/legal/dpa", body: "Acuerdo de tratamiento de datos." },
      { label: "Enterprise", href: "/enterprise", body: "Seguridad, escala y cumplimiento." },
    ],
  },
  {
    id: "status",
    title: "Estado y partners",
    description: "Visibilidad operativa del producto y servicios.",
    items: [
      { label: "Status", href: "/status", body: "Estado de servicios e infraestructura." },
      { label: "Partners", href: "/partners", body: "Programa de partners y wholesale." },
      { label: "Contacto", href: "/contacto", body: "Demo, soporte y propuestas de agencia." },
    ],
  },
] as const;

export function ResourcesPage() {
  return (
    <>
      <BrandPageHero
        eyebrow="Recursos"
        title="Documentación, blog y referencias"
        description="Centro de recursos NELVYON: contenido útil para evaluar el SaaS, la agencia y los requisitos enterprise — sin páginas vacías."
        primaryCta={{ label: "Ir al blog", href: "/blog" }}
        secondaryCta={{ label: "FAQ", href: "/faq" }}
      />

      {RESOURCE_SECTIONS.map((section, sectionIdx) => (
        <BrandSection key={section.id} soft={sectionIdx % 2 === 1}>
          <BrandTitle title={section.title} description={section.description} />
          <div className="row gy-4">
            {section.items.map((item) => (
              <div key={item.href} className="col-md-6 col-xl-4">
                <BrandCardLink href={item.href} title={item.label} body={item.body} />
              </div>
            ))}
          </div>
        </BrandSection>
      ))}

      <BrandCtaBand
        title="¿Prefiere hablar con una persona?"
        body="El equipo le orienta sobre seguridad, legal, SaaS o activación."
        primaryCta={{ label: "Contactar", href: "/contacto" }}
        secondaryCta={{ label: "Ver precios", href: "/precios" }}
      />
    </>
  );
}
