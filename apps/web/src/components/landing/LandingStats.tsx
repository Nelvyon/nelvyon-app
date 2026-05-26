"use client";

import { AnimatedCounter } from "./effects/AnimatedCounter";
import { FadeIn } from "./FadeIn";
import { BRAND } from "./shared";

const STATS = [
  { value: 193, suffix: "+", label: "Sectores atendidos" },
  { value: 25, suffix: "", label: "Servicios incluidos" },
  { value: 48, suffix: "h", label: "Tiempo de respuesta", noCount: true },
  { value: 100, suffix: "%", label: "IA en cada servicio" },
] as const;

export function LandingStats() {
  return (
    <section className="py-16 md:py-20" style={{ backgroundColor: BRAND.bgSection }}>
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {STATS.map((s, i) => (
            <FadeIn delay={i * 0.05} key={s.label}>
              <div
                className="rounded-2xl border p-6 text-center transition duration-200 hover:scale-[1.02] hover:border-[#0066FF]"
                style={{ backgroundColor: BRAND.bg, borderColor: BRAND.cardBorder }}
              >
                <p className="text-[48px] font-extrabold leading-none tabular-nums text-[#00CFFF]">
                  {"noCount" in s && s.noCount ? (
                    <>
                      {s.value}
                      {s.suffix}
                    </>
                  ) : (
                    <AnimatedCounter suffix={s.suffix} value={s.value} />
                  )}
                </p>
                <p className="mt-2 text-sm text-[#94A3B8]">{s.label}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
