import { COLORS, STEPS } from "./constants";
import { FadeIn } from "./FadeIn";
import { SectionHeading } from "./ui";

export function LandingHowItWorks() {
  return (
    <section className="border-y border-white/5 py-20 md:py-28" style={{ backgroundColor: COLORS.bgAlt }}>
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <FadeIn>
          <SectionHeading light title="Empieza en minutos" />
        </FadeIn>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <FadeIn delay={i * 0.08} key={step.n}>
              <div
                className="rounded-2xl border p-8"
                style={{
                  backgroundColor: COLORS.card,
                  borderColor: COLORS.cardBorder,
                }}
              >
                <p
                  className="text-5xl font-bold opacity-30"
                  style={{ color: COLORS.primary }}
                >
                  {step.n}
                </p>
                <h3 className="mt-4 text-xl font-bold text-white">{step.title}</h3>
                <p className="mt-3 text-zinc-400">{step.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
