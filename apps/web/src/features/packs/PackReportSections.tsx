"use client";

import Link from "next/link";

import { PanelCard } from "@/core/ui/PanelCard";
import { getPackMeta } from "@/lib/packs/packRegistry";
import type { PackParentComplement, PackReportSection } from "@/lib/packs/types";

export function PackParentComplementPanel({
  complement,
}: {
  complement: PackParentComplement;
}) {
  const parentMeta = getPackMeta(complement.parent_pack_id);
  return (
    <PanelCard className="border-primary/30 bg-primary/5">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
        {complement.specialized_pack_name} → {complement.parent_pack_name}
      </p>
      <h3 className="mt-2 text-base font-semibold">{complement.headline}</h3>
      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-foreground">Cómo se complementa</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            {complement.how_it_complements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Incluido en el pack integral</p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            {complement.included_in_parent.map((item) => (
              <li className="flex gap-2" key={item}>
                <span className="text-success-foreground">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{complement.upgrade_cta}</p>
      {parentMeta ? (
        <Link
          className="mt-3 inline-block text-sm font-medium text-link hover:underline"
          href={parentMeta.kickoffPath}
        >
          Ver pack integral {complement.parent_pack_name} →
        </Link>
      ) : null}
    </PanelCard>
  );
}

export function PackReportSectionsPanel({
  sections,
  highlightIds,
}: {
  sections: PackReportSection[];
  highlightIds?: string[];
}) {
  const highlights = new Set(highlightIds ?? []);
  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const highlighted = highlights.has(section.id);
        return (
          <PanelCard
            className={highlighted ? "border-primary/40 ring-1 ring-primary/20" : undefined}
            key={section.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-base font-semibold">{section.title}</h3>
              {highlighted ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  Foco del pack especializado
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{section.summary}</p>

            {section.metrics && section.metrics.length > 0 ? (
              <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                {section.metrics.map((m) => (
                  <div className="rounded-md border border-border/80 bg-muted/20 px-3 py-2" key={m.label}>
                    <dt className="text-xs text-muted-foreground">{m.label}</dt>
                    <dd className="mt-0.5 text-lg font-semibold tabular-nums">{m.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <div>
                <p className="text-sm font-medium">Hallazgos clave</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {section.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-medium">Recomendaciones accionables</p>
                <ul className="mt-2 space-y-2">
                  {section.recommendations.map((r) => (
                    <li
                      className="rounded-md border border-border/80 bg-background/60 px-3 py-2 text-sm"
                      key={r.action}
                    >
                      <p className="font-medium text-foreground">{r.action}</p>
                      <p className="mt-0.5 text-muted-foreground">{r.impact}</p>
                      <span
                        className={`mt-1 inline-block text-xs font-medium uppercase ${
                          r.priority === "high"
                            ? "text-destructive"
                            : r.priority === "medium"
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-muted-foreground"
                        }`}
                      >
                        {r.priority === "high" ? "Alta prioridad" : r.priority === "medium" ? "Media" : "Baja"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </PanelCard>
        );
      })}
    </div>
  );
}
