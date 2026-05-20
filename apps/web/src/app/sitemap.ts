import type { MetadataRoute } from "next";

import { getAppBaseUrl } from "@/lib/appUrl";

function baseUrl(): string {
  return getAppBaseUrl();
}

function abs(path: string): string {
  return new URL(path, `${baseUrl()}/`).toString();
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: abs("/"), lastModified, changeFrequency: "weekly", priority: 1.0 },
    { url: abs("/pricing"), lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: abs("/legal"), lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: abs("/legal/privacy"), lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: abs("/legal/terms"), lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: abs("/legal/refund-policy"), lastModified, changeFrequency: "yearly", priority: 0.2 },
    { url: abs("/legal/acceptable-use"), lastModified, changeFrequency: "yearly", priority: 0.2 },
    { url: abs("/legal/dpa"), lastModified, changeFrequency: "yearly", priority: 0.2 },
    { url: abs("/legal/ai-disclosure"), lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
