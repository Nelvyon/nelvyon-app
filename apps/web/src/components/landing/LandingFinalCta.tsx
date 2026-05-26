import Image from "next/image";

import { BRAND } from "./shared";
import { FadeIn } from "./FadeIn";
import { PrimaryButton } from "./ui";

export function LandingFinalCta() {
  return (
    <section
      className="relative overflow-hidden py-20 md:py-28"
      style={{
        background: `linear-gradient(135deg, ${BRAND.bg} 0%, ${BRAND.heroGradEnd} 100%)`,
      }}
    >
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 md:grid-cols-2 md:px-6">
        <FadeIn>
          <h2 className="text-3xl font-bold text-white md:text-4xl lg:text-5xl">
            Tu competencia ya invierte en digital. ¿Y tú?
          </h2>
          <p className="mt-4 text-lg" style={{ color: BRAND.textMuted }}>
            Cuéntanos tu negocio y recibe una propuesta personalizada en 48 horas.
          </p>
          <div className="mt-8">
            <PrimaryButton className="px-8 py-4 text-base" href="/contacto">
              Solicitar propuesta gratis →
            </PrimaryButton>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="relative mx-auto aspect-square max-w-sm overflow-hidden rounded-2xl border border-white/10">
            <Image
              alt="Equipo de marketing digital"
              className="object-cover"
              fill
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=600&fit=crop"
            />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
