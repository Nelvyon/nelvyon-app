"use client";

import Link from "next/link";

import { FadeIn } from "./FadeIn";
import { WhiteTiltCard } from "./effects/WhiteTiltCard";
import { BRAND } from "./shared";
import { SectionHeading } from "./ui";

const CASES = [
  {
    sector: "E-commerce",
    color: "#0066FF",
    challenge: "Gestión manual de campañas en varios canales sin visión unificada.",
    result: "Automatizaron su marketing y redujeron el tiempo de gestión manual.",
  },
  {
    sector: "Clínica estética",
    color: "#00CFFF",
    challenge: "Captación dispersa entre redes, email y formularios web.",
    result: "Centralizaron captación, email y redes en una sola plataforma.",
  },
  {
    sector: "Inmobiliaria",
    color: "#635BFF",
    challenge: "Herramientas separadas para CRM, anuncios y seguimiento de leads.",
    result: "Pasaron de gestionar 3 herramientas distintas a una sola.",
  },
] as const;

export function LandingSuccessCases() {
  return (
    <section className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <FadeIn>
          <SectionHeading
            center
            subtitle="Historias por sector — sin datos inventados"
            title="Casos de éxito"
            variant="light"
          />
        </FadeIn>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {CASES.map((c, i) => (
            <FadeIn delay={i * 0.08} key={c.sector}>
              <WhiteTiltCard className="h-full">
                <div className="flex h-full flex-col rounded-xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
                  <div
                    className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl text-lg font-bold text-white"
                    style={{ backgroundColor: c.color }}
                  >
                    {c.sector.charAt(0)}
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Sector</p>
                  <h3 className="mt-1 text-xl font-bold text-zinc-900">{c.sector}</h3>
                  <p className="mt-4 text-sm text-[#6B7280]">
                    <span className="font-medium text-zinc-800">Reto: </span>
                    {c.challenge}
                  </p>
                  <p className="mt-3 flex-1 text-sm text-[#6B7280]">
                    <span className="font-medium text-zinc-800">Enfoque: </span>
                    {c.result}
                  </p>
                </div>
              </WhiteTiltCard>
            </FadeIn>
          ))}
        </div>
        <FadeIn>
          <div className="mt-10 text-center">
            <Link
              className="inline-flex items-center gap-2 text-sm font-semibold transition hover:opacity-80"
              href="/contacto"
              style={{ color: BRAND.blue }}
            >
              Ver todos los casos →
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
