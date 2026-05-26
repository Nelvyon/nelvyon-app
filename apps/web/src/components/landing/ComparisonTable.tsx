"use client";

import { Check } from "lucide-react";

import { FadeIn } from "./FadeIn";
import type { CompareRow } from "./comparisonData";

type Props = {
  title: string;
  subtitle?: string;
  rows: CompareRow[];
  totalRow?: { replaces: string; cost: string; nelvyon: string };
  footerNote?: string;
  className?: string;
  headers?: { service: string; replaces: string; cost: string; nelvyon: string };
};

export function ComparisonTable({
  title,
  subtitle,
  rows,
  totalRow = {
    replaces: "—",
    cost: "€7.600+/mes",
    nelvyon: "Nelvyon desde €97/mes",
  },
  footerNote = "Todo incluido en tu plan. Sin sorpresas.",
  className = "",
  headers = {
    service: "Servicio",
    replaces: "Herramientas que reemplaza",
    cost: "Coste por separado",
    nelvyon: "NELVYON",
  },
}: Props) {
  return (
    <section className={`px-4 py-16 md:px-6 md:py-24 ${className}`}>
      <div className="mx-auto max-w-5xl">
        <FadeIn>
          <div
            className="overflow-hidden rounded-3xl p-6 shadow-2xl md:p-10"
            style={{
              background: "linear-gradient(145deg, #0A1628 0%, #0D2444 100%)",
              boxShadow: "0 32px 80px rgba(0, 30, 80, 0.45)",
            }}
          >
            <h2 className="text-2xl font-extrabold text-white md:text-3xl">{title}</h2>
            {subtitle ? <p className="mt-2 text-sm text-blue-200/80">{subtitle}</p> : null}
            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-blue-200/70">
                    <th className="pb-3 pr-4 font-semibold">{headers.service}</th>
                    <th className="pb-3 pr-4 font-semibold">{headers.replaces}</th>
                    <th className="pb-3 pr-4 font-semibold">{headers.cost}</th>
                    <th className="pb-3 font-semibold text-[#00CFFF]">{headers.nelvyon}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr className="border-b border-white/5" key={row.service}>
                      <td className="py-3 pr-4 font-medium text-white">{row.service}</td>
                      <td className="py-3 pr-4 text-blue-100/80">{row.replaces}</td>
                      <td className="py-3 pr-4 text-blue-100/70">{row.cost}</td>
                      <td className="bg-[#0066FF]/10 py-3 text-center">
                        <Check className="mx-auto h-5 w-5 text-[#00CFFF]" strokeWidth={3} />
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#0066FF]/15">
                    <td className="py-4 pr-4 font-bold text-white">TOTAL SIN NELVYON</td>
                    <td className="py-4 pr-4 text-white/70">{totalRow.replaces}</td>
                    <td className="py-4 pr-4 font-semibold text-white">{totalRow.cost}</td>
                    <td className="py-4 text-center font-bold text-[#00CFFF]">{totalRow.nelvyon}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {footerNote ? (
              <p className="mt-6 text-center text-sm font-medium text-blue-100/90">{footerNote}</p>
            ) : null}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
