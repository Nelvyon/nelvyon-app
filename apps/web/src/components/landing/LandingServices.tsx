import { Sparkles } from "lucide-react";

import { COLORS, SERVICES } from "./constants";
import { FadeIn } from "./FadeIn";
import { SectionHeading } from "./ui";

export function LandingServices() {
  return (
    <section className="py-20 md:py-28" id="servicios" style={{ backgroundColor: COLORS.bg }}>
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <FadeIn>
          <SectionHeading
            light
            subtitle="Desde SEO hasta firma digital — sin contratar diez proveedores"
            title="25 herramientas. Una sola plataforma."
          />
        </FadeIn>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {SERVICES.map((s, i) => (
            <FadeIn delay={(i % 8) * 0.03} key={s.name}>
              <div
                className="h-full rounded-xl border p-5 transition hover:border-[#0066FF]/40"
                style={{
                  backgroundColor: COLORS.card,
                  borderColor: COLORS.cardBorder,
                }}
              >
                <Sparkles className="h-5 w-5" style={{ color: COLORS.primary }} />
                <h3 className="mt-3 font-semibold text-white">{s.name}</h3>
                <p className="mt-2 text-sm text-zinc-400">{s.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
