import { notFound } from "next/navigation";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import {
  ecommercePremiumDemoProductSlugs,
  ecommercePremiumNelvyonDemoStore,
  findEcommercePremiumProductBySlug,
} from "@/templates/ecommerce-premium/demo";
import { EcommercePremiumPDP } from "@/templates/ecommerce-premium/EcommercePremiumPDP";
import { EcommercePremiumStoreShell } from "@/templates/ecommerce-premium/EcommercePremiumStoreShell";
import { buildEcommercePremiumMetadata } from "@/templates/ecommerce-premium/seo";

export function generateStaticParams() {
  return ecommercePremiumDemoProductSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = findEcommercePremiumProductBySlug(slug);
  if (!product) {
    return { title: "Product not found" };
  }
  return buildEcommercePremiumMetadata(product.seo);
}

export default async function OsEcommercePremiumPdpPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = findEcommercePremiumProductBySlug(slug);
  if (!product) notFound();

  return (
    <ProtectedLayout module="os">
      <EcommercePremiumStoreShell store={ecommercePremiumNelvyonDemoStore}>
        <EcommercePremiumPDP product={product} store={ecommercePremiumNelvyonDemoStore} />
      </EcommercePremiumStoreShell>
    </ProtectedLayout>
  );
}
