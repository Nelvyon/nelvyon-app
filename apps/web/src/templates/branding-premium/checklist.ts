/**
 * OS delivery QA aligned with backend/ops/runbooks/branding_premium_nelvyon_v1.md
 * v2: NELVYON Design System primitives applied — see `/os/design-system`.
 */

export type BrandingPremiumDeliveryStatus = "ok" | "warn" | "crit" | "pending";

export interface BrandingPremiumDeliveryItem {
  id: string;
  source: "runbook" | "template";
  area: string;
  description: string;
  status: BrandingPremiumDeliveryStatus;
}

export const BRANDING_PREMIUM_DELIVERY_ITEMS: readonly BrandingPremiumDeliveryItem[] = [
  {
    id: "rb-ready",
    source: "runbook",
    area: "READY",
    status: "ok",
    description: "Golden path green before releasing identity changes (`pnpm gate`).",
  },
  {
    id: "rb-policy",
    source: "runbook",
    area: "POLICY",
    status: "ok",
    description: "`/app/branding/policy` reviewed for the workspace; activation matches intended use.",
  },
  {
    id: "rb-preview",
    source: "runbook",
    area: "PREVIEW",
    status: "ok",
    description: "`/app/branding/preview-v2` validates policy matrix before landers or public assets ship.",
  },
  {
    id: "rb-consistency",
    source: "runbook",
    area: "CONSISTENCY",
    status: "warn",
    description: "Logo, color, type, and voice tokens coherent — no orphan deliverables.",
  },
  {
    id: "rb-i18n",
    source: "runbook",
    area: "I18N",
    status: "warn",
    description: "If voice extends to multiple locales, `/os/i18n` debt acknowledged before cutover.",
  },
  {
    id: "tmpl-ds-v2",
    source: "template",
    area: "Design System v2",
    status: "ok",
    description:
      "Branding Premium preview uses `@/design-system` semantic tokens and NelvyonDs components; compare with `/os/design-system`.",
  },
  {
    id: "tmpl-sections",
    source: "template",
    area: "Deliverable modules",
    status: "ok",
    description:
      "Sections cover identity, typography, palette, voice, applications, brandbook with pass/warn/fail/pending and P1–P3.",
  },
  {
    id: "tmpl-meta",
    source: "template",
    area: "Metadata helper",
    status: "ok",
    description: "`buildBrandingPremiumMetadata` for preview route OG/Twitter defaults.",
  },
  {
    id: "tmpl-no-apis",
    source: "template",
    area: "No external design APIs",
    status: "ok",
    description: "No Figma/Adobe/font APIs — status and evidence are OS-recorded only in v1.",
  },
  {
    id: "tmpl-tenant",
    source: "template",
    area: "Tenant activation shortcut",
    status: "ok",
    description: "Link to `/os/tenants/activation` for operators adjusting branding v2 advanced when allowed.",
  },
  {
    id: "tmpl-responsive",
    source: "template",
    area: "Responsive QA",
    status: "warn",
    description: "Verify `/os/branding-premium/preview` at mobile / tablet / desktop with clean console.",
  },
] as const;
