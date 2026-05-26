import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AGENCY_SERVICES } from "./agencyContent";
import { BRAND } from "./shared";
import { FadeIn } from "./FadeIn";
import { SectionHeading } from "./ui";

export function LandingAgencyServices() {
  return (
    <section className="py-20 md:py-28" id="servicios" style={{ backgroundColor: BRAND.bg }}>
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <FadeIn>
          <SectionHeading
            light
            subtitle="Estrategia, ejecución y reporting en un solo equipo"
            title="Servicios de marketing digital"
          />
        </FadeIn>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {AGENCY_SERVICES.map((s, i) => (
            <FadeIn delay={(i % 6) * 0.04} key={s.name}>
              <Link
                className="group flex h-full flex-col rounded-2xl border p-6 transition hover:-translate-y-1 hover:border-[#0066FF]/50 hover:shadow-[0_12px_40px_rgba(0,102,255,0.15)]"
                href="/servicios"
                style={{ backgroundColor: BRAND.card, borderColor: BRAND.cardBorder }}
              >
                <h3 className="text-lg font-semibold text-white">{s.name}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed" style={{ color: BRAND.textMuted }}>
                  {s.desc}
                </p>
                <p className="mt-4 text-sm font-medium" style={{ color: BRAND.cyan }}>
                  Desde €{s.from}/mes
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-white opacity-0 transition group-hover:opacity-100">
                  Más info <ArrowRight className="h-4 w-4" style={{ color: BRAND.blue }} />
                </span>
              </Link>
            </FadeIn>
          ))}
        </div>
        <FadeIn>
          <div className="mt-10 text-center">
            <Link
              className="inline-flex rounded-full px-6 py-3 text-sm font-semibold text-white"
              href="/servicios"
              style={{ backgroundColor: BRAND.blue }}
            >
              Ver todos los servicios →
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
