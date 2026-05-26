"use client";

import Image from "next/image";

import { FadeIn } from "./FadeIn";
import { ComparisonStatusCell } from "./ComparisonStatusCell";
import type { StatusCell } from "./comparisonData";
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

const thStyle = {
  fontSize: 12,
  letterSpacing: "1px",
  textTransform: "uppercase" as const,
};

export function AgencyComparisonTable() {
  return (
    <section className="relative z-10 px-4 py-16 md:px-6 md:py-24" style={{ backgroundColor: "#071020" }}>
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
          <div className="mt-10 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead className="sticky top-0 z-20">
                <tr className="border-b border-white/10">
                  {COLUMNS.map((col) => (
                    <th
                      className={`px-4 py-4 font-bold text-white ${
                        col.sticky ? "sticky left-0 z-30 text-left" : "text-center"
                      } ${col.highlight ? "border-l-2 border-[#0066ff]" : ""}`}
                      key={col.key}
                      style={{
                        ...thStyle,
                        ...(col.highlight
                          ? { backgroundColor: "#0066ff" }
                          : col.sticky
                            ? { backgroundColor: "#0a1628" }
                            : { backgroundColor: "#0a1628" }),
                      }}
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
                    <td
                      className="sticky left-0 z-10 px-4 py-3 font-semibold text-white"
                      style={{ backgroundColor: "#071020", fontSize: 13, letterSpacing: "1px" }}
                    >
                      {row.service}
                    </td>
                    <td className="px-4 py-3 text-center" style={{ fontSize: 13 }}>
                      <ComparisonStatusCell value={row.large} />
                    </td>
                    <td className="px-4 py-3 text-center" style={{ fontSize: 13 }}>
                      <ComparisonStatusCell value={row.medium} />
                    </td>
                    <td className="px-4 py-3 text-center" style={{ fontSize: 13 }}>
                      <ComparisonStatusCell value={row.freelance} />
                    </td>
                    <td
                      className="border-l-2 border-[#0066ff] px-4 py-3 text-center"
                      style={{ backgroundColor: "rgba(0,102,255,0.1)", fontSize: 13 }}
                    >
                      <ComparisonStatusCell value="yes" />
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-white/15">
                  <td
                    className="sticky left-0 z-10 px-4 py-5 font-bold text-white"
                    style={{
                      backgroundColor: "#071020",
                      fontSize: 12,
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                    }}
                  >
                    PRECIO TOTAL ESTIMADO
                  </td>
                  <td className="px-4 py-5 text-center font-semibold text-[#EF4444]" style={{ fontSize: 13 }}>
                    €2.000-15.000/mes
                  </td>
                  <td className="px-4 py-5 text-center font-semibold text-[#EF4444]" style={{ fontSize: 13 }}>
                    €2.000-15.000/mes
                  </td>
                  <td className="px-4 py-5 text-center font-semibold text-[#EF4444]" style={{ fontSize: 13 }}>
                    €2.000-15.000/mes
                  </td>
                  <td
                    className="border-l-2 border-[#0066ff] px-4 py-5 text-center"
                    style={{ backgroundColor: "rgba(0,102,255,0.1)" }}
                  >
                    <span
                      className="block font-black text-white"
                      style={{ fontSize: 48, fontWeight: 900, lineHeight: 1 }}
                    >
                      €97/mes
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="px-4 py-6 text-center text-xs text-[#94A3B8]">
              ✅ Incluido · ⚠️ Limitado · ❌ No incluido
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
