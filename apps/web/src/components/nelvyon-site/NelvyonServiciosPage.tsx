"use client";

import Link from "next/link";

import { SERVICES } from "./brand";
import { FadeUp } from "./FadeUp";
import { NelvyonShell } from "./NelvyonShell";

export function NelvyonServiciosPage() {
  return (
    <NelvyonShell>
      <section className="px-4 py-16 md:px-6 md:py-24">
        <FadeUp className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold text-white md:text-6xl">Servicios IA</h1>
          <p className="mt-6 text-lg text-zinc-400">
            Seis disciplinas de marketing ejecutadas por agentes autónomos. Cada una con página dedicada y resultados medibles.
          </p>
        </FadeUp>
        <div className="mx-auto mt-16 grid max-w-6xl gap-8 md:grid-cols-2">
          {SERVICES.map((s, i) => (
            <FadeUp delay={i * 0.05} key={s.slug}>
              <Link
                className="group flex gap-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 transition hover:border-[#0066FF]/40"
                href={s.href}
              >
                <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${s.gradient} text-2xl text-white`}>
                  {s.icon}
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-white group-hover:text-[#66a3ff]">{s.title}</h2>
                  <p className="mt-2 text-zinc-500">{s.short}</p>
                  <span className="mt-4 inline-block text-sm font-medium text-[#0066FF]">Página completa →</span>
                </div>
              </Link>
            </FadeUp>
          ))}
        </div>
      </section>
    </NelvyonShell>
  );
}
