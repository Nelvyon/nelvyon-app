"use client";

import { COLORS } from "./constants";
import { DashboardMockup } from "./DashboardMockup";
import { FadeIn } from "./FadeIn";
import { GhostButton, PrimaryButton } from "./ui";

export function LandingHero() {
  return (
    <section
      className="relative min-h-[90vh] overflow-hidden pt-8 pb-16 md:pt-12 md:pb-24"
      style={{
        background: `linear-gradient(180deg, ${COLORS.bg} 0%, ${COLORS.heroGradEnd} 100%)`,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(0,102,255,0.25) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(0,207,255,0.15) 0%, transparent 45%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,102,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,102,255,0.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 md:grid-cols-2 md:px-6 lg:gap-16">
        <FadeIn>
          <span
            className="inline-flex rounded-full border px-4 py-1.5 text-xs font-medium text-zinc-300"
            style={{ borderColor: COLORS.cardBorder, backgroundColor: COLORS.card }}
          >
            ⚡ La plataforma de marketing más completa
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-white md:text-5xl lg:text-6xl">
            Donde nace tu imperio,
            <br />
            crece tu marca
            <br />
            <span style={{ color: COLORS.primary }}>y se impone tu legado</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-zinc-400">
            Todo lo que necesita tu negocio para captar clientes, automatizar marketing y crecer —
            en una sola plataforma.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <PrimaryButton>Empieza gratis →</PrimaryButton>
            <GhostButton href="#plataforma">Ver demostración</GhostButton>
          </div>
          <p className="mt-6 text-sm text-zinc-500">
            <span style={{ color: COLORS.primary }}>✓</span> Sin permanencia ·{" "}
            <span style={{ color: COLORS.primary }}>✓</span> Configuración en minutos ·{" "}
            <span style={{ color: COLORS.primary }}>✓</span> Soporte incluido
          </p>
        </FadeIn>
        <FadeIn delay={0.15}>
          <DashboardMockup className="w-full" />
        </FadeIn>
      </div>
    </section>
  );
}
