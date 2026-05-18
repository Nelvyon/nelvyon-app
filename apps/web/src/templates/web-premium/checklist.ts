/**
 * OS delivery QA aligned with backend/ops/runbooks/web_premium_nelvyon_v1.md
 * plus template-specific visual / CWV verification (manual Lighthouse).
 * v2: Design System primitives applied — see `/os/design-system` for reference parity.
 */

export type WebPremiumDeliveryStatus = "ok" | "warn" | "crit" | "pending";

export interface WebPremiumDeliveryItem {
  id: string;
  source: "runbook" | "template";
  area: string;
  description: string;
  /** Visual QA column in OS preview (maps to NelvyonDsStatusDot). */
  status: WebPremiumDeliveryStatus;
}

export const WEB_PREMIUM_DELIVERY_ITEMS: readonly WebPremiumDeliveryItem[] = [
  {
    id: "rb-build",
    source: "runbook",
    area: "Build correctness",
    status: "ok",
    description: "Typecheck + lint pass on web package before declaring READY.",
  },
  {
    id: "rb-regression",
    source: "runbook",
    area: "Regression safety",
    status: "ok",
    description: "`pnpm gate` green for the promoted change set.",
  },
  {
    id: "rb-errors",
    source: "runbook",
    area: "Errors / observability",
    status: "warn",
    description:
      "No unexplained spikes in `/os/observability` aligned with deploy window (when release touches web/API).",
  },
  {
    id: "rb-branding",
    source: "runbook",
    area: "Branding/policy",
    status: "ok",
    description: "Tenant-visible surfaces respect branding policy when integrating with `/app/branding*`.",
  },
  {
    id: "rb-docs",
    source: "runbook",
    area: "Documentation",
    status: "pending",
    description: "Operational note or change-journal convention for notable web releases.",
  },
  {
    id: "tmpl-ds-v2",
    source: "template",
    area: "Design System v2",
    status: "ok",
    description:
      "Web Premium preview uses `@/design-system` tokens (semantic colors via CSS variables) and NelvyonDs components; cross-check with `/os/design-system`.",
  },
  {
    id: "tmpl-responsive",
    source: "template",
    area: "Responsive QA",
    status: "warn",
    description: "Verify mobile / tablet / desktop layouts; no horizontal scroll at common widths.",
  },
  {
    id: "tmpl-console",
    source: "template",
    area: "Runtime hygiene",
    status: "ok",
    description: "No console errors on initial load of this preview route.",
  },
  {
    id: "tmpl-links",
    source: "template",
    area: "Navigation",
    status: "ok",
    description: "No broken in-template links (anchors + internal OS return link).",
  },
  {
    id: "tmpl-meta",
    source: "template",
    area: "SEO on-page",
    status: "ok",
    description: "Title and meta description present via `buildWebPremiumMetadata` for the client config.",
  },
  {
    id: "tmpl-cwv",
    source: "template",
    area: "Core Web Vitals (field/lab)",
    status: "warn",
    description:
      "Target lab profile: LCP under 2.5s, CLS under 0.1, responsive input delay (FID/INP depending on Lighthouse). Images: hero uses fetchPriority high; cards use lazy loading.",
  },
] as const;
