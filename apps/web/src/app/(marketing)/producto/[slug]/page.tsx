import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ModuleDetailPage, getModule, saasModules } from "@/features/public-web";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return saasModules.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const mod = getModule(slug);
  if (!mod) return {};
  return {
    title: mod.seoTitle,
    description: mod.seoDescription,
    alternates: { canonical: `/producto/${mod.slug}` },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  if (!getModule(slug)) notFound();
  return <ModuleDetailPage slug={slug} />;
}
