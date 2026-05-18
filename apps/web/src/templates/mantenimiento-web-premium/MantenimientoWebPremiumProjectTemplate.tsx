"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader, NelvyonDsStatusDot } from "@/design-system/components";
import type { MantenimientoAuditItem, MantenimientoAuditStatus, MantenimientoModule, MantenimientoProjectConfig, MantenimientoTypeKind } from "@/templates/mantenimiento-web-premium/types";
import { MantenimientoWebPremiumDeliveryChecklist } from "@/templates/mantenimiento-web-premium/MantenimientoWebPremiumDeliveryChecklist";

interface Props {
  config: MantenimientoProjectConfig;
  accentHex?: string;
  showDeliveryPanel?: boolean;
}

function moduleLabel(m: MantenimientoModule): string {
  switch (m) {
    case "initial_audit":
      return "Auditoría inicial";
    case "updates_patches":
      return "Actualizaciones y parches";
    case "backups_recovery":
      return "Backups y recuperación";
    case "security_hardening":
      return "Seguridad y hardening";
    case "performance_cwv":
      return "Rendimiento y CWV";
    case "uptime_monitoring":
      return "Uptime y monitorización";
    case "monthly_reporting":
      return "Reporting mensual";
  }
}

function typeLabel(t: MantenimientoTypeKind): string {
  switch (t) {
    case "actualizaciones":
      return "Actualizaciones";
    case "backups":
      return "Backups";
    case "seguridad":
      return "Seguridad";
    case "rendimiento":
      return "Rendimiento";
    case "uptime":
      return "Uptime";
    case "seo_tecnico":
      return "SEO técnico";
    case "soporte":
      return "Soporte";
    case "reporting":
      return "Reporting";
  }
}

/** Seguridad, rendimiento y uptime → primary; resto → neutral. */
function typeTone(t: MantenimientoTypeKind): "primary" | "neutral" {
  if (t === "seguridad" || t === "rendimiento" || t === "uptime") return "primary";
  return "neutral";
}

function auditStatusToDot(status: MantenimientoAuditStatus): "ok" | "warn" | "crit" | "pending" {
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

function priorityTone(priority: MantenimientoAuditItem["priority"]): "danger" | "warning" | "neutral" {
  switch (priority) {
    case "P1":
      return "danger";
    case "P2":
      return "warning";
    case "P3":
      return "neutral";
  }
}

export function MantenimientoWebPremiumProjectTemplate({ config, accentHex = "#0d9488", showDeliveryPanel = false }: Props) {
  const surfaceStyle = { "--mant-accent": accentHex } as CSSProperties;

  return (
    <div
      className="mantenimiento-web-premium-template rounded-xl border border-border bg-muted/25 text-foreground shadow-card dark:bg-muted/15"
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
          <nav aria-label="Observability routes and OS maintenance context" className="mt-6 flex flex-wrap gap-2">
            <NelvyonDsButton asChild className="text-link hover:text-link-hover" size="sm" variant="ghost">
              <Link href="/os/observability">OS observability</Link>
            </NelvyonDsButton>
            <NelvyonDsButton asChild className="text-link hover:text-link-hover" size="sm" variant="ghost">
              <Link href="/os/observability/incidents">OS observability incidents</Link>
            </NelvyonDsButton>
            <NelvyonDsButton asChild className="text-link hover:text-link-hover" size="sm" variant="ghost">
              <Link href="/os/web-premium/preview">Web Premium (OS)</Link>
            </NelvyonDsButton>
            <NelvyonDsButton asChild className="text-link hover:text-link-hover" size="sm" variant="ghost">
              <Link href="/os/seo-premium/preview">SEO Premium (OS)</Link>
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
          Mantenimiento web Premium template v2 — Design System applied. Checklist only. No live monitoring or external APIs.
        </p>
      ) : null}

      <main className="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-6 lg:space-y-12 lg:py-14" id="main-content">
        {config.sections.map((section) => (
          <NelvyonDsCard
            aria-labelledby={`mw-sec-${section.id}`}
            as="section"
            className="space-y-4"
            key={section.id}
          >
            <NelvyonDsSectionHeader
              className="border-0 pb-2"
              eyebrow={moduleLabel(section.module)}
              id={`mw-sec-${section.id}`}
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
                      {item.types?.length ? (
                        <div className="mt-2 flex flex-wrap gap-2" role="list" aria-label="Maintenance types">
                          {item.types.map((t) => (
                            <span key={t} role="listitem">
                              <NelvyonDsBadge className="rounded-full" tone={typeTone(t)}>
                                {typeLabel(t)}
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

      {showDeliveryPanel ? <MantenimientoWebPremiumDeliveryChecklist /> : null}

      <footer className="border-t border-border bg-card py-8 text-center text-xs text-muted-foreground">
        <p>Mantenimiento web Premium OS template v2 · Probes, backups, and deploys stay in ops pipelines.</p>
      </footer>
    </div>
  );
}
