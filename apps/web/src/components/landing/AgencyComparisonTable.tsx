"use client";

import Image from "next/image";

import { FadeIn } from "./FadeIn";
import { HOME_MARKET_COMPARE_ROWS } from "./comparisonData";
import { BRAND, faviconUrl } from "./shared";
import { SectionBadge } from "./ui";

function CompetitorLogos({ logos }: { logos: { name: string; domain: string }[] }) {
  if (logos.length === 0) return <span className="text-[#94A3B8]">—</span>;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {logos.map((l) => (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2 py-1" key={l.domain} title={l.name}>
          <Image alt="" className="rounded-full" height={24} src={faviconUrl(l.domain)} unoptimized width={24} />
          <span className="text-xs text-[#94A3B8]">{l.name}</span>
        </span>
      ))}
    </div>
  );
}

export function AgencyComparisonTable() {
  return (
    <section className="relative z-10 px-4 py-16 md:px-6 md:py-24" style={{ backgroundColor: "#050816" }}>
      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <div className="text-center">
            <SectionBadge>COMPARATIVA</SectionBadge>
            <h2 className="mt-4 text-2xl font-extrabold text-white md:text-4xl">
              ¿Por qué Nelvyon supera a cualquier agencia?
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-[#94A3B8]">
              Calidad de agencia global. Velocidad de startup. Precio de freelancer.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.08}>
          <div
            className="mt-10 overflow-hidden rounded-3xl border p-6 md:p-8"
            style={{
              background: "linear-gradient(145deg, #0d1b3e 0%, #050816 100%)",
              borderColor: "#1e3a8a",
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="sticky top-0 z-20">
                  <tr className="border-b border-white/10">
                    <th className="sticky left-0 z-30 bg-[#0d1b3e] px-4 py-4 text-xs font-bold uppercase tracking-wide text-[#00CFFF]">
                      SERVICIO
                    </th>
                    <th className="bg-[#0d1b3e] px-4 py-4 text-center text-xs font-bold uppercase text-white">
                      Herramientas / agencias
                    </th>
                    <th className="bg-[#0d1b3e] px-4 py-4 text-center text-xs font-bold uppercase text-white">
                      Precio mercado
                    </th>
                    <th
                      className="border-l-2 px-4 py-4 text-center text-xs font-bold uppercase"
                      style={{ borderColor: BRAND.blue, backgroundColor: "rgba(0,102,255,0.15)", color: BRAND.cyan }}
                    >
                      <Image alt="NELVYON" className="mx-auto mb-1" height={28} src="/logo.png.png" width={84} />
                      NELVYON
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {HOME_MARKET_COMPARE_ROWS.map((row) => (
                    <tr className="border-b border-white/5" key={row.service}>
                      <td className="sticky left-0 z-10 bg-[#0a1020] px-4 py-3 font-semibold text-white">
                        {row.service}
                      </td>
                      <td className="px-4 py-3">
                        <CompetitorLogos logos={row.logos} />
                      </td>
                      <td className="px-4 py-3 text-center text-[#94A3B8]">{row.marketPrice}</td>
                      <td
                        className="border-l-2 px-4 py-3 text-center text-xl"
                        style={{ borderColor: BRAND.blue, backgroundColor: "rgba(0,102,255,0.08)" }}
                      >
                        <span style={{ color: BRAND.blue }}>✅</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
