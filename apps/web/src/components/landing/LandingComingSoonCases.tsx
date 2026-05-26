"use client";

import { BRAND } from "./shared";
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
    <section className="relative py-20 md:py-28" style={{ backgroundColor: BRAND.bgAlt }}>
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <FadeIn>
          <SectionHeading
            light
            center
            subtitle="Estamos documentando resultados verificables con nuestros clientes actuales."
            title="Próximamente — Casos de éxito reales"
          />
        </FadeIn>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PLACEHOLDERS.map((p, i) => (
            <FadeIn delay={i * 0.1} key={p.sector}>
              <TiltCard className="flex min-h-[200px] flex-col items-center justify-center p-8 text-center">
                <span
                  className="mb-4 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wider"
                  style={{ borderColor: BRAND.cardBorder, color: BRAND.cyan }}
                >
                  {p.sector}
                </span>
                <p className="text-lg font-semibold text-white">Cliente en proceso</p>
                <p className="mt-2 text-sm" style={{ color: BRAND.textDim }}>
                  Resultados pendientes de publicar
                </p>
              </TiltCard>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
