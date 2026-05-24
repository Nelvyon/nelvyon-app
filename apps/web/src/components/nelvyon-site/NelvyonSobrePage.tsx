"use client";

import Link from "next/link";

import { NELVYON } from "./brand";
import { FadeUp } from "./FadeUp";
import { NelvyonShell } from "./NelvyonShell";

export function NelvyonSobrePage() {
  return (
    <NelvyonShell>
      <section className="px-4 py-16 md:px-6 md:py-24">
        <FadeUp className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold text-white md:text-6xl">Sobre NELVYON</h1>
          <p className="mt-8 text-xl leading-relaxed text-zinc-400">{NELVYON.slogan}</p>
        </FadeUp>
      </section>

      <section className="border-y border-white/[0.06] px-4 py-16 md:px-6">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2">
          <FadeUp>
            <h2 className="text-2xl font-bold text-white">Historia</h2>
            <p className="mt-4 text-zinc-400 leading-relaxed">
              NELVYON nació de una convicción: las marcas ambiciosas no deberían elegir entre velocidad, calidad y coste.
              Construimos un sistema donde agentes de IA especializados ejecutan marketing de nivel mundial mientras los equipos
              humanos definen estrategia, creatividad y visión.
            </p>
          </FadeUp>
          <FadeUp delay={0.08}>
            <h2 className="text-2xl font-bold text-white">Misión</h2>
            <p className="mt-4 text-zinc-400 leading-relaxed">
              Democratizar la excelencia en marketing autónomo: que cualquier empresa compita con las marcas más grandes del
              planeta, con tecnología, datos y ejecución continua.
            </p>
            <h2 className="mt-10 text-2xl font-bold text-white">Visión</h2>
            <p className="mt-4 text-zinc-400 leading-relaxed">
              Un ecosistema donde cada marca tenga su imperio digital — nacido, crecido e impuesto con precisión.
            </p>
          </FadeUp>
        </div>
      </section>

      <section className="px-4 py-16 md:px-6 md:py-24">
        <FadeUp className="mx-auto max-w-4xl rounded-3xl border border-[#0066FF]/30 bg-[#0066FF]/5 p-10 md:p-14">
          <h2 className="text-2xl font-bold text-white md:text-3xl">El sistema autónomo explicado</h2>
          <p className="mt-6 text-zinc-300 leading-relaxed">
            NELVYON no es un chatbot ni una herramienta suelta. Es una plataforma SaaS con CRM, automatizaciones, agentes
            sectoriales y módulos de ejecución (SEO, ads, contenido, email, branding, social). Cada agente opera con contexto
            de tu workspace, aprende de tus métricas y colabora con el resto del sistema — como un equipo elite, sin
            latencia humana.
          </p>
          <Link className="mt-8 inline-flex text-[#0066FF] font-medium hover:underline" href="/servicios">
            Ver todos los servicios →
          </Link>
        </FadeUp>
      </section>
    </NelvyonShell>
  );
}
