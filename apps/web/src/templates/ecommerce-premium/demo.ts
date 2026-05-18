import type { EcommercePremiumProduct, EcommercePremiumStoreConfig } from "@/templates/ecommerce-premium/types";
import { ECOMMERCE_PREMIUM_PREVIEW_BASE } from "@/templates/ecommerce-premium/paths";

const sharedProductImage = "/web-premium/hero.svg";

/** Demo-only catalogue; swap per deployment without APIs. */
export const ecommercePremiumNelvyonDemoStore: EcommercePremiumStoreConfig = {
  seo: {
    title: "NELVYON OS — E‑commerce Premium template (catalog)",
    description:
      "Premium storefront shell v2 (Design System): PLP, PDP, checkout layout. Internal OS preview — configuration only, no payments or tenant APIs.",
    canonicalPath: `${ECOMMERCE_PREMIUM_PREVIEW_BASE}`,
    siteName: "NELVYON E‑commerce Premium",
    keywords: ["NELVYON", "storefront", "template"],
    locale: "en_US",
  },
  theme: {
    accentHex: "#0f766e",
  },
  storeName: "Atelier Meridian",
  tagline: "Confidence-first essentials — demo catalogue",
  trustNote: "Secure checkout UX patterns — demo only; no processor wired.",
  products: [
    {
      slug: "classic-tote",
      name: "Classic tote",
      shortDescription: "Structured carry with reinforced seams.",
      description: [
        "Designed for daily carry without visual noise. Neutral palette fits premium white-label programs.",
        "Specifications are illustrative for this template phase — inventory and fulfilment are out of scope.",
      ],
      priceLabel: "$128",
      imageSrc: sharedProductImage,
      imageAlt: "Product illustration — classic tote placeholder",
      seo: {
        title: "Classic tote · Atelier Meridian (OS template)",
        description: "Premium tote — demo product detail for NELVYON ecommerce template.",
        canonicalPath: `${ECOMMERCE_PREMIUM_PREVIEW_BASE}/p/classic-tote`,
        siteName: "NELVYON E‑commerce Premium",
      },
    },
    {
      slug: "wireless-kit",
      name: "Wireless desk kit",
      categoryBadge: "Desk",
      shortDescription: "Minimal charging + audio bundle.",
      description: [
        "Curated bundle layout for PDP trust blocks: bullets, reassurance, secondary CTA pattern.",
        "No SKU sync or carts backed by database in this template.",
      ],
      priceLabel: "$249",
      imageSrc: sharedProductImage,
      imageAlt: "Product illustration — desk kit placeholder",
      seo: {
        title: "Wireless desk kit · Atelier Meridian (OS template)",
        description: "Desk kit bundle — demo PDP for ecommerce premium shell.",
        canonicalPath: `${ECOMMERCE_PREMIUM_PREVIEW_BASE}/p/wireless-kit`,
        siteName: "NELVYON E‑commerce Premium",
      },
    },
    {
      slug: "annual-care",
      name: "Annual care plan",
      categoryBadge: "Care",
      shortDescription: "Extended support framing for subscription-style offers.",
      description: [
        "Use this card to rehearse periodic offers without opening billing integrations.",
        "Checkout below is decorative — operators complete golden path separately.",
      ],
      priceLabel: "$360 / yr",
      imageSrc: sharedProductImage,
      imageAlt: "Product illustration — care plan placeholder",
      seo: {
        title: "Annual care plan · Atelier Meridian (OS template)",
        description: "Care plan — demo product for PDP metadata and OG patterns.",
        canonicalPath: `${ECOMMERCE_PREMIUM_PREVIEW_BASE}/p/annual-care`,
        siteName: "NELVYON E‑commerce Premium",
      },
    },
  ],
  checkout: {
    heading: "Checkout (demo)",
    summaryIntro:
      "Order summary mirrors a real funnel without capturing payment instruments. Operators still run `pnpm gate` before any production cutover.",
    demoOrderNote:
      "Place order is intentionally inert — no PSP, webhook, or inventory mutation in template v2 (Design System).",
    seo: {
      title: "Checkout (demo) · Atelier Meridian (OS template)",
      description: "Demo checkout funnel — configuration only for NELVYON ecommerce premium template.",
      canonicalPath: `${ECOMMERCE_PREMIUM_PREVIEW_BASE}/checkout`,
      siteName: "NELVYON E‑commerce Premium",
    },
  },
  footer: {
    orgLabel: "NELVYON Operations",
    finePrint:
      "E‑commerce Premium OS template v2 (Design System) — not connected to tenant commerce APIs. Respect governance: `/app/branding/policy`, `/os/tenants/activation`, `/os/global/*` when scaling.",
    links: [
      { label: "Catalog", href: ECOMMERCE_PREMIUM_PREVIEW_BASE },
      { label: "Checkout", href: `${ECOMMERCE_PREMIUM_PREVIEW_BASE}/checkout` },
      { label: "Delivery checklist", href: `${ECOMMERCE_PREMIUM_PREVIEW_BASE}#delivery-qa` },
      { label: "Operations", href: "/os" },
    ],
  },
};

export function findEcommercePremiumProductBySlug(slug: string): EcommercePremiumProduct | undefined {
  return ecommercePremiumNelvyonDemoStore.products.find((p) => p.slug === slug);
}

export function ecommercePremiumDemoProductSlugs(): string[] {
  return ecommercePremiumNelvyonDemoStore.products.map((p) => p.slug);
}
