"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ALL_SERVICES } from "./agencyContent";
import { WhiteTiltCard } from "./effects/WhiteTiltCard";
import { FadeIn } from "./FadeIn";
import { BRAND } from "./shared";
import { SectionHeading } from "./ui";

export function ServicesGrid({
  showHeading = true,
  limit,
}: {
  showHeading?: boolean;
  limit?: number;
}) {
  const services = limit ? ALL_SERVICES.slice(0, limit) : ALL_SERVICES;

  return (
    <section className="bg-white pb-20 pt-4 md:pb-28">
      <div className="mx-auto max-w-[1200px] px-4 md:px-6">
        {showHeading ? (
          <FadeIn>
            <SectionHeading
              center
              subtitle="Estrategia, ejecución y reporting en un solo equipo"
              title="Todos los servicios"
              variant="light"
            />
          </FadeIn>
        ) : null}
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => {
            const Icon = s.icon;
            return (
              <FadeIn delay={(i % 9) * 0.03} key={s.slug}>
                <WhiteTiltCard className="h-full">
                  <div className="group flex h-full flex-col rounded-xl border border-[#E5E7EB] bg-white p-7 shadow-sm">
                    <Icon className="h-9 w-9" style={{ color: BRAND.blue }} />
                    <h3 className="mt-4 text-base font-semibold text-zinc-900">{s.name}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-[#6B7280]">{s.desc}</p>
                    <p className="mt-4 text-sm font-semibold" style={{ color: BRAND.blue }}>
                      Desde €{s.from}/mes
                    </p>
                    <Link
                      className="mt-3 inline-flex items-center gap-1 text-sm font-medium opacity-0 transition group-hover:opacity-100"
                      href={`/servicios#${s.slug}`}
                      style={{ color: BRAND.blue }}
                    >
                      Más info <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </WhiteTiltCard>
              </FadeIn>
            );
          })}
        </div>
        {limit && limit < ALL_SERVICES.length ? (
          <FadeIn>
            <div className="mt-10 text-center">
              <Link
                className="nelvyon-glow-btn inline-flex rounded-full px-6 py-3 text-sm font-semibold text-white transition hover:scale-[1.03]"
                href="/servicios"
                style={{ backgroundColor: BRAND.blue }}
              >
                Ver los 25 servicios →
              </Link>
            </div>
          </FadeIn>
        ) : null}
      </div>
    </section>
  );
}
