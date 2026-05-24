"use client";

import Link from "next/link";
import { useState } from "react";

import { COMPARE_ROWS, PLANS } from "./brand";
import { FadeUp } from "./FadeUp";
import { NelvyonShell } from "./NelvyonShell";

function priceLabel(value: number | null) {
  return value == null ? "—" : `${value}€`;
}

export function NelvyonPreciosPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <NelvyonShell>
      <section className="px-4 pb-8 pt-16 text-center md:px-6 md:pt-24">
        <FadeUp>
          <h1 className="text-4xl font-bold text-white md:text-6xl">Planes NELVYON</h1>
          <p className="mx-auto mt-6 max-w-xl text-zinc-400">
            Estilo GoHighLevel, alma NELVYON. Elige el plan que escala con tu imperio.
          </p>
          <div className="mt-10 inline-flex rounded-full border border-white/10 bg-white/5 p-1">
            <button
              className={`rounded-full px-6 py-2 text-sm font-medium transition ${!annual ? "bg-[#0066FF] text-white" : "text-zinc-400"}`}
              onClick={() => setAnnual(false)}
              type="button"
            >
              Mensual
            </button>
            <button
              className={`rounded-full px-6 py-2 text-sm font-medium transition ${annual ? "bg-[#0066FF] text-white" : "text-zinc-400"}`}
              onClick={() => setAnnual(true)}
              type="button"
            >
              Anual
            </button>
          </div>
        </FadeUp>
      </section>

      <section className="px-4 pb-20 md:px-6">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <FadeUp delay={i * 0.08} key={plan.id}>
              <div
                className={`flex h-full flex-col rounded-3xl border p-8 ${
                  plan.featured
                    ? "border-[#0066FF]/50 bg-gradient-to-b from-[#0066FF]/15 to-transparent shadow-[0_0_60px_rgba(0,102,255,0.12)]"
                    : "border-white/[0.08] bg-white/[0.02]"
                }`}
              >
                {plan.featured ? (
                  <span className="mb-4 w-fit rounded-full bg-[#0066FF] px-3 py-1 text-xs font-semibold text-white">
                    Recomendado
                  </span>
                ) : null}
                <h2 className="text-2xl font-bold text-white">{plan.name}</h2>
                <p className="mt-2 text-sm text-zinc-500">{plan.description}</p>
                <p className="mt-8 text-5xl font-bold text-white">
                  {priceLabel(annual ? plan.annual : plan.monthly)}
                  <span className="text-lg font-normal text-zinc-500">/{annual ? "año" : "mes"}</span>
                </p>
                <ul className="mt-8 flex-1 space-y-3">
                  {plan.highlights.map((h) => (
                    <li className="flex gap-2 text-sm text-zinc-300" key={h}>
                      <span className="text-[#0066FF]">✓</span>
                      {h}
                    </li>
                  ))}
                </ul>
                <Link
                  className={`mt-8 block rounded-full py-3.5 text-center text-sm font-semibold ${
                    plan.featured ? "bg-[#0066FF] text-white hover:bg-[#0052cc]" : "border border-white/15 text-white hover:bg-white/5"
                  }`}
                  href="/register"
                >
                  Solicitar acceso
                </Link>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      <section className="border-t border-white/[0.06] px-4 py-20 md:px-6">
        <FadeUp className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-white md:text-3xl">Comparativa detallada</h2>
          <div className="mt-10 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-white/[0.03] text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Funcionalidad</th>
                  <th className="px-4 py-3 text-center">Plan 1</th>
                  <th className="px-4 py-3 text-center">Plan 2</th>
                  <th className="px-4 py-3 text-center">Plan 3</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr className="border-t border-white/[0.06]" key={row.label}>
                    <td className="px-4 py-3 text-zinc-300">{row.label}</td>
                    {[row.p1, row.p2, row.p3].map((v, idx) => (
                      <td className="px-4 py-3 text-center text-zinc-400" key={idx}>
                        {v ? "✓" : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FadeUp>
      </section>
    </NelvyonShell>
  );
}
