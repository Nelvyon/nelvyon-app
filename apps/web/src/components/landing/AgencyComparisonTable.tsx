"use client";

import Image from "next/image";

import { FadeIn } from "./FadeIn";
import { ComparisonStatusCell } from "./ComparisonStatusCell";
import type { StatusCell } from "./comparisonData";
import { BRAND } from "./shared";
import { SectionBadge } from "./ui";

type AgencyRow = {
  service: string;
  large: StatusCell;
  medium: StatusCell;
  freelance: StatusCell;
};

const AGENCY_ROWS: AgencyRow[] = [
  { service: "SEO", large: "yes", medium: "yes", freelance: "warn" },
  { service: "SEM / Google Ads", large: "yes", medium: "yes", freelance: "warn" },
  { service: "Meta Ads", large: "yes", medium: "yes", freelance: "warn" },
  { service: "Email Marketing", large: "yes", medium: "yes", freelance: "yes" },
  { service: "Content Marketing", large: "yes", medium: "yes", freelance: "warn" },
  { service: "Social Media", large: "yes", medium: "yes", freelance: "yes" },
  { service: "Web & Landing", large: "yes", medium: "warn", freelance: "warn" },
  { service: "Video Marketing", large: "yes", medium: "warn", freelance: "no" },
  { service: "CRO", large: "yes", medium: "warn", freelance: "no" },
  { service: "Automatización IA", large: "warn", medium: "warn", freelance: "no" },
  { service: "Reputación / PR", large: "yes", medium: "warn", freelance: "no" },
  { service: "WhatsApp Marketing", large: "warn", medium: "warn", freelance: "no" },
  { service: "TikTok Ads", large: "yes", medium: "warn", freelance: "no" },
  { service: "Análisis & Reporting", large: "yes", medium: "yes", freelance: "warn" },
];

const COLUMNS = [
  { key: "service" as const, label: "SERVICIO", sticky: true },
  { key: "large" as const, label: "Agencia grande" },
  { key: "medium" as const, label: "Agencia mediana" },
  { key: "freelance" as const, label: "Freelance" },
  { key: "nelvyon" as const, label: "NELVYON", highlight: true },
];

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
                    {COLUMNS.map((col) => (
                      <th
                        className={`px-4 py-4 text-center text-xs font-bold uppercase ${
                          col.sticky
                            ? "sticky left-0 z-30 bg-[#0d1b3e] text-left text-[#00CFFF]"
                            : col.highlight
                              ? "border-l-2 text-[#00CFFF]"
                              : "bg-[#0d1b3e] text-white"
                        }`}
                        key={col.key}
                        style={
                          col.highlight
                            ? { borderColor: BRAND.blue, backgroundColor: "rgba(0,102,255,0.15)" }
                            : col.sticky
                              ? undefined
                              : { backgroundColor: "#0d1b3e" }
                        }
                      >
                        {col.highlight ? (
                          <>
                            <Image alt="NELVYON" className="mx-auto mb-1" height={28} src="/logo.png.png" width={84} />
                            {col.label}
                          </>
                        ) : (
                          col.label
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {AGENCY_ROWS.map((row) => (
                    <tr className="border-b border-white/5" key={row.service}>
                      <td className="sticky left-0 z-10 bg-[#0a1020] px-4 py-3 font-semibold text-white">
                        {row.service}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ComparisonStatusCell value={row.large} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ComparisonStatusCell value={row.medium} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ComparisonStatusCell value={row.freelance} />
                      </td>
                      <td
                        className="border-l-2 px-4 py-3 text-center"
                        style={{ borderColor: BRAND.blue, backgroundColor: "rgba(0,102,255,0.08)" }}
                      >
                        <ComparisonStatusCell value="yes" />
                      </td>
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
