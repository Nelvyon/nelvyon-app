"use client";

import Image from "next/image";
import Link from "next/link";

import { FadeIn } from "./FadeIn";
import { HeroVideo } from "./HeroVideo";

export function LandingHero() {
  return (
    <section
      className="relative -mt-20 overflow-hidden pt-28 pb-16 md:pt-32 md:pb-24"
      style={{
        background: "linear-gradient(180deg, #07122a 0%, #1a4a7a 50%, #87CEEB 90%, #ffffff 100%)",
      }}
    >
      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-4 md:grid-cols-2 md:gap-14 md:px-6">
        <FadeIn>
          <span
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium text-white"
            style={{
              backgroundColor: "rgba(255,255,255,0.1)",
              borderColor: "rgba(255,255,255,0.3)",
              borderRadius: 50,
            }}
          >
            <span aria-hidden style={{ color: "#fbbf24" }}>
              ⚡
            </span>
            Agencia de marketing digital
          </span>
          <h1
            className="nelvyon-slogan-line mt-6 w-full text-white"
            style={{
              fontWeight: 900,
              fontSize: "clamp(52px, 7vw, 80px)",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            <span className="block">Donde nace tu imperio,</span>
            <span className="block" style={{ color: "#b8e4ff" }}>
              crece tu marca
            </span>
            <span className="block">y se impone tu legado</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/85">
            SEO, publicidad, email y automatización ejecutados por IA — resultados en semanas, sin
            contratar cinco agencias distintas.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              className="inline-flex items-center justify-center rounded-full px-7 py-3.5 text-sm transition hover:scale-[1.02] hover:brightness-95"
              href="/contacto"
              style={{
                backgroundColor: "#ffffff",
                color: "#0a1628",
                fontWeight: 700,
                borderRadius: 50,
              }}
            >
              Solicitar propuesta →
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-full border px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
              href="/servicios"
              style={{
                borderColor: "rgba(255,255,255,0.4)",
                backgroundColor: "transparent",
                borderRadius: 50,
              }}
            >
              Ver servicios
            </Link>
          </div>
          <p className="mt-6 text-sm text-white/75">
            <span className="text-white">✓</span> Sin permanencia rígida ·{" "}
            <span className="text-white">✓</span> Respuesta en 48h ·{" "}
            <span className="text-white">✓</span> 193 sectores atendidos
          </p>
        </FadeIn>
        <FadeIn delay={0.12}>
          <div className="relative">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-8 rounded-full opacity-40"
              style={{
                background: "radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 70%)",
              }}
            />
            <HeroVideo />
          </div>
        </FadeIn>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-8 left-1/2 z-[1] -translate-x-1/2 opacity-[0.06]"
      >
        <Image alt="" height={120} src="/logo.png.png" width={120} />
      </div>
    </section>
  );
}
