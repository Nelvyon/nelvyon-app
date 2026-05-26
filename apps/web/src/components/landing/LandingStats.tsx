"use client";

import { AGENCY_STATS } from "./agencyContent";
import { AnimatedCounter } from "./effects/AnimatedCounter";
import { GrowthCharts } from "./GrowthCharts";
import { BRAND } from "./shared";
import { FadeIn } from "./FadeIn";

export function LandingStats() {
  return (
    <section className="py-16 md:py-24" style={{ backgroundColor: BRAND.bgLight }}>
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <FadeIn>
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-zinc-500">
            Tecnología IA al servicio de tu crecimiento
          </p>
        </FadeIn>
        <div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-4">
          {AGENCY_STATS.map((s, i) => (
            <FadeIn delay={i * 0.05} key={s.label}>
              <div className="text-center">
                <p className="text-3xl font-extrabold tabular-nums text-zinc-900 md:text-4xl">
                  {s.numeric != null ? (
                    <AnimatedCounter suffix={s.value.includes("+") ? "+" : ""} value={s.numeric} />
                  ) : (
                    s.value
                  )}
                </p>
                <p className="mt-1 text-sm text-zinc-600">{s.label}</p>
              </div>
            </FadeIn>
          ))}
        </div>
        <div className="mt-14">
          <GrowthCharts />
        </div>
      </div>
    </section>
  );
}
