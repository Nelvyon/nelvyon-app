import type { MetadataRoute } from "next";

function baseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return raw && raw.length > 0 ? raw.replace(/\/$/, "") : "https://nelvyon.com";
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
