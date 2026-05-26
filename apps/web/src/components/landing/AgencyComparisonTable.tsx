"use client";

import { FadeIn } from "./FadeIn";
import { ComparisonStatusCell } from "./ComparisonStatusCell";
import { HOME_AGENCY_COMPARE_ROWS } from "./comparisonData";

const COLUMNS = [
  { key: "service" as const, label: "SERVICIO", sticky: true },
  { key: "large" as const, label: "Agencia grande (McCann, Ogilvy…)" },
  { key: "medium" as const, label: "Agencia mediana (agencias esp. top)" },
  { key: "small" as const, label: "Agencia pequeña / freelance" },
  { key: "nelvyon" as const, label: "NELVYON", highlight: true },
];

export function AgencyComparisonTable() {
  return (
    <section className="bg-black px-4 py-16 md:px-6 md:py-24">
      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <h2 className="text-center text-2xl font-extrabold text-white md:text-3xl">
            ¿Por qué elegir Nelvyon?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-white/70 md:text-base">
            No te vendemos más de lo mismo. Te damos todo lo que necesitan las mejores marcas del mundo, desde
            un solo lugar.
          </p>
        </FadeIn>

        <FadeIn delay={0.08}>
          <div className="mt-10 overflow-x-auto rounded-2xl border border-white/10 bg-[#0a0a0a]">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-20">
                <tr className="border-b border-white/10 bg-[#0a0a0a]">
                  {COLUMNS.map((col) => (
                    <th
                      className={`px-4 py-4 text-xs font-bold uppercase tracking-wide ${
                        col.highlight
                          ? "border-l-2 border-[#0066FF] bg-[#0066FF]/15 text-[#00CFFF]"
                          : col.sticky
                            ? "sticky left-0 z-30 bg-[#0066FF] text-white"
                            : "bg-[#0066FF] text-white"
                      }`}
                      key={col.key}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOME_AGENCY_COMPARE_ROWS.map((row) => (
                  <tr className="border-b border-white/5 hover:bg-white/[0.02]" key={row.service}>
                    <td className="sticky left-0 z-10 border-r border-white/10 bg-[#0a0a0a] px-4 py-3 font-semibold text-white">
                      {row.service}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ComparisonStatusCell value={row.large} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ComparisonStatusCell value={row.medium} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ComparisonStatusCell value={row.small} />
                    </td>
                    <td className="border-l-2 border-[#0066FF] bg-[#0066FF]/10 px-4 py-3 text-center">
                      <ComparisonStatusCell value={row.nelvyon} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-center text-xs text-white/60 md:text-sm">
            ✅ Incluido y top calidad · ⚠️ Limitado o subcontratado · ❌ No incluido
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
