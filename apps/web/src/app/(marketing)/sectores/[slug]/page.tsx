import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SectorDetailPage, getSector, sectorsCatalog } from "@/features/public-web";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return sectorsCatalog.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sector = getSector(slug);
  if (!sector) return {};
  return {
    title: sector.seoTitle,
    description: sector.seoDescription,
    alternates: { canonical: `/sectores/${sector.slug}` },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  if (!getSector(slug)) notFound();
  return <SectorDetailPage slug={slug} />;
}
