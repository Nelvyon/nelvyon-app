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
      disallow: [
        "/dashboard",
        // `/saas/` con barra: bloquea la aplicacion autenticada (`/saas/crm`,
        // `/saas/inbox`...) sin bloquear `/saas`, que es la pagina publica de
        // producto y esta publicada en el sitemap. Sin la barra se contradecian.
        "/saas/",
        "/os",
        "/api",
        "/admin",
        "/portal",
        "/sign-in",
        "/sign-up",
        "/crm",
      ],
    },
    sitemap: `${baseUrl()}/sitemap.xml`,
  };
}
