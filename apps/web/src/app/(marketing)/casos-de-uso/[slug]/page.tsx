import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { UseCaseDetailPage, getUseCase, useCasesCatalog } from "@/features/public-web";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return useCasesCatalog.map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const useCase = getUseCase(slug);
  if (!useCase) return {};
  return {
    title: { absolute: useCase.seoTitle },
    description: useCase.seoDescription,
    alternates: { canonical: `/casos-de-uso/${useCase.slug}` },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  if (!getUseCase(slug)) notFound();
  return <UseCaseDetailPage slug={slug} />;
}
