import type { WebPremiumSiteConfig } from "@/templates/web-premium/types";

/** Demo-only copy for OS preview; swap per client deployment without backend wiring. */
export const webPremiumNelvyonDemoConfig: WebPremiumSiteConfig = {
  seo: {
    title: "NELVYON OS — Web Premium template (preview)",
    description:
      "Premium marketing shell for client sites: hero, services, CTA, footer. Internal OS preview — not a production client domain.",
    canonicalPath: "/os/web-premium/preview",
    siteName: "NELVYON Web Premium",
    keywords: ["NELVYON", "marketing", "template"],
    locale: "en_US",
  },
  theme: {
    accentHex: "#0084fc",
  },
  hero: {
    eyebrow: "OS-delivered web · v2 (Design System)",
    heading: "Clarity, speed, and a premium first impression",
    subheading:
      "NELVYON Design System v1 applied: semantic surfaces, DS buttons, and checklist signals — configuration-only, no tenant API yet.",
    primaryCta: { label: "Explore services", href: "#services" },
    secondaryCta: { label: "Why this template", href: "#about" },
    heroImageSrc: "/web-premium/hero.svg",
    heroImageAlt: "Decorative abstract hero graphic",
  },
  about: {
    id: "about",
    heading: "Built for repeatable delivery",
    body: [
      "Sections are composable and copy-driven so OS can ship consistent quality without one-off pages.",
      "Mobile-first spacing, accessible landmarks, and minimal client JavaScript keep the surface fast and stable.",
    ],
  },
  services: {
    id: "services",
    heading: "What we surface for every client",
    intro: "Three slots you can remap per industry; defaults show structure only.",
    items: [
      {
        title: "Guided onboarding story",
        badge: "Story",
        description: "Hero and about blocks establish trust before any product depth.",
      },
      {
        title: "Offerings grid",
        badge: "Surface",
        description: "Cards stay lightweight — swap text, optionally add imagery per client tier.",
      },
      {
        title: "Decision CTA",
        badge: "Funnel",
        description: "Single primary action aligned to your funnel; tracked separately when analytics front opens.",
      },
    ],
  },
  cta: {
    id: "contact",
    heading: "Ready to wire your client brand?",
    body: "This preview uses static configuration. Promotion to a client domain stays behind an explicit OS front.",
    cta: { label: "Back to Operations", href: "/os" },
  },
  footer: {
    orgName: "NELVYON Operations",
    finePrint:
      "Template © NELVYON OS — Premium Web v2 (Design System). Not connected to tenant backends in this iteration.",
    links: [
      { label: "Top", href: "#top" },
      { label: "Services", href: "#services" },
      { label: "About", href: "#about" },
    ],
  },
};
