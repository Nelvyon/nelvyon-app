import type { Metadata } from "next";
import Link from "next/link";

import { StandardPage, pageContent } from "@/features/public-web";
import { nelvyonServices } from "@/config/nelvyon-pa-content";

const content = pageContent["servicios-overview"];

export const metadata: Metadata = {
  title: { absolute: content.seoTitle },
  description: content.seoDescription,
  alternates: { canonical: "/servicios" },
};

export default function ServiciosPage() {
  return (
    <StandardPage
      content={content}
      imageSrc="/brand/public/service-ops.webp"
      imageAlt="Operación de servicios profesionales NELVYON"
      primaryCta={{ label: "Solicitar propuesta", href: "/contacto" }}
      secondaryCta={{ label: "Ver precios", href: "/precios" }}
    >
      <div className="nv-public-panel p-6">
        <h2 className="text-lg font-semibold text-white">Servicios destacados</h2>
        <ul className="mt-4 space-y-3">
          {nelvyonServices.map((service) => (
            <li key={service.href}>
              <Link href={service.href} className="group block">
                <p className="font-medium text-white group-hover:text-[var(--nv-accent)]">{service.title}</p>
                <p className="mt-1 text-sm text-[var(--nv-muted)]">{service.microcopy}</p>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/automatizaciones-ia" className="nv-public-btn nv-public-btn-secondary mt-6 w-full !text-sm">
          Automatizaciones IA
        </Link>
      </div>
    </StandardPage>
  );
}
