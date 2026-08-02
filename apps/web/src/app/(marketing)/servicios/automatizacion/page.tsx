import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ServiceDetailPage, getAgencyService } from "@/features/public-web";

const SLUG = "automatizacion";

export async function generateMetadata(): Promise<Metadata> {
  const svc = getAgencyService(SLUG);
  if (!svc) return {};
  return {
    title: { absolute: svc.seoTitle },
    description: svc.seoDescription,
    alternates: { canonical: svc.href },
  };
}

export default function AutomatizacionMarketingPage() {
  if (!getAgencyService(SLUG)) notFound();
  return <ServiceDetailPage slugOrHref={SLUG} />;
}
