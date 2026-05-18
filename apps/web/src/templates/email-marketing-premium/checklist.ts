/**
 * OS delivery QA aligned with backend/ops/runbooks/email_marketing_premium_nelvyon_v1.md
 * v2: NELVYON Design System primitives applied — see `/os/design-system`.
 */

export type EmailMarketingPremiumDeliveryStatus = "ok" | "warn" | "crit" | "pending";

export interface EmailMarketingPremiumDeliveryItem {
  id: string;
  source: "runbook" | "template";
  area: string;
  description: string;
  status: EmailMarketingPremiumDeliveryStatus;
}

export const EMAIL_MARKETING_PREMIUM_DELIVERY_ITEMS: readonly EmailMarketingPremiumDeliveryItem[] = [
  {
    id: "rb-ready",
    source: "runbook",
    area: "READY",
    status: "ok",
    description: "Golden path / `pnpm gate` when email-related web surfaces ship in the same release train.",
  },
  {
    id: "rb-strategy",
    source: "runbook",
    area: "STRATEGY & SEGMENTATION",
    status: "ok",
    description:
      "Program mix explicit: newsletter, campaña, automatización, transaccional, nurturing — no phantom list sources; check `/app/communications` when transactional scope is claimed.",
  },
  {
    id: "rb-design",
    source: "runbook",
    area: "DESIGN & TEMPLATES",
    status: "ok",
    description: "Modules, responsive breakpoints, and plain-text fallbacks documented outside product.",
  },
  {
    id: "rb-copy",
    source: "runbook",
    area: "COPY & SUBJECTS",
    status: "warn",
    description: "Subject/preheader matrix honest — no deceptive urgency or false personalization.",
  },
  {
    id: "rb-automation",
    source: "runbook",
    area: "AUTOMATIONS & FLOWS",
    status: "ok",
    description: "Triggers/exit criteria documented; `/automations/jobs` posture when flows touch product.",
  },
  {
    id: "rb-deliverability",
    source: "runbook",
    area: "DELIVERABILITY",
    status: "warn",
    description: "SPF/DKIM/DMARC and suppression narrative realistic — no placement guarantees.",
  },
  {
    id: "rb-metrics",
    source: "runbook",
    area: "METRICS & REPORTING",
    status: "ok",
    description: "Opens/clicks/unsubs KPIs with baselines — template records expectations only.",
  },
  {
    id: "tmpl-ds-v2",
    source: "template",
    area: "Design System v2",
    status: "ok",
    description:
      "Email Marketing Premium preview uses `@/design-system` semantic tokens and NelvyonDs components; compare with `/os/design-system`.",
  },
  {
    id: "tmpl-sections",
    source: "template",
    area: "Deliverable modules",
    status: "ok",
    description:
      "Strategy/segmentation, design/templates, copy/subjects, automations/flows, deliverability, metrics — P1–P3 + email-type badges where set.",
  },
  {
    id: "tmpl-meta",
    source: "template",
    area: "Metadata helper",
    status: "ok",
    description: "`buildEmailMarketingPremiumMetadata` for preview OG/Twitter defaults.",
  },
  {
    id: "tmpl-no-apis",
    source: "template",
    area: "No ESP APIs",
    status: "ok",
    description: "No SendGrid/Mailgun/SES/Marketing Cloud API wiring from this OS template.",
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
    description: "`/os/email-marketing-premium/preview` at mobile / tablet / desktop, clean console.",
  },
] as const;
