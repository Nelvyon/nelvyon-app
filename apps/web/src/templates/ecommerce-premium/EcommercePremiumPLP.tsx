"use client";

import Image from "next/image";
import Link from "next/link";

import { NelvyonDsBadge, NelvyonDsCard } from "@/design-system/components";
import type { EcommercePremiumStoreConfig } from "@/templates/ecommerce-premium/types";
import { ECOMMERCE_PREMIUM_PREVIEW_BASE } from "@/templates/ecommerce-premium/paths";

const BADGE_TONES = ["primary", "success", "neutral"] as const;

interface Props {
  store: EcommercePremiumStoreConfig;
}

export function EcommercePremiumPLP({ store }: Props) {
  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-pretty text-page font-semibold tracking-tight text-foreground sm:text-page-md">Catalog</h1>
        <p className="max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
          Curated catalogue layout for conversion testing. Each tile routes to a PDP with product-scoped meta tags (Open Graph /
          Twitter) generated from demo configuration — no API calls.
        </p>
      </div>

      <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {store.products.map((product, index) => (
          <li key={product.slug}>
            <NelvyonDsCard as="div" className="h-full overflow-hidden p-0 shadow-card">
              <Link
                className="group flex h-full flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                href={`${ECOMMERCE_PREMIUM_PREVIEW_BASE}/p/${product.slug}`}
              >
                <div className="relative aspect-[4/3] overflow-hidden border-b border-border bg-muted">
                  <Image
                    alt={product.imageAlt}
                    className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    src={product.imageSrc}
                    loading="lazy"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <NelvyonDsBadge tone={BADGE_TONES[index % BADGE_TONES.length]}>{product.categoryBadge ?? "Essentials"}</NelvyonDsBadge>
                  <h2 className="text-lg font-semibold tracking-tight text-foreground group-hover:underline">{product.name}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">{product.shortDescription}</p>
                  <p className="mt-auto pt-2 text-base font-semibold text-foreground">{product.priceLabel}</p>
                  <span className="sr-only">View details</span>
                </div>
              </Link>
            </NelvyonDsCard>
          </li>
        ))}
      </ul>
    </div>
  );
}
