import type { SEOAuditConfig } from "@/templates/seo-premium/types";
import { SEO_PREMIUM_PREVIEW_PATH } from "@/templates/seo-premium/paths";

/** Demo audit snapshot — replace per client engagement; no live crawler ingestion; DS v2 shell. */
export const seoPremiumNelvyonDemoAudit: SEOAuditConfig = {
  pageSeo: {
    title: "NELVYON OS — SEO Premium audit template (preview)",
    description:
      "Premium SEO audit shell: technical, on-page, content, links, CWV, reporting. Internal OS preview — not a live client crawl.",
    canonicalPath: SEO_PREMIUM_PREVIEW_PATH,
    siteName: "NELVYON SEO Premium",
    keywords: ["SEO", "audit", "NELVYON", "OS"],
    locale: "en_US",
  },
  clientLabel: "Demo client · Meridian Publishing",
  auditTitle: "SEO Premium baseline audit",
  auditSubtitle:
    "Structured readiness review before indexable releases. Statuses are illustrative for this template — replace with real findings per engagement.",
  generatedNote:
    "Generated as OS template v2 (Design System applied). External SERP tools, Search Console, and crawl exports remain outside NELVYON until explicitly integrated.",
  sections: [
    {
      id: "technical",
      module: "technical",
      title: "Technical SEO",
      intro: "Crawlability, index signals, and URL hygiene.",
      items: [
        {
          id: "meta-title-desc",
          label: "Meta title & description present per template route",
          status: "pass",
          priority: "P1",
          evidence: "Preview uses `buildSEOPremiumMetadata`; PDP/catalog routes follow same pattern when promoted.",
        },
        {
          id: "canonical",
          label: "Canonical URLs",
          status: "warn",
          priority: "P1",
          evidence: "Canonical emitted when `NEXT_PUBLIC_SITE_URL` or `VERCEL_URL` set; verify absolute URLs in staging.",
        },
        {
          id: "sitemap",
          label: "XML sitemap coverage",
          status: "pending",
          priority: "P2",
          evidence: "Sitemap generation not bundled in this template — track in ops backlog per domain.",
        },
        {
          id: "robots",
          label: "robots.txt & meta robots alignment",
          status: "warn",
          priority: "P1",
          evidence: "OS preview routes use noindex in layout; production hosts must reconcile marketing vs app shells.",
        },
      ],
    },
    {
      id: "on-page",
      module: "on_page",
      title: "On-page structure",
      intro: "Headings hierarchy and snippet-oriented markup.",
      items: [
        {
          id: "headings",
          label: "Logical H1–H3 hierarchy on key templates",
          status: "pass",
          priority: "P1",
          evidence: "Audit template uses one H1 per view and section H2s — mirror for client pages.",
        },
        {
          id: "snippets",
          label: "Snippet-oriented titles (length / intent)",
          status: "warn",
          priority: "P2",
          evidence: "Spot-check lengths vs SERP previews using external tools — not enforced here.",
        },
      ],
    },
    {
      id: "content",
      module: "content",
      title: "Content & relevance",
      intro: "Alignment with intent and locale readiness.",
      items: [
        {
          id: "locale-coherence",
          label: "Locale coherence vs `/os/i18n` baseline",
          status: "warn",
          priority: "P1",
          evidence: "Cross-check hotspots before large indexable copy pushes.",
        },
        {
          id: "duplicate-risk",
          label: "Duplicate / thin content risk",
          status: "pending",
          priority: "P2",
          evidence: "Requires crawl overlap analysis — out of scope for static template.",
        },
      ],
    },
    {
      id: "interlinking",
      module: "interlinking",
      title: "Internal linking",
      intro: "Discovery paths and anchor quality.",
      items: [
        {
          id: "orphans",
          label: "Critical paths linked from hub pages",
          status: "pass",
          priority: "P2",
          evidence: "Template surfaces OS shortcuts to `/os/i18n`, `/os/excellence/golden-path`, branding policy.",
        },
        {
          id: "anchors",
          label: "Anchor text diversity",
          status: "pending",
          priority: "P3",
          evidence: "Qualitative review — track during content QA.",
        },
      ],
    },
    {
      id: "cwv",
      module: "cwv",
      title: "Core Web Vitals",
      intro: "Lab targets — validate with Lighthouse on representative URLs.",
      items: [
        {
          id: "lcp",
          label: "LCP under ~2.5s (lab)",
          status: "warn",
          priority: "P1",
          evidence: "Heavy hero/media routes should prioritize LCP assets; align with Web Premium image guidance.",
        },
        {
          id: "cls",
          label: "CLS under ~0.1",
          status: "pass",
          priority: "P1",
          evidence: "Static audit layout reserves dimensions for badges/cards — monitor dynamic shells separately.",
        },
        {
          id: "inp",
          label: "Input responsiveness (INP / legacy FID)",
          status: "warn",
          priority: "P2",
          evidence: "Defer non-critical scripts on marketing surfaces — measure in Lighthouse field/lab.",
        },
      ],
    },
    {
      id: "reporting",
      module: "reporting",
      title: "Reporting & structured data",
      intro: "Schema.org and stakeholder-ready summaries.",
      items: [
        {
          id: "schema-org",
          label: "Schema.org JSON-LD (Organization / Product)",
          status: "pending",
          priority: "P2",
          evidence: "Template does not inject JSON-LD yet — add when schema front opens.",
        },
        {
          id: "exec-summary",
          label: "Executive summary export",
          status: "warn",
          priority: "P3",
          evidence: "Use this view + checklist as handoff; PDF/export out of scope for v1.",
        },
      ],
    },
  ],
};
