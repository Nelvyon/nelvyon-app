import Image from "next/image";

import { COLORS } from "./constants";
import { DashboardMockup } from "./DashboardMockup";
import { FadeIn } from "./FadeIn";
import { PrimaryButton } from "./ui";

export function LandingFinalCta() {
  return (
    <section
      className="relative overflow-hidden py-20 md:py-28"
      style={{
        background: `linear-gradient(135deg, ${COLORS.bg} 0%, ${COLORS.heroGradEnd} 100%)`,
      }}
    >
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 md:grid-cols-2 md:px-6">
        <FadeIn>
          <h2 className="text-3xl font-bold text-white md:text-4xl lg:text-5xl">
            Tu competencia ya usa IA. Tú también puedes.
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Empieza hoy y lanza tu primer campaña en menos de 24 horas.
          </p>
          <div className="mt-8">
            <PrimaryButton className="px-8 py-4 text-base">Empieza gratis →</PrimaryButton>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="relative">
            <DashboardMockup className="hidden md:block" />
            <div className="relative mx-auto mt-8 h-64 w-64 overflow-hidden rounded-2xl border border-white/10 md:absolute md:-bottom-8 md:right-0 md:mt-0 md:h-48 md:w-48">
              <Image
                alt="Profesional satisfecho"
                className="object-cover"
                fill
                src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop"
              />
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
