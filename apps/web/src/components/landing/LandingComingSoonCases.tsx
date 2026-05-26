"use client";

import { FadeIn } from "./FadeIn";
import { SectionHeading } from "./ui";
import { TiltCard } from "./effects/TiltCard";

const PLACEHOLDERS = [
  { sector: "E-commerce" },
  { sector: "Servicios profesionales" },
  { sector: "Salud y bienestar" },
] as const;

export function LandingComingSoonCases() {
  return (
    <section className="nelvyon-section-white bg-white py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <FadeIn>
          <SectionHeading
            center
            subtitle="Estamos documentando resultados verificables con nuestros clientes actuales."
            title="Próximamente — Casos de éxito reales"
            variant="light"
          />
        </FadeIn>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PLACEHOLDERS.map((p, i) => (
            <FadeIn delay={i * 0.1} key={p.sector}>
              <TiltCard className="flex min-h-[200px] flex-col items-center justify-center border-[#E5E7EB] bg-white p-8 text-center shadow-sm">
                <span className="mb-4 rounded-full border border-[#E5E7EB] px-3 py-1 text-xs font-medium uppercase tracking-wider text-[#0066FF]">
                  {p.sector}
                </span>
                <p className="text-lg font-semibold text-zinc-900">Cliente en proceso</p>
                <p className="mt-2 text-sm text-[#6B7280]">Resultados pendientes de publicar</p>
              </TiltCard>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
