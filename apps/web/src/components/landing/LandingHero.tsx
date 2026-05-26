"use client";

import { NeuralNetwork } from "@/components/ui/NeuralNetwork";

import { BRAND } from "./shared";
import { HeroVideo } from "./HeroVideo";
import { FadeIn } from "./FadeIn";
import { GhostButton, PrimaryButton } from "./ui";

export function LandingHero() {
  return (
    <section
      className="relative overflow-hidden bg-black pt-8 pb-12 md:pt-14 md:pb-20"
      style={{ backgroundColor: BRAND.bg }}
    >
      <NeuralNetwork />
      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-4 md:grid-cols-2 md:gap-14 md:px-6">
        <FadeIn>
          <span
            className="inline-flex rounded-full border px-4 py-1.5 text-xs font-medium"
            style={{ borderColor: BRAND.cardBorder, backgroundColor: BRAND.card, color: BRAND.cyan }}
          >
            Agencia de marketing digital
          </span>
          <h1 className="nelvyon-title-glow mt-6 w-full">
            <span className="nelvyon-slogan-line text-[clamp(1.75rem,5vw,3.25rem)] text-white">
              Donde nace tu imperio,
            </span>
            <span
              className="nelvyon-slogan-line text-[clamp(1.5rem,4.2vw,2.75rem)]"
              style={{ color: BRAND.blue }}
            >
              crece tu marca
            </span>
            <span className="nelvyon-slogan-line text-[clamp(1.25rem,3.5vw,2.25rem)] text-white">
              y se impone tu legado
            </span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed" style={{ color: BRAND.textMuted }}>
            SEO, publicidad, email y automatización ejecutados por expertos — sin contratar cinco
            proveedores distintos.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <PrimaryButton className="nelvyon-glow-btn hover:scale-[1.03]" href="/contacto">
              Solicitar propuesta →
            </PrimaryButton>
            <GhostButton className="hover:scale-[1.03]" href="/servicios">
              Ver servicios
            </GhostButton>
          </div>
          <p className="mt-6 text-sm" style={{ color: BRAND.textDim }}>
            <span style={{ color: BRAND.blue }}>✓</span> Sin permanencia rígida ·{" "}
            <span style={{ color: BRAND.blue }}>✓</span> Respuesta en 48h ·{" "}
            <span style={{ color: BRAND.blue }}>✓</span> 193 sectores atendidos
          </p>
        </FadeIn>
        <FadeIn delay={0.12}>
          <HeroVideo />
        </FadeIn>
      </div>
    </section>
  );
}
