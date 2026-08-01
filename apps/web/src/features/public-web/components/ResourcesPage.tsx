import Link from "next/link";

import {
  DeepHero,
  DeepPageShell,
} from "./DeepPage";
import { Reveal } from "./Reveal";
import { Container, SectionHeading, SectionShell } from "./ui";

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
    title: "Estado y changelog",
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
    <DeepPageShell
      ctaTitle="¿Prefiere hablar con una persona?"
      ctaBody="El equipo le orienta sobre seguridad, legal, SaaS o activación."
    >
      <DeepHero
        eyebrow="Recursos"
        title="Documentación, blog y referencias"
        description="Centro de recursos NELVYON: contenido útil para evaluar el SaaS, la agencia y los requisitos enterprise — sin páginas vacías."
        primaryCta={{ label: "Ir al blog", href: "/blog" }}
        secondaryCta={{ label: "FAQ", href: "/faq" }}
        image="/brand/public/library/photos/F-02.webp"
        imageAlt="Infraestructura y operaciones tecnológicas"
      />

      {RESOURCE_SECTIONS.map((section, sectionIdx) => (
        <SectionShell key={section.id} className={sectionIdx % 2 === 1 ? "bg-[var(--nv-bg-soft)]" : ""}>
          <Container>
            <Reveal>
              <SectionHeading title={section.title} description={section.description} />
            </Reveal>
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {section.items.map((item, i) => (
                <Reveal key={item.href} delayMs={i * 30}>
                  <Link
                    href={item.href}
                    className="nv-public-panel block h-full p-6 transition-colors hover:border-[rgba(0,132,255,0.4)]"
                  >
                    <h3 className="text-lg font-semibold text-[var(--nv-fg-strong)]">{item.label}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--nv-muted)]">{item.body}</p>
                    <span className="mt-5 inline-flex text-sm font-medium text-[var(--nv-accent-deep)]">Abrir →</span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </Container>
        </SectionShell>
      ))}
    </DeepPageShell>
  );
}
