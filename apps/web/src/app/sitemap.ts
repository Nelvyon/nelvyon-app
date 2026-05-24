import type { MetadataRoute } from "next";

import { getAppBaseUrl } from "@/lib/appUrl";
import { SERVICES } from "@/components/nelvyon-site/brand";

function baseUrl(): string {
  return getAppBaseUrl();
}

function abs(path: string): string {
  return new URL(path, `${baseUrl()}/`).toString();
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const serviceUrls = SERVICES.map((s) => ({
    url: abs(s.href),
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }));

  return [
    { url: abs("/"), lastModified, changeFrequency: "weekly", priority: 1.0 },
    { url: abs("/servicios"), lastModified, changeFrequency: "monthly", priority: 0.95 },
    { url: abs("/precios"), lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: abs("/pricing"), lastModified, changeFrequency: "monthly", priority: 0.85 },
    { url: abs("/sobre-nosotros"), lastModified, changeFrequency: "monthly", priority: 0.75 },
    { url: abs("/contacto"), lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: abs("/login"), lastModified, changeFrequency: "yearly", priority: 0.5 },
    { url: abs("/register"), lastModified, changeFrequency: "yearly", priority: 0.6 },
    { url: abs("/privacidad"), lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: abs("/cookies"), lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: abs("/terminos"), lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: abs("/legal"), lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: abs("/legal/privacy"), lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: abs("/legal/terms"), lastModified, changeFrequency: "yearly", priority: 0.3 },
    ...serviceUrls,
  ];
}
