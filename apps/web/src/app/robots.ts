import type { MetadataRoute } from "next";

import { getAppBaseUrl } from "@/lib/appUrl";

function baseUrl(): string {
  return getAppBaseUrl();
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api", "/admin"],
    },
    sitemap: `${baseUrl()}/sitemap.xml`,
  };
}
