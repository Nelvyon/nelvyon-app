import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Outfit } from "next/font/google";
import localFont from "next/font/local";

import { MarketingChrome } from "@/components/marketing/MarketingChrome";
import { getAppBaseUrl } from "@/lib/appUrl";
import { siteBrand } from "@/features/public-web";

import "@/features/public-web/styles/public-web.css";

// Manrope autoalojada: sus ficheros del subconjunto latin devolvian 404 desde
// Google y tumbaban el build. Ver `src/fonts/README.md`.
const sans = localFont({
  src: "../../fonts/manrope-latin-variable.woff2",
  weight: "200 800",
  style: "normal",
  variable: "--font-nv-sans",
  display: "swap",
});

const display = Outfit({
  subsets: ["latin"],
  variable: "--font-nv-display",
  display: "swap",
});

const canonicalBase = getAppBaseUrl();
const ogImageAbs = `${canonicalBase}/opengraph-image`;

const NV_SKIN = "/brand/public/nv/css";

export const metadata: Metadata = {
  title: {
    default: `${siteBrand.name} — Agencia IA + SaaS B2B`,
    template: `%s | ${siteBrand.name}`,
  },
  description: siteBrand.description,
  metadataBase: new URL(canonicalBase),
  openGraph: {
    title: `${siteBrand.name} — Agencia IA + SaaS B2B`,
    description: siteBrand.tagline,
    url: canonicalBase,
    siteName: siteBrand.name,
    images: [
      {
        url: ogImageAbs,
        width: 1200,
        height: 630,
        alt: siteBrand.name,
      },
    ],
    type: "website",
    locale: "es_ES",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteBrand.name} — Agencia IA + SaaS B2B`,
    description: siteBrand.tagline,
    images: [ogImageAbs],
    creator: "@nelvyon",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function MarketingRouteLayout({ children }: { children: ReactNode }) {
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteBrand.name,
    url: canonicalBase,
    logo: `${canonicalBase}/logo.svg`,
    description: siteBrand.description,
    email: siteBrand.contactEmail,
    sameAs: ["https://twitter.com/nelvyon"],
  };
  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteBrand.name,
    url: canonicalBase,
    potentialAction: {
      "@type": "SearchAction",
      target: `${canonicalBase}/blog?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <section lang="es" className={`${sans.variable} ${display.variable}`}>
      {/* NELVYON public skin (bootstrap grid + brand overrides; no Font Awesome / Swiper) */}
      <link rel="stylesheet" href={`${NV_SKIN}/bootstrap.min.css`} />
      <link rel="stylesheet" href={`${NV_SKIN}/style.css`} />
      <link rel="stylesheet" href={`${NV_SKIN}/nelvyon-skin.css`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }} />
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-[var(--nv-accent)] focus:px-4 focus:py-2 focus:text-white"
      >
        Saltar al contenido
      </a>
      <MarketingChrome>{children}</MarketingChrome>
    </section>
  );
}
