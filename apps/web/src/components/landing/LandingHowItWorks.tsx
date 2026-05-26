import { BRAND } from "./shared";
import { FadeIn } from "./FadeIn";
import { SectionHeading } from "./ui";

const STEPS = [
  { n: "01", title: "Describe tu negocio", desc: "Sector, objetivos y tono en 2 minutos" },
  { n: "02", title: "Diseñamos tu estrategia", desc: "Canales, presupuesto y calendario de acciones" },
  { n: "03", title: "Ejecutamos y optimizamos", desc: "Campañas en marcha con reporting en vivo" },
] as const;

export function LandingHowItWorks() {
  return (
    <section className="py-20 md:py-28" style={{ backgroundColor: BRAND.bg }}>
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <FadeIn>
          <SectionHeading light title="Empieza en minutos" subtitle="De la primera llamada a campañas activas en días, no meses." />
        </FadeIn>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <FadeIn delay={i * 0.08} key={step.n}>
              <div
                className="rounded-2xl border p-8 transition hover:-translate-y-1 hover:border-[#0066FF]/40 hover:shadow-[0_12px_40px_rgba(0,102,255,0.12)]"
                style={{ backgroundColor: BRAND.card, borderColor: BRAND.cardBorder }}
              >
                <p className="text-5xl font-bold opacity-40" style={{ color: BRAND.blue }}>
                  {step.n}
                </p>
                <h3 className="mt-4 text-xl font-bold text-white">{step.title}</h3>
                <p className="mt-3 text-sm" style={{ color: BRAND.textMuted }}>
                  {step.desc}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
