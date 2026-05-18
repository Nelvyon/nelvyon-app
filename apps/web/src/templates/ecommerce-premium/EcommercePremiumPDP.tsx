"use client";

import Image from "next/image";
import Link from "next/link";

import { NelvyonDsButton, NelvyonDsSectionHeader } from "@/design-system/components";
import type { EcommercePremiumProduct, EcommercePremiumStoreConfig } from "@/templates/ecommerce-premium/types";
import { ECOMMERCE_PREMIUM_PREVIEW_BASE } from "@/templates/ecommerce-premium/paths";

interface Props {
  store: EcommercePremiumStoreConfig;
  product: EcommercePremiumProduct;
}

export function EcommercePremiumPDP({ store, product }: Props) {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
      <div className="space-y-4">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <li>
              <Link
                className="text-link underline-offset-4 hover:text-link-hover hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                href={ECOMMERCE_PREMIUM_PREVIEW_BASE}
              >
                Catalog
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="font-medium text-foreground">
              {product.name}
            </li>
          </ol>
        </nav>
        <div className="relative aspect-square max-h-[480px] overflow-hidden rounded-xl border border-border bg-muted shadow-card lg:sticky lg:top-6">
          <Image alt={product.imageAlt} className="object-cover" fill priority sizes="(max-width: 1024px) 100vw, 540px" src={product.imageSrc} />
        </div>
      </div>

      <div className="space-y-6">
        <NelvyonDsSectionHeader className="border-0 pb-2" title={product.name} />
        <p className="text-2xl font-semibold tracking-tight text-foreground">{product.priceLabel}</p>
        <div className="space-y-3 text-[14px] leading-relaxed text-muted-foreground">
          {product.description.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 border-t border-border pt-6">
          <NelvyonDsButton asChild size="lg" variant="primary">
            <Link href={`${ECOMMERCE_PREMIUM_PREVIEW_BASE}/checkout`} style={{ backgroundColor: store.theme.accentHex }}>
              Proceed to checkout
            </Link>
          </NelvyonDsButton>
          <NelvyonDsButton asChild size="lg" variant="ghost">
            <Link href={ECOMMERCE_PREMIUM_PREVIEW_BASE}>Continue shopping</Link>
          </NelvyonDsButton>
        </div>
      </div>
    </div>
  );
}
