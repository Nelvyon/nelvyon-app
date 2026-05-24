"use client";

import Link from "next/link";
import { notFound } from "next/navigation";

import type { ServiceSlug } from "./brand";
import { FadeUp } from "./FadeUp";
import { NelvyonShell } from "./NelvyonShell";
import { SERVICE_DETAILS } from "./service-details";

export function NelvyonServicioDetailPage({ slug }: { slug: string }) {
  const detail = SERVICE_DETAILS[slug as ServiceSlug];
  if (!detail) notFound();

  return (
    <NelvyonShell>
      <section className="px-4 py-16 md:px-6 md:py-24">
        <FadeUp className="mx-auto max-w-4xl">
          <Link className="text-sm text-[#0066FF] hover:underline" href="/servicios">
            ← Servicios
          </Link>
          <h1 className="mt-6 text-4xl font-bold text-white md:text-6xl">{detail.title}</h1>
          <p className="mt-4 text-xl text-[#66a3ff]">{detail.subtitle}</p>
          <p className="mt-8 text-lg leading-relaxed text-zinc-400">{detail.intro}</p>
        </FadeUp>
      </section>

      <section className="border-y border-white/[0.06] px-4 py-16 md:px-6">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
          <FadeUp>
            <h2 className="text-2xl font-bold text-white">Qué incluye</h2>
            <ul className="mt-6 space-y-3">
              {detail.features.map((f) => (
                <li className="flex gap-3 text-zinc-300" key={f}>
                  <span className="text-[#0066FF]">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2 className="text-2xl font-bold text-white">Resultados</h2>
            <ul className="mt-6 space-y-3">
              {detail.results.map((r) => (
                <li className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-zinc-300" key={r}>
                  {r}
                </li>
              ))}
            </ul>
          </FadeUp>
        </div>
      </section>

      <section className="px-4 py-16 md:px-6 md:py-24">
        <FadeUp className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold text-white">Cómo funciona</h2>
          <p className="mt-4 text-center text-zinc-500">Tres pasos. Cero fricción.</p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {detail.steps.map((step, i) => (
              <div className="rounded-2xl border border-white/[0.08] p-6" key={step.title}>
                <span className="text-sm font-bold text-[#0066FF]">0{i + 1}</span>
                <h3 className="mt-2 text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm text-zinc-500">{step.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-16 text-center">
            <Link
              className="inline-flex rounded-full bg-[#0066FF] px-10 py-4 text-sm font-semibold text-white hover:bg-[#0052cc]"
              href="/register"
            >
              Activar {detail.title}
            </Link>
          </div>
        </FadeUp>
      </section>
    </NelvyonShell>
  );
}
