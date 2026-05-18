"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader, NelvyonDsStatusDot } from "@/design-system/components";
import type { DisenoAuditItem, DisenoAuditStatus, DisenoFormatKind, DisenoModule, DisenoProjectConfig } from "@/templates/diseno-grafico-premium/types";
import { DisenoGraficoPremiumDeliveryChecklist } from "@/templates/diseno-grafico-premium/DisenoGraficoPremiumDeliveryChecklist";

interface Props {
  config: DisenoProjectConfig;
  accentHex?: string;
  showDeliveryPanel?: boolean;
}

function moduleLabel(m: DisenoModule): string {
  switch (m) {
    case "briefing_concept":
      return "Briefing y concepto";
    case "sketches_proposals":
      return "Bocetos y propuestas";
    case "design_composition":
      return "Diseño y composición";
    case "review_feedback":
      return "Revisión y feedback";
    case "adaptations_formats":
      return "Adaptaciones y formatos";
    case "delivery":
      return "Entrega";
    case "reporting":
      return "Reporting";
  }
}

function formatLabel(f: DisenoFormatKind): string {
  switch (f) {
    case "banner_digital":
      return "Banner digital";
    case "flyer":
      return "Flyer";
    case "cartel":
      return "Cartel";
    case "infografia":
      return "Infografía";
    case "presentacion":
      return "Presentación";
    case "packaging":
      return "Packaging";
    case "creatividad_ads":
      return "Creatividad ads";
    case "post_social":
      return "Post social";
    case "kit_brand":
      return "Kit brand";
  }
}

/** Kit brand, packaging y piezas paid/social → primary; resto → neutral. */
function formatTone(f: DisenoFormatKind): "primary" | "neutral" {
  if (f === "kit_brand" || f === "packaging" || f === "creatividad_ads" || f === "post_social") return "primary";
  return "neutral";
}

function auditStatusToDot(status: DisenoAuditStatus): "ok" | "warn" | "crit" | "pending" {
  switch (status) {
    case "pass":
      return "ok";
    case "warn":
      return "warn";
    case "fail":
      return "crit";
    case "pending":
      return "pending";
  }
}

function priorityTone(priority: DisenoAuditItem["priority"]): "danger" | "warning" | "neutral" {
  switch (priority) {
    case "P1":
      return "danger";
    case "P2":
      return "warning";
    case "P3":
      return "neutral";
  }
}

export function DisenoGraficoPremiumProjectTemplate({ config, accentHex = "#7c3aed", showDeliveryPanel = false }: Props) {
  const surfaceStyle = { "--diseno-accent": accentHex } as CSSProperties;

  return (
    <div
      className="diseno-grafico-premium-template rounded-xl border border-border bg-muted/25 text-foreground shadow-card dark:bg-muted/15"
      style={surfaceStyle}
    >
      <div className="relative border-b border-border bg-card">
        <a
          className="absolute left-2 top-2 z-[200] whitespace-nowrap rounded-md bg-card px-3 py-2 text-sm font-semibold text-foreground opacity-0 shadow-elevated focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          href="#main-content"
        >
          Skip to deliverables
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{config.clientLabel}</p>
          <h1 className="mt-2 text-pretty text-page font-semibold tracking-tight text-foreground sm:text-page-md">{config.projectName}</h1>
          <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-muted-foreground">{config.projectSubtitle}</p>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{config.generatedNote}</p>
          <nav aria-label="OS and workspace routes for graphic design delivery context" className="mt-6 flex flex-wrap gap-2">
            <NelvyonDsButton asChild className="text-link hover:text-link-hover" size="sm" variant="ghost">
              <Link href="/os/branding-premium/preview">Branding Premium (OS)</Link>
            </NelvyonDsButton>
            <NelvyonDsButton asChild className="text-link hover:text-link-hover" size="sm" variant="ghost">
              <Link href="/os/social-media-premium/preview">Social Media Premium (OS)</Link>
            </NelvyonDsButton>
            <NelvyonDsButton asChild className="text-link hover:text-link-hover" size="sm" variant="ghost">
              <Link href="/os/ads-premium/preview">Ads Premium (OS)</Link>
            </NelvyonDsButton>
            <NelvyonDsButton asChild className="text-link hover:text-link-hover" size="sm" variant="ghost">
              <Link href="/os/contenido-copywriting-premium/preview">Contenido Premium (OS)</Link>
            </NelvyonDsButton>
            <NelvyonDsButton asChild className="text-link hover:text-link-hover" size="sm" variant="ghost">
              <Link href="/os/web-premium/preview">Web Premium (OS)</Link>
            </NelvyonDsButton>
            <NelvyonDsButton asChild className="text-link hover:text-link-hover" size="sm" variant="ghost">
              <Link href="/app/branding">Branding</Link>
            </NelvyonDsButton>
            <NelvyonDsButton asChild className="text-link hover:text-link-hover" size="sm" variant="ghost">
              <Link href="/campaigns">Campaigns</Link>
            </NelvyonDsButton>
            <NelvyonDsButton asChild className="text-link hover:text-link-hover" size="sm" variant="ghost">
              <Link href="/help">Help center</Link>
            </NelvyonDsButton>
            <NelvyonDsButton asChild className="text-link hover:text-link-hover" size="sm" variant="ghost">
              <Link href="/os/excellence/golden-path">Golden path</Link>
            </NelvyonDsButton>
            <NelvyonDsButton asChild size="sm" variant="ghost">
              <Link href="/os">OS home</Link>
            </NelvyonDsButton>
            <NelvyonDsButton asChild className="text-link hover:text-link-hover" size="sm" variant="ghost">
              <Link href="/os/design-system">Design system</Link>
            </NelvyonDsButton>
          </nav>
        </div>
      </div>

      {showDeliveryPanel ? (
        <p className="mx-auto w-full max-w-5xl border-b border-warning/40 bg-warning/10 px-4 py-3 text-xs leading-relaxed text-warning-foreground sm:px-6">
          <strong className="font-semibold">Internal OS preview</strong>
          {" · "}
          Diseño gráfico y creatividades Premium template v2 — Design System applied. Checklist only. No design or asset APIs.
        </p>
      ) : null}

      <main className="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-6 lg:space-y-12 lg:py-14" id="main-content">
        {config.sections.map((section) => (
          <NelvyonDsCard
            aria-labelledby={`dg-sec-${section.id}`}
            as="section"
            className="space-y-4"
            key={section.id}
          >
            <NelvyonDsSectionHeader
              className="border-0 pb-2"
              eyebrow={moduleLabel(section.module)}
              id={`dg-sec-${section.id}`}
              subtitle={section.intro}
              title={section.title}
            />
            <ul className="space-y-3">
              {section.items.map((item) => (
                <li className="rounded-lg border border-border bg-muted/20 p-4 dark:bg-muted/10" key={item.id}>
                  <div className="flex flex-wrap items-start gap-3">
                    <NelvyonDsStatusDot className="mt-1.5 shrink-0" status={auditStatusToDot(item.status)} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{item.label}</p>
                      {item.formats?.length ? (
                        <div className="mt-2 flex flex-wrap gap-2" role="list" aria-label="Creative formats">
                          {item.formats.map((f) => (
                            <span key={f} role="listitem">
                              <NelvyonDsBadge className="rounded-full" tone={formatTone(f)}>
                                {formatLabel(f)}
                              </NelvyonDsBadge>
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        <span className="font-medium text-foreground">Evidence:</span> {item.evidence}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <NelvyonDsBadge tone={priorityTone(item.priority)}>{item.priority}</NelvyonDsBadge>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </NelvyonDsCard>
        ))}
      </main>

      {showDeliveryPanel ? <DisenoGraficoPremiumDeliveryChecklist /> : null}

      <footer className="border-t border-border bg-card py-8 text-center text-xs text-muted-foreground">
        <p>Diseño gráfico y creatividades Premium OS template v2 · Source files and exports stay in external tools.</p>
      </footer>
    </div>
  );
}
