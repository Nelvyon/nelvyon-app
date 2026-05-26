"use client";

import Link from "next/link";

import { FadeIn } from "./FadeIn";
import { HOME_FEATURED_SERVICES, SERVICE_GRADIENTS } from "./serviceCardStyles";
import { BRAND } from "./shared";

export function LandingColorfulServices() {
  return (
    <section className="bg-white py-16 md:py-24" id="servicios-destacados">
      <div className="mx-auto max-w-[1200px] px-4 md:px-6">
        <FadeIn>
          <h2 className="text-center text-3xl font-extrabold text-[#111827] md:text-4xl">
            Servicios de marketing digital
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-[#374151]">
            Estrategia, ejecución y reporting en un solo equipo
          </p>
        </FadeIn>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {HOME_FEATURED_SERVICES.map((s, i) => {
            const Icon = s.icon;
            const gradient =
              SERVICE_GRADIENTS[s.slug] ??
              "linear-gradient(135deg, #0066FF 0%, #0044CC 100%)";
            return (
              <FadeIn delay={i * 0.05} key={s.slug}>
                <Link
                  className="group flex min-h-[200px] flex-col rounded-[20px] p-8 transition duration-200 hover:scale-[1.02]"
                  href={`/servicios#${s.slug}`}
                  style={{
                    background: gradient,
                    boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
                  }}
                >
                  <Icon className="h-12 w-12 text-white" strokeWidth={1.5} />
                  <h3 className="mt-5 text-2xl font-bold text-white">{s.name}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-white/75">{s.desc}</p>
                  <p className="mt-4 text-lg font-bold text-white">Desde €{s.from}/mes</p>
                </Link>
              </FadeIn>
            );
          })}
        </div>
        <FadeIn>
          <div className="mt-10 text-center">
            <Link
              className="nelvyon-glow-btn inline-flex rounded-full px-8 py-3.5 text-sm font-semibold text-white transition hover:scale-[1.03]"
              href="/servicios"
              style={{ backgroundColor: BRAND.blue }}
            >
              Ver los 25 servicios →
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
