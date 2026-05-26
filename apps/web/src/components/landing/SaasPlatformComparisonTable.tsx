"use client";

import Image from "next/image";

import { FadeIn } from "./FadeIn";
import { ComparisonStatusCell } from "./ComparisonStatusCell";
import { SAAS_COMPETITOR_COLUMNS, SAAS_PLATFORM_COMPARE_ROWS } from "./comparisonData";
import { BRAND, faviconUrl } from "./shared";
import { SectionBadge } from "./ui";

export function SaasPlatformComparisonTable() {
  return (
    <section className="px-4 py-16 md:px-6 md:py-24" style={{ backgroundColor: BRAND.bg }}>
      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <div className="text-center">
            <SectionBadge>COMPARATIVA SAAS</SectionBadge>
            <h2 className="mt-4 text-2xl font-extrabold text-white md:text-4xl">
              NELVYON vs plataformas del mercado
            </h2>
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
              <table className="w-full min-w-[800px] border-collapse text-left text-sm">
                <thead className="sticky top-0 z-20">
                  <tr className="border-b border-white/10">
                    <th className="sticky left-0 z-30 bg-[#0d1b3e] px-4 py-4 text-xs font-bold uppercase text-[#00CFFF]">
                      FUNCIONALIDAD
                    </th>
                    {SAAS_COMPETITOR_COLUMNS.map((col) => (
                      <th
                        className={`px-3 py-4 text-center ${col.highlight ? "border-l-2" : ""}`}
                        key={col.key}
                        style={
                          col.highlight
                            ? { borderColor: BRAND.blue, backgroundColor: "rgba(0,102,255,0.15)" }
                            : { backgroundColor: "#0d1b3e" }
                        }
                      >
                        <Image
                          alt={col.label}
                          className="mx-auto rounded-full bg-white"
                          height={32}
                          src={faviconUrl(col.domain)}
                          unoptimized
                          width={32}
                        />
                        <span
                          className={`mt-2 block text-[10px] font-bold uppercase ${col.highlight ? "text-[#00CFFF]" : "text-white"}`}
                        >
                          {col.label}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SAAS_PLATFORM_COMPARE_ROWS.map((row) => (
                    <tr className="border-b border-white/5" key={row.feature}>
                      <td className="sticky left-0 z-10 bg-[#0a1020] px-4 py-3 font-semibold text-white">
                        {row.feature}
                      </td>
                      {SAAS_COMPETITOR_COLUMNS.map((col) => (
                        <td
                          className={`px-3 py-3 text-center ${col.highlight ? "border-l-2" : ""}`}
                          key={col.key}
                          style={
                            col.highlight
                              ? { borderColor: BRAND.blue, backgroundColor: "rgba(0,102,255,0.08)" }
                              : undefined
                          }
                        >
                          <ComparisonStatusCell value={row[col.key]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-6 text-center text-xs text-[#94A3B8]">
              ✅ Incluido · ⚠️ Limitado · ❌ No incluido
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
