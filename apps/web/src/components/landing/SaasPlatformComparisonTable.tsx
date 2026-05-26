"use client";

import { FadeIn } from "./FadeIn";
import { ComparisonStatusCell } from "./ComparisonStatusCell";
import { SAAS_PLATFORM_COMPARE_ROWS } from "./comparisonData";

const COLUMNS = [
  { key: "feature" as const, label: "FUNCIONALIDAD", sticky: true },
  { key: "hubspot" as const, label: "HubSpot" },
  { key: "ghl" as const, label: "GoHighLevel" },
  { key: "activecampaign" as const, label: "ActiveCampaign" },
  { key: "hootsuite" as const, label: "Hootsuite" },
  { key: "nelvyon" as const, label: "NELVYON", highlight: true },
];

export function SaasPlatformComparisonTable() {
  return (
    <section className="bg-[#0a0a0a] px-4 py-16 md:px-6 md:py-24">
      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <h2 className="text-center text-2xl font-extrabold text-white md:text-3xl">
            NELVYON vs plataformas SaaS del mercado
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-white/70">
            Compara funcionalidades reales — no solo el precio de entrada.
          </p>
        </FadeIn>

        <FadeIn delay={0.08}>
          <div className="mt-10 overflow-x-auto rounded-2xl border border-white/10 bg-black">
            <table className="w-full min-w-[800px] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-20">
                <tr className="border-b border-white/10 bg-black">
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
                {SAAS_PLATFORM_COMPARE_ROWS.map((row) => (
                  <tr className="border-b border-white/5 hover:bg-white/[0.02]" key={row.feature}>
                    <td className="sticky left-0 z-10 border-r border-white/10 bg-black px-4 py-3 font-semibold text-white">
                      {row.feature}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ComparisonStatusCell value={row.hubspot} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ComparisonStatusCell value={row.ghl} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ComparisonStatusCell value={row.activecampaign} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ComparisonStatusCell value={row.hootsuite} />
                    </td>
                    <td className="border-l-2 border-[#0066FF] bg-[#0066FF]/10 px-4 py-3 text-center font-semibold">
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
