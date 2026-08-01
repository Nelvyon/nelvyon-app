import type { Metadata } from "next";

import { StandardPage, pageContent } from "@/features/public-web";

const content = {
  ...pageContent.agencia,
  title: "Nosotros",
  eyebrow: "Empresa",
  description:
    "NELVYON es una operacion digital: agencia de marketing ejecutada por IA y plataforma SaaS B2B para CRM, campanas, workflows y packs OS.",
  seoTitle: "Nosotros | NELVYON",
  seoDescription:
    "Conozca NELVYON: mision, metodo y arquitectura de producto para marketing y ventas con IA y software enterprise.",
  sections: [
    {
      heading: "Mision",
      body: "Sustituir el caos de herramientas sueltas por un sistema que captura, vende y opera con trazabilidad: agencia y software en el mismo criterio de calidad.",
    },
    {
      heading: "Metodo",
      body: "Diagnostico, diseno de operacion, implementacion y mejora continua. Cada fase tiene responsables, entregables y metricas revisables.",
      bullets: [
        "Producto real sobre APIs y base de datos",
        "Packs OS con control de calidad",
        "Portal cliente para aprobacion de entregables",
      ],
    },
    {
      heading: "Cultura de excelencia",
      body: "Priorizamos calidad demostrable, seguridad, observabilidad y documentacion viva. No presentamos mocks como producto ni metricas de clientes inventadas.",
    },
    ...pageContent.agencia.sections,
  ],
};

export const metadata: Metadata = {
  title: content.seoTitle,
  description: content.seoDescription,
  alternates: { canonical: "/nosotros" },
};

export default function NosotrosPage() {
  return (
    <StandardPage
      content={content}
      imageSrc="/brand/public/agency-brand.webp"
      imageAlt="Equipo profesional de NELVYON en entorno de trabajo"
      primaryCta={{ label: "Contactar", href: "/contacto" }}
      secondaryCta={{ label: "Ver plataforma", href: "/plataforma" }}
    />
  );
}
