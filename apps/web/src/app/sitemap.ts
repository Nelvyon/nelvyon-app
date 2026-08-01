import type { MetadataRoute } from "next";

import { getAppBaseUrl } from "@/lib/appUrl";
import { SERVICES } from "@/components/nelvyon-site/brand";
import { blog } from "@/lib/pa/source";

function baseUrl(): string {
  return getAppBaseUrl();
}

function abs(path: string): string {
  return new URL(path, `${baseUrl()}/`).toString();
}

const CORE_PATHS: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"] }> = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/plataforma", priority: 0.95, changeFrequency: "monthly" },
  { path: "/agencia", priority: 0.9, changeFrequency: "monthly" },
  { path: "/automatizaciones-ia", priority: 0.9, changeFrequency: "monthly" },
  { path: "/soluciones", priority: 0.9, changeFrequency: "monthly" },
  { path: "/servicios", priority: 0.95, changeFrequency: "monthly" },
  { path: "/sectores", priority: 0.85, changeFrequency: "monthly" },
  { path: "/enterprise", priority: 0.9, changeFrequency: "monthly" },
  { path: "/integraciones", priority: 0.85, changeFrequency: "monthly" },
  { path: "/precios", priority: 0.95, changeFrequency: "monthly" },
  { path: "/casos-de-exito", priority: 0.8, changeFrequency: "monthly" },
  { path: "/recursos", priority: 0.8, changeFrequency: "weekly" },
  { path: "/blog", priority: 0.75, changeFrequency: "weekly" },
  { path: "/faq", priority: 0.75, changeFrequency: "monthly" },
  { path: "/contacto", priority: 0.85, changeFrequency: "monthly" },
  { path: "/nosotros", priority: 0.8, changeFrequency: "monthly" },
  { path: "/saas", priority: 0.9, changeFrequency: "monthly" },
  { path: "/login", priority: 0.5, changeFrequency: "yearly" },
  { path: "/register", priority: 0.55, changeFrequency: "yearly" },
  { path: "/seguridad", priority: 0.7, changeFrequency: "monthly" },
  { path: "/status", priority: 0.65, changeFrequency: "daily" },
  { path: "/aviso-legal", priority: 0.35, changeFrequency: "yearly" },
  { path: "/privacidad", priority: 0.4, changeFrequency: "yearly" },
  { path: "/cookies", priority: 0.35, changeFrequency: "yearly" },
  { path: "/terminos", priority: 0.4, changeFrequency: "yearly" },
  { path: "/legal", priority: 0.4, changeFrequency: "yearly" },
  { path: "/legal/dpa", priority: 0.45, changeFrequency: "yearly" },
  { path: "/legal/subprocessors", priority: 0.45, changeFrequency: "yearly" },
  { path: "/partners", priority: 0.7, changeFrequency: "monthly" },
  { path: "/demo", priority: 0.7, changeFrequency: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const serviceUrls = SERVICES.map((s) => ({
    url: abs(s.href),
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const blogUrls = blog
    .getPages()
    .map((page) => page.slugs?.[0])
    .filter((slug): slug is string => Boolean(slug))
    .map((id) => ({
      url: abs(`/blog/${id}`),
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.65,
    }));

  return [
    ...CORE_PATHS.map((item) => ({
      url: abs(item.path),
      lastModified,
      changeFrequency: item.changeFrequency,
      priority: item.priority,
    })),
    ...serviceUrls,
    ...blogUrls,
  ];
}
