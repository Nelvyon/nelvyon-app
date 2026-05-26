"use client";

import Image from "next/image";
import Link from "next/link";

import { FadeIn } from "./FadeIn";

const DASHBOARD_CARDS = [
  { value: "127", label: "LEADS HOY", delta: "+18%" },
  { value: "4.2x", label: "ROAS", delta: "+12%" },
  { value: "8.4%", label: "CONVERSIÓN", delta: "+3%" },
  { value: "€24.8k", label: "INGRESOS", delta: "+22%" },
] as const;

const CHART_HEIGHTS = ["40%", "65%", "45%", "80%", "55%", "90%", "70%"] as const;

function HeroDashboardMock() {
  return (
    <div
      className="w-full"
      style={{
        borderRadius: 16,
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.15)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        padding: 20,
        boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
      }}
    >
      <div className="flex items-center gap-3">
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: "#ff5f57" }} />
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: "#febc2e" }} />
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: "#28c840" }} />
        <span
          className="flex-1 text-center"
          style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}
        >
          NELVYON Dashboard
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {DASHBOARD_CARDS.map((card) => (
          <div
            key={card.label}
            style={{
              background: "rgba(255,255,255,0.06)",
              borderRadius: 10,
              padding: 14,
            }}
          >
            <p className="font-bold text-white" style={{ fontSize: 22 }}>
              {card.value}
            </p>
            <p
              className="mt-1 uppercase"
              style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}
            >
              {card.label}
            </p>
            <p className="mt-1" style={{ color: "#4ade80", fontSize: 11 }}>
              {card.delta}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <p className="uppercase text-white" style={{ fontSize: 11 }}>
          Rendimiento semanal
        </p>
        <div className="mt-2 flex items-end gap-1.5" style={{ height: 60 }}>
          {CHART_HEIGHTS.map((h, i) => (
            <div
              className="flex-1"
              key={i}
              style={{
                height: h,
                maxHeight: 60,
                background: "linear-gradient(to top, #0066ff, #00cfff)",
                borderRadius: "4px 4px 0 0",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

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
          <HeroDashboardMock />
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
