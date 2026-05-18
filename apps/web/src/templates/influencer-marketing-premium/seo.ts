import type { Metadata } from "next";

import type { InfluencerPremiumPageSeoConfig } from "@/templates/influencer-marketing-premium/types";

function resolveBaseUrl(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL;
  if (!raw) return undefined;
  if (raw.startsWith("http")) return raw.replace(/\/$/, "");
  return `https://${raw.replace(/\/$/, "")}`;
}

export function buildInfluencerPremiumMetadata(seo: InfluencerPremiumPageSeoConfig): Metadata {
  const base = resolveBaseUrl();
  const canonical =
    seo.canonicalPath && base ? `${base}${seo.canonicalPath.startsWith("/") ? seo.canonicalPath : `/${seo.canonicalPath}`}` : undefined;

  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title: seo.title,
      description: seo.description,
      siteName: seo.siteName ?? seo.title,
      type: "website",
      locale: seo.locale ?? "en_US",
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
  };
}
