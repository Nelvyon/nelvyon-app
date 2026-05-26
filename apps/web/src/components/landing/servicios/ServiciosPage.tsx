"use client";

import Image from "next/image";

import { ServicesGrid } from "../ServicesGrid";
import { FadeIn } from "../FadeIn";
import { LandingFooter } from "../LandingFooter";
import { MarketingNavbar } from "../MarketingNavbar";
import { BRAND } from "../shared";
import { PrimaryButton } from "../ui";

export function ServiciosPage() {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: BRAND.white, color: BRAND.textOnWhite, fontFamily: "var(--font-inter), system-ui, sans-serif" }}
    >
      <MarketingNavbar active="/servicios" />
      <main>
        <section className="border-b border-[#E5E7EB] bg-white py-16 md:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 md:grid-cols-2 md:px-6">
            <FadeIn>
              <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 md:text-5xl">
                25 servicios de marketing digital
              </h1>
              <p className="mt-4 text-lg text-[#6B7280]">
                Todo lo que tu negocio necesita para crecer online, con precios claros y un solo equipo.
              </p>
              <div className="mt-8">
                <PrimaryButton href="/contacto">Solicitar propuesta</PrimaryButton>
              </div>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="relative mx-auto aspect-[4/5] max-w-sm overflow-hidden rounded-2xl border border-[#E5E7EB] shadow-lg">
                <Image
                  alt="Aplicación de marketing en móvil"
                  className="object-cover"
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 400px"
                  src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=1000&fit=crop"
                />
              </div>
            </FadeIn>
          </div>
        </section>
        <ServicesGrid showHeading={false} />
        <section className="bg-[#F9FAFB] py-16 text-center md:py-20">
          <div className="mx-auto max-w-2xl px-4">
            <p className="text-sm text-[#6B7280]">
              Los resultados de marketing varían según sector, inversión y competencia. No garantizamos cifras
              concretas; trabajamos con KPIs acordados contigo.
            </p>
            <div className="mt-8">
              <PrimaryButton href="/contacto">Hablar con el equipo →</PrimaryButton>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
