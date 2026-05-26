import Image from "next/image";

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
    <section className="bg-[#F9FAFB] py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <FadeIn>
            <SectionHeading
              center={false}
              subtitle="De la primera llamada a campañas activas en días, no meses."
              title="Empieza en minutos"
              variant="light"
            />
            <div className="mt-10 space-y-6">
              {STEPS.map((step) => (
                <div className="flex gap-4" key={step.n}>
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white"
                    style={{ backgroundColor: BRAND.blue }}
                  >
                    {step.n}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-[#111827]">{step.title}</h3>
                    <p className="mt-1 text-sm text-[#374151]">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[#E5E7EB] shadow-lg">
              <Image
                alt="Dashboard de marketing en pantalla"
                className="object-cover"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=900&fit=crop"
              />
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
