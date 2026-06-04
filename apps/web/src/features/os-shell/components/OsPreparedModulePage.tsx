"use client";

import Link from "next/link";
import { Construction, ArrowRight } from "lucide-react";

import { OsShellLayout } from "@/features/os-shell/components/OsShellLayout";

export function OsPreparedModulePage({
  title,
  description,
  phase = "2B",
  relatedLinks,
  dataNote,
}: {
  title: string;
  description: string;
  phase?: string;
  relatedLinks?: { href: string; label: string }[];
  dataNote?: string;
}) {
  return (
    <OsShellLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-xl border border-[#0084FF]/30 bg-[#0b1428] p-8">
          <div className="flex items-center gap-3 text-[#0084FF]">
            <Construction className="h-8 w-8" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-widest">Módulo preparado</span>
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-white">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/65">{description}</p>
          <p className="mt-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/50">
            Sin datos simulados. El CRUD y la lógica de negocio llegan en fase {phase}. Esta pantalla
            es honesta: estructura del shell OS lista, backend pendiente o parcial.
          </p>
          {dataNote ? (
            <p className="mt-3 text-xs text-amber-200/80">{dataNote}</p>
          ) : null}
        </div>
        {relatedLinks?.length ? (
          <ul className="space-y-2">
            {relatedLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="inline-flex items-center gap-2 text-sm text-[#0084FF] hover:underline"
                >
                  {l.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </OsShellLayout>
  );
}
