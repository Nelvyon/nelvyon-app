import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ServiceDetailPage, getAgencyService } from "@/features/public-web";

type Props = { params: Promise<{ slug: string }> };

const ALLOWED = ["sem", "meta-ads", "google-ads", "diseno", "social-media", "ia", "consultoria"] as const;

export function generateStaticParams() {
  return ALLOWED.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const svc = getAgencyService(slug);
  if (!svc) return {};
  return {
    title: svc.seoTitle,
    description: svc.seoDescription,
    alternates: { canonical: svc.href },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  if (!ALLOWED.includes(slug as (typeof ALLOWED)[number]) || !getAgencyService(slug)) notFound();
  return <ServiceDetailPage slugOrHref={slug} />;
}
