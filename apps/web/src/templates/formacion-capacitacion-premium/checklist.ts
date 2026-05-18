/**
 * OS delivery QA aligned with backend/ops/runbooks/formacion_capacitacion_digital_premium_nelvyon_v1.md
 * v2: NELVYON Design System primitives applied — see `/os/design-system`.
 */

export type FormacionPremiumDeliveryStatus = "ok" | "warn" | "crit" | "pending";

export interface FormacionPremiumDeliveryItem {
  id: string;
  source: "runbook" | "template";
  area: string;
  description: string;
  status: FormacionPremiumDeliveryStatus;
}

export const FORMACION_PREMIUM_DELIVERY_ITEMS: readonly FormacionPremiumDeliveryItem[] = [
  {
    id: "rb-ready",
    source: "runbook",
    area: "READY",
    status: "ok",
    description: "Golden path / `pnpm gate` when training-related surfaces ship in the same release train.",
  },
  {
    id: "rb-diagnosis",
    source: "runbook",
    area: "NEEDS DIAGNOSIS",
    status: "ok",
    description:
      "Roles, gaps, constraints — types: taller_presencial, curso_online, mentoria, webinar, manual_tecnico, onboarding_herramienta, programa_continuo.",
  },
  {
    id: "rb-curriculum",
    source: "runbook",
    area: "CURRICULUM DESIGN",
    status: "ok",
    description: "Outcomes and modules — no LMS provisioning from OS template.",
  },
  {
    id: "rb-materials",
    source: "runbook",
    area: "MATERIALS & RESOURCES",
    status: "warn",
    description: "Decks, job aids, licensing — no SCORM build or video render from checklist.",
  },
  {
    id: "rb-delivery",
    source: "runbook",
    area: "DELIVERY / INSTRUCTION",
    status: "ok",
    description: "Schedule and cohort rules — `/os/advisor-empresarial-premium/preview` when exec coaching overlaps paperwork.",
  },
  {
    id: "rb-eval",
    source: "runbook",
    area: "EVALUATION & FEEDBACK",
    status: "ok",
    description: "Surveys and anonymity — execution in LMS/survey tool outside NELVYON.",
  },
  {
    id: "rb-cert",
    source: "runbook",
    area: "CERTIFICATION",
    status: "warn",
    description: "Issuance rules — no credential API hooks from this page.",
  },
  {
    id: "rb-report",
    source: "runbook",
    area: "REPORTING & FOLLOW-UP",
    status: "ok",
    description: "Completion metrics limited to definitions — `/help` for HR-sensitive escalations.",
  },
  {
    id: "tmpl-ds-v2",
    source: "template",
    area: "Design System v2",
    status: "ok",
    description:
      "Formación y capacitación digital Premium preview uses `@/design-system` semantic tokens and NelvyonDs components; compare with `/os/design-system`.",
  },
  {
    id: "tmpl-sections",
    source: "template",
    area: "Deliverable modules",
    status: "ok",
    description:
      "Diagnosis, curriculum, materials, instruction, evaluation, certification, reporting — P1–P3 + type badges where set.",
  },
  {
    id: "tmpl-meta",
    source: "template",
    area: "Metadata helper",
    status: "ok",
    description: "`buildFormacionPremiumMetadata` for preview OG/Twitter defaults.",
  },
  {
    id: "tmpl-no-lms",
    source: "template",
    area: "No LMS APIs",
    status: "ok",
    description: "No Moodle/360Learning/Docebo or similar connectors from this OS template.",
  },
  {
    id: "tmpl-no-content",
    source: "template",
    area: "No real courseware",
    status: "ok",
    description: "Does not author lessons, quizzes, or certificates from this preview.",
  },
  {
    id: "tmpl-boundary",
    source: "template",
    area: "Closed fronts",
    status: "ok",
    description: "Does not modify closed product fronts or `/crm/deals`.",
  },
  {
    id: "tmpl-responsive",
    source: "template",
    area: "Responsive QA",
    status: "warn",
    description: "`/os/formacion-capacitacion-premium/preview` at mobile / tablet / desktop, clean console.",
  },
] as const;
