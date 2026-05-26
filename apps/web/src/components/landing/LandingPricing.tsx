import Link from "next/link";

import { COLORS, LINKS, PLANS } from "./constants";
import { FadeIn } from "./FadeIn";
import { SectionHeading } from "./ui";

export function LandingPricing() {
  return (
    <section className="py-20 md:py-28" id="precios" style={{ backgroundColor: COLORS.bgAlt }}>
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <FadeIn>
          <SectionHeading light subtitle="Elige el plan que encaje con tu etapa de crecimiento" title="Precios transparentes. Sin sorpresas." />
        </FadeIn>
        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <FadeIn delay={i * 0.08} key={plan.name}>
              <div
                className={`relative flex h-full flex-col rounded-2xl border p-8 ${
                  plan.highlight ? "ring-2 ring-[#0066FF]" : ""
                }`}
                style={{
                  backgroundColor: COLORS.card,
                  borderColor: plan.highlight ? COLORS.primary : COLORS.cardBorder,
                }}
              >
                {plan.highlight ? (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-semibold text-white"
                    style={{ backgroundColor: COLORS.primary }}
                  >
                    Más popular
                  </span>
                ) : null}
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <p className="mt-4">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-zinc-400">{plan.period}</span>
                </p>
                <p className="mt-2 text-sm text-zinc-500">{plan.users}</p>
                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li className="flex gap-2 text-sm text-zinc-300" key={f}>
                      <span style={{ color: COLORS.primary }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  className="mt-8 block rounded-full py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
                  href={LINKS.register}
                  style={{
                    backgroundColor: plan.highlight ? COLORS.primary : "transparent",
                    border: plan.highlight ? "none" : `1px solid ${COLORS.cardBorder}`,
                  }}
                >
                  {plan.cta}
                </Link>
              </div>
            </FadeIn>
          ))}
        </div>
        <FadeIn>
          <p className="mt-10 text-center text-sm text-zinc-500">
            <span style={{ color: COLORS.primary }}>✓</span> 14 días de prueba gratuita · Sin tarjeta de
            crédito · Cancela cuando quieras
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
