import type { Metadata } from "next";

import { SERVICE_DETAILS } from "@/components/nelvyon-site/service-details";
import { NelvyonServicioDetailPage } from "@/components/nelvyon-site/NelvyonServicioDetailPage";

export function generateStaticParams() {
  return Object.keys(SERVICE_DETAILS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const detail = SERVICE_DETAILS[slug as keyof typeof SERVICE_DETAILS];
  if (!detail) return { title: "Servicio — NELVYON" };
  return {
    title: `${detail.title} — NELVYON`,
    description: detail.subtitle,
  };
}

export default async function ServicioSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <NelvyonServicioDetailPage slug={slug} />;
}
