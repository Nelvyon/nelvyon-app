"use client";

import { BRAND } from "./shared";
import { HeroVideo } from "./HeroVideo";
import { FadeIn } from "./FadeIn";
import { GhostButton, PrimaryButton } from "./ui";

export function LandingHero() {
  return (
    <section
      className="relative overflow-hidden pt-8 pb-12 md:pt-14 md:pb-20"
      style={{
        background: `linear-gradient(180deg, ${BRAND.bg} 0%, ${BRAND.heroGradEnd} 100%)`,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, rgba(0,102,255,0.2), transparent 45%), radial-gradient(circle at 85% 80%, rgba(0,207,255,0.12), transparent 40%)",
        }}
      />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 md:grid-cols-2 md:gap-14 md:px-6">
        <FadeIn>
          <span
            className="inline-flex rounded-full border px-4 py-1.5 text-xs font-medium"
            style={{ borderColor: BRAND.cardBorder, backgroundColor: BRAND.card, color: BRAND.cyan }}
          >
            Agencia de marketing digital · Resultados medibles
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-white md:text-5xl lg:text-[3.25rem]">
            Donde nace tu imperio,
            <br />
            <span style={{ color: BRAND.blue }}>crece tu marca</span> y se impone tu legado
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed" style={{ color: BRAND.textMuted }}>
            SEO, publicidad, email y automatización ejecutados por expertos — sin contratar cinco
            proveedores distintos.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <PrimaryButton href="/contacto">Solicitar propuesta →</PrimaryButton>
            <GhostButton href="/servicios">Ver servicios</GhostButton>
          </div>
          <p className="mt-6 text-sm" style={{ color: BRAND.textDim }}>
            <span style={{ color: BRAND.blue }}>✓</span> Sin permanencia rígida ·{" "}
            <span style={{ color: BRAND.blue }}>✓</span> Respuesta en 48h ·{" "}
            <span style={{ color: BRAND.blue }}>✓</span> +193 sectores
          </p>
        </FadeIn>
        <FadeIn delay={0.12}>
          <HeroVideo />
        </FadeIn>
      </div>
    </section>
  );
}
