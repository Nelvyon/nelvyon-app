import type { AdsCampaignConfig } from "@/templates/ads-premium/types";
import { ADS_PREMIUM_PREVIEW_PATH } from "@/templates/ads-premium/paths";

/** Demo campaign snapshot — replace per client engagement; no Ads APIs; DS v2 shell. */
export const adsPremiumNelvyonDemoCampaign: AdsCampaignConfig = {
  pageSeo: {
    title: "NELVYON OS — Ads Premium campaign template (preview)",
    description:
      "Premium ads OS shell: tracking, creatives, copy, targeting, budget, optimization, reporting. Internal preview — no Google/Meta APIs.",
    canonicalPath: ADS_PREMIUM_PREVIEW_PATH,
    siteName: "NELVYON Ads Premium",
    keywords: ["ads", "campaign", "NELVYON", "OS"],
    locale: "en_US",
  },
  clientLabel: "Demo sponsor · Northwind Labs",
  campaignName: "Q2 Consideration · Meridian Publishing",
  channels: [
    { channel: "google_ads", label: "Google Ads", active: true },
    { channel: "meta_ads", label: "Meta Ads", active: true },
    { channel: "other", label: "Other / experimental", active: false },
  ],
  auditSubtitle:
    "Readiness checklist before spend goes live. Statuses are illustrative — replace with live QA outcomes when APIs and pixels are governed by their own fronts.",
  generatedNote:
    "Template v2 (Design System applied) does not authenticate to ad platforms or fire conversion pixels. Governance hooks link to golden path, observability, branding, and global risk views.",
  sections: [
    {
      id: "tracking",
      module: "tracking",
      title: "Tracking & conversiones",
      intro: "Measurement hygiene without unauthorized script sprawl.",
      items: [
        {
          id: "pixels-tags",
          label: "Conversion tags / event naming aligned to funnel",
          status: "warn",
          priority: "P1",
          evidence: "Confirm tag inventory with compliance owner; correlate deploy windows via `/os/observability/incidents`.",
        },
        {
          id: "utm",
          label: "UTM discipline on landing URLs",
          status: "pass",
          priority: "P2",
          evidence: "Demo uses consistent slug patterns; enforce per tenant when linking from creatives.",
        },
        {
          id: "server-side",
          label: "Server-side vs browser tag strategy",
          status: "pending",
          priority: "P2",
          evidence: "Decision deferred — document when consent/CAPI front opens.",
        },
      ],
    },
    {
      id: "creatives",
      module: "creatives",
      title: "Creatividades",
      intro: "Asset specs and policy-safe variants.",
      items: [
        {
          id: "formats",
          label: "Format coverage (feed, story, search RSA placeholders)",
          status: "pass",
          priority: "P1",
          evidence: "Template assumes multi-ratio artwork exists outside NELVYON asset CDN.",
        },
        {
          id: "brand-policy",
          label: "Brand alignment vs `/app/branding/policy`",
          status: "warn",
          priority: "P1",
          evidence: "Verify tenant activation on `/os/tenants/activation` before branded landers ship.",
        },
      ],
    },
    {
      id: "copy",
      module: "copy",
      title: "Copies",
      intro: "Messaging, claims, locale readiness.",
      items: [
        {
          id: "claims",
          label: "Claims & disclaimers reviewed",
          status: "warn",
          priority: "P1",
          evidence: "Legal review external to OS — flag pending until counsel signs off.",
        },
        {
          id: "locale-copy",
          label: "Locale readiness vs `/os/i18n` hotspots",
          status: "pending",
          priority: "P2",
          evidence: "Prioritize P1 strings before scaling spend into secondary locales.",
        },
      ],
    },
    {
      id: "segmentation",
      module: "segmentation",
      title: "Segmentación",
      intro: "Audience definitions and overlap risk.",
      items: [
        {
          id: "overlap",
          label: "Audience overlap / exclusion strategy",
          status: "warn",
          priority: "P2",
          evidence: "Qualitative until Ads API audiences sync exists.",
        },
        {
          id: "geo",
          label: "Geo & brand-safety constraints",
          status: "pass",
          priority: "P2",
          evidence: "Demo assumes NA + EU guardrails documented offline.",
        },
      ],
    },
    {
      id: "budget",
      module: "budget",
      title: "Presupuesto & puja",
      intro: "Spend caps and bidding posture.",
      items: [
        {
          id: "daily-cap",
          label: "Daily / lifetime caps documented",
          status: "pass",
          priority: "P1",
          evidence: "Caps enforced in-platform — OS records intent here only.",
        },
        {
          id: "bid-strategy",
          label: "Bid strategy vs learning phase risk",
          status: "warn",
          priority: "P2",
          evidence: "Monitor volatility post-launch via observability + manual dashboards.",
        },
      ],
    },
    {
      id: "optimization",
      module: "optimization",
      title: "Optimización",
      intro: "Experimentation and guardrails.",
      items: [
        {
          id: "experiments",
          label: "A/B creative rotation cadence",
          status: "pending",
          priority: "P3",
          evidence: "Schedule owned by media lead — track dates externally.",
        },
        {
          id: "fatigue",
          label: "Creative fatigue monitoring",
          status: "warn",
          priority: "P2",
          evidence: "CTR/CPA watched off-platform until analytics bridge exists.",
        },
      ],
    },
    {
      id: "reporting",
      module: "reporting",
      title: "Reporting",
      intro: "Stakeholder-ready summaries and traceability.",
      items: [
        {
          id: "exec-dash",
          label: "Executive snapshot cadence",
          status: "pass",
          priority: "P2",
          evidence: "Use OS checklist + external BI — no automated Ads pulls here.",
        },
        {
          id: "request-id",
          label: "Incident traceability (`request_id`) for API-impacting releases",
          status: "pass",
          priority: "P1",
          evidence: "Aligns with incidents drilldown expectations in ads runbook.",
        },
      ],
    },
  ],
};
