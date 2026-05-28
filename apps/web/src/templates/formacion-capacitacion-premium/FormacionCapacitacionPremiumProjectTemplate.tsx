"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader, NelvyonDsStatusDot } from "@/design-system/components";
import type { FormacionAuditItem, FormacionAuditStatus, FormacionModule, FormacionProjectConfig, FormacionTypeKind } from "@/templates/formacion-capacitacion-premium/types";
import { FormacionCapacitacionPremiumDeliveryChecklist } from "@/templates/formacion-capacitacion-premium/FormacionCapacitacionPremiumDeliveryChecklist";

interface Props {
  config: FormacionProjectConfig;
  accentHex?: string;
  showDeliveryPanel?: boolean;
}

function moduleLabel(m: FormacionModule): string {
  switch (m) {
    case "needs_diagnosis":
      return "Diagnóstico de necesidades";
    case "curriculum_design":
      return "Diseño curricular";
    case "materials_resources":
      return "Materiales y recursos";
    case "delivery_instruction":
      return "Impartición";
    case "evaluation_feedback":
      return "Evaluación y feedback";
    case "certification":
      return "Certificación";
    case "reporting_followup":
      return "Reporting y seguimiento";
  }
}

function typeLabel(t: FormacionTypeKind): string {
  switch (t) {
    case "taller_presencial":
      return "Taller presencial";
    case "curso_online":
      return "Curso online";
    case "mentoria":
      return "Mentoría";
    case "webinar":
      return "Webinar";
    case "manual_tecnico":
      return "Manual técnico";
    case "onboarding_herramienta":
      return "Onboarding herramienta";
    case "programa_continuo":
      return "Programa continuo";
  }
}

/** Curso online, programa continuo y onboarding herramienta → primary; resto → neutral. */
function typeTone(t: FormacionTypeKind): "primary" | "neutral" {
  if (t === "curso_online" || t === "programa_continuo" || t === "onboarding_herramienta") return "primary";
  return "neutral";
}

function auditStatusToDot(status: FormacionAuditStatus): "ok" | "warn" | "crit" | "pending" {
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

function priorityTone(priority: FormacionAuditItem["priority"]): "danger" | "warning" | "neutral" {
  switch (priority) {
    case "P1":
      return "danger";
    case "P2":
      return "warning";
    case "P3":
      return "neutral";
  }
}

export function FormacionCapacitacionPremiumProjectTemplate({ config, accentHex = "#0084fc", showDeliveryPanel = false }: Props) {
  const surfaceStyle = { "--formacion-accent": accentHex } as CSSProperties;

  return (
    <div
      className="formacion-capacitacion-premium-template rounded-xl border border-border bg-muted/25 text-foreground shadow-card dark:bg-muted/15"
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
          <nav aria-label="Advisor, help, and OS training context" className="mt-6 flex flex-wrap gap-2">
            <NelvyonDsButton asChild className="text-link hover:text-link-hover" size="sm" variant="ghost">
              <Link href="/os/advisor-empresarial-premium/preview">Advisor Empresarial Premium (OS)</Link>
            </NelvyonDsButton>
            <NelvyonDsButton asChild className="text-link hover:text-link-hover" size="sm" variant="ghost">
              <Link href="/help">Help center</Link>
            </NelvyonDsButton>
            <NelvyonDsButton asChild className="text-link hover:text-link-hover" size="sm" variant="ghost">
              <Link href="/os/contenido-copywriting-premium/preview">Contenido Premium (OS)</Link>
            </NelvyonDsButton>
            <NelvyonDsButton asChild className="text-link hover:text-link-hover" size="sm" variant="ghost">
              <Link href="/os/video-multimedia-premium/preview">Video Multimedia Premium (OS)</Link>
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
          Formación y capacitación digital Premium template v2 — Design System applied. Checklist only. No LMS APIs or live courseware.
        </p>
      ) : null}

      <main className="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-6 lg:space-y-12 lg:py-14" id="main-content">
        {config.sections.map((section) => (
          <NelvyonDsCard
            aria-labelledby={`fc-sec-${section.id}`}
            as="section"
            className="space-y-4"
            key={section.id}
          >
            <NelvyonDsSectionHeader
              className="border-0 pb-2"
              eyebrow={moduleLabel(section.module)}
              id={`fc-sec-${section.id}`}
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
                        <div className="mt-2 flex flex-wrap gap-2" role="list" aria-label="Training types">
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

      {showDeliveryPanel ? <FormacionCapacitacionPremiumDeliveryChecklist /> : null}

      <footer className="border-t border-border bg-card py-8 text-center text-xs text-muted-foreground">
        <p>Formación y capacitación digital Premium OS template v2 · LMS, recordings, and credentials stay in external systems.</p>
      </footer>
    </div>
  );
}
