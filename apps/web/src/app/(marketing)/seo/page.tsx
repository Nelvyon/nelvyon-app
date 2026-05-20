import type { Metadata } from "next";

import { SERVICE_PAGES } from "@/components/marketing/premium/constants";
import { ServicePageContent } from "@/components/marketing/premium/ServicePageContent";
import { getAppBaseUrl } from "@/lib/appUrl";

const service = SERVICE_PAGES.seo;
const base = getAppBaseUrl();

export const metadata: Metadata = {
  title: `${service.title} — NELVYON`,
  description: service.subtitle,
  openGraph: {
    url: `${base}${service.path}`,
    title: `${service.title} — NELVYON`,
    description: service.subtitle,
  },
};

export default function SeoPage() {
  return <ServicePageContent service={service} />;
}
