"use client";

import { FadeIn } from "./FadeIn";
import { BRAND } from "./shared";
import { SectionBadge } from "./ui";

const TESTIMONIALS = [
  {
    text: "Nelvyon multiplicó nuestro tráfico orgánico x3 en 4 meses. Nunca habíamos visto resultados tan rápidos.",
    name: "Carlos Ruiz",
    company: "Distribuciones Ruiz S.L.",
    initials: "CR",
  },
  {
    text: "Dejamos de contratar 4 agencias distintas. Con Nelvyon tenemos todo en uno y mejor.",
    name: "Marta González",
    company: "Clínica Dental Sonríe",
    initials: "MG",
  },
  {
    text: "Las campañas de Meta que gestiona Nelvyon tienen un ROAS de 6x. Increíble.",
    name: "Alejandro Torres",
    company: "Tienda SportPro",
    initials: "AT",
  },
  {
    text: "La automatización de email nos ahorra 20 horas semanales. Totalmente recomendable.",
    name: "Lucía Fernández",
    company: "Academia Digital LF",
    initials: "LF",
  },
] as const;

export function LandingTestimonials() {
  return (
    <section className="relative z-10 py-16 md:py-24" style={{ backgroundColor: "#0a0f1e" }}>
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <FadeIn>
          <div className="text-center">
            <SectionBadge>TESTIMONIOS</SectionBadge>
            <h2 className="mt-4 text-3xl font-extrabold text-white md:text-4xl">Lo que dicen nuestros clientes</h2>
          </div>
        </FadeIn>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TESTIMONIALS.map((t, i) => (
            <FadeIn delay={i * 0.06} key={t.name}>
              <article
                className="flex h-full flex-col rounded-2xl border p-6 transition duration-200 hover:scale-[1.02] hover:border-[#0066FF]"
                style={{ backgroundColor: BRAND.bgSection, borderColor: BRAND.cardBorder }}
              >
                <span className="text-4xl font-serif leading-none text-[#0066FF]">&ldquo;</span>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[#94A3B8]">{t.text}</p>
                <div className="mt-6 flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: BRAND.blue }}
                  >
                    {t.initials}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-[#94A3B8]">{t.company}</p>
                  </div>
                </div>
              </article>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
