"use client";

import { FadeIn } from "./FadeIn";
import { SectionHeading } from "./ui";

const CASES = [
  {
    sector: "E-commerce",
    color: "#0066FF",
    desc: "Unificación de canales de captación y seguimiento comercial.",
  },
  {
    sector: "Clínica estética",
    color: "#00CFFF",
    desc: "Gestión centralizada de citas, email y presencia en redes.",
  },
  {
    sector: "Inmobiliaria",
    color: "#6366F1",
    desc: "CRM, anuncios y comunicación con clientes en un solo flujo.",
  },
] as const;

export function LandingSuccessCases() {
  return (
    <section className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <FadeIn>
          <SectionHeading center title="Casos de éxito" variant="light" />
        </FadeIn>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {CASES.map((c, i) => (
            <FadeIn delay={i * 0.08} key={c.sector}>
              <div className="flex min-h-[180px] flex-col rounded-xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
                <div
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg text-sm font-bold text-white"
                  style={{ backgroundColor: c.color }}
                >
                  {c.sector.slice(0, 2).toUpperCase()}
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#374151]">Sector</p>
                <h3 className="mt-1 text-xl font-bold text-[#111827]">{c.sector}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#374151]">{c.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
